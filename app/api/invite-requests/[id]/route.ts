import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  inviteRequestsTable, 
  postInvitesTable, 
  postsTable, 
  usersTable,
  notificationsTable 
} from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// PUT - Accept or deny an invite request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("=== INVITE REQUEST RESPONSE API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestId = parseInt(params.id)
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    const body = await request.json()
    const { action } = body // "accept" or "deny"

    if (!["accept", "deny"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'accept' or 'deny'" }, { status: 400 })
    }

    console.log(`Processing ${action} for request ID:`, requestId)

    // Get the invite request with post information
    const inviteRequest = await db
      .select({
        id: inviteRequestsTable.id,
        postId: inviteRequestsTable.postId,
        inviteId: inviteRequestsTable.inviteId,
        userId: inviteRequestsTable.userId,
        status: inviteRequestsTable.status,
        postAuthorId: postsTable.userId,
      })
      .from(inviteRequestsTable)
      .leftJoin(postsTable, eq(inviteRequestsTable.postId, postsTable.id))
      .where(eq(inviteRequestsTable.id, requestId))
      .limit(1)

    if (inviteRequest.length === 0) {
      return NextResponse.json({ error: "Invite request not found" }, { status: 404 })
    }

    const request_data = inviteRequest[0]

    // Verify the current user is the post author
    if (request_data.postAuthorId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to respond to this request" }, { status: 403 })
    }

    if (request_data.status !== "pending") {
      return NextResponse.json({ error: "Request has already been responded to" }, { status: 400 })
    }

    let updatedInvite = null

    if (action === "accept") {
      // Check if there's space in the invite
      const inviteInfo = await db
        .select({
          id: postInvitesTable.id,
          participantLimit: postInvitesTable.participantLimit,
          currentParticipants: postInvitesTable.currentParticipants,
        })
        .from(postInvitesTable)
        .where(eq(postInvitesTable.id, request_data.inviteId))
        .limit(1)

      if (inviteInfo.length === 0) {
        return NextResponse.json({ error: "Invite not found" }, { status: 404 })
      }

      const invite = inviteInfo[0]

      // Removed participant limit check to allow unlimited participants

      // Update participant count
      updatedInvite = await db
        .update(postInvitesTable)
        .set({
          currentParticipants: invite.currentParticipants + 1,
          updatedAt: new Date(),
        })
        .where(eq(postInvitesTable.id, invite.id))
        .returning()
    }

    // Update the request status
    const updatedRequest = await db
      .update(inviteRequestsTable)
      .set({
        status: action === "accept" ? "accepted" : "denied",
        respondedAt: new Date(),
      })
      .where(eq(inviteRequestsTable.id, requestId))
      .returning()

    // Create notification for the requester
    if (action === "accept") {
      try {
        const requesterInfo = await db
          .select({
            username: usersTable.username,
            nickname: usersTable.nickname,
          })
          .from(usersTable)
          .where(eq(usersTable.id, request_data.userId))
          .limit(1)

        const authorInfo = await db
          .select({
            username: usersTable.username,
            nickname: usersTable.nickname,
          })
          .from(usersTable)
          .where(eq(usersTable.id, session.user.id))
          .limit(1)

        const authorName = authorInfo[0]?.nickname || authorInfo[0]?.username || "Someone"
        
        await db.insert(notificationsTable).values({
          userId: request_data.userId, // The person who requested the invite
          fromUserId: session.user.id, // The post author who accepted
          type: "invite_request_accepted",
          title: "Invite Request Accepted!",
          message: `${authorName} accepted your request to join their activity!`,
          data: JSON.stringify({
            postId: request_data.postId,
            inviteRequestId: requestId,
          }),
        })
        
        console.log("✅ Manual acceptance notification created")
      } catch (notificationError) {
        console.error("❌ Failed to create manual acceptance notification:", notificationError)
        // Don't fail the entire operation
      }
    }

    console.log(`✅ Invite request ${action}ed successfully`)

    return NextResponse.json({
      message: `Request ${action}ed successfully`,
      request: updatedRequest[0],
      invite: updatedInvite?.[0] || null,
    })
  } catch (error) {
    console.error("❌ INVITE REQUEST RESPONSE API ERROR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}