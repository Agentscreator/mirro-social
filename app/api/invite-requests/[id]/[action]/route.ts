import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { inviteRequestsTable, postInvitesTable, notificationsTable, usersTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, action } = await params
    const requestId = parseInt(id)
    
    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    if (!['accept', 'deny'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log(`=== ${action.toUpperCase()} INVITE REQUEST ===`)
    console.log("Request ID:", requestId)
    console.log("User ID:", session.user.id)

    // Get the invite request
    const inviteRequest = await db
      .select({
        id: inviteRequestsTable.id,
        postId: inviteRequestsTable.postId,
        inviteId: inviteRequestsTable.inviteId,
        userId: inviteRequestsTable.userId,
        status: inviteRequestsTable.status,
      })
      .from(inviteRequestsTable)
      .where(eq(inviteRequestsTable.id, requestId))
      .limit(1)

    if (inviteRequest.length === 0) {
      return NextResponse.json({ error: "Invite request not found" }, { status: 404 })
    }

    const request_data = inviteRequest[0]

    // Verify the user has permission to respond to this request
    // (This should be the post owner, but let's verify)
    const invite = await db
      .select({
        id: postInvitesTable.id,
        postId: postInvitesTable.postId,
        participantLimit: postInvitesTable.participantLimit,
        currentParticipants: postInvitesTable.currentParticipants,
      })
      .from(postInvitesTable)
      .where(eq(postInvitesTable.id, request_data.inviteId))
      .limit(1)

    if (invite.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    // Check if request is already processed
    if (request_data.status !== 'pending') {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 })
    }

    const newStatus = action === 'accept' ? 'accepted' : 'denied'
    
    // Update the request status
    await db
      .update(inviteRequestsTable)
      .set({
        status: newStatus,
        respondedAt: new Date(),
      })
      .where(eq(inviteRequestsTable.id, requestId))

    console.log(`✅ Request ${newStatus}`)

    // If accepted, update participant count
    if (action === 'accept') {
      await db
        .update(postInvitesTable)
        .set({
          currentParticipants: invite[0].currentParticipants + 1,
          updatedAt: new Date(),
        })
        .where(eq(postInvitesTable.id, request_data.inviteId))

      console.log("✅ Participant count updated")
    }

    // Create notification for the requester
    try {
      const requesterInfo = await db
        .select({
          username: usersTable.username,
          nickname: usersTable.nickname,
        })
        .from(usersTable)
        .where(eq(usersTable.id, session.user.id))
        .limit(1)

      const responderName = requesterInfo[0]?.nickname || requesterInfo[0]?.username || "Someone"
      
      const notificationTitle = action === 'accept' ? "Invite Request Accepted!" : "Invite Request Denied"
      const notificationMessage = action === 'accept' 
        ? `${responderName} accepted your request to join their activity!`
        : `${responderName} denied your request to join their activity.`

      await db.insert(notificationsTable).values({
        userId: request_data.userId, // The person who made the request
        fromUserId: session.user.id, // The person who responded
        type: action === 'accept' ? 'invite_accepted' : 'invite_denied',
        title: notificationTitle,
        message: notificationMessage,
        data: JSON.stringify({
          postId: request_data.postId,
          inviteRequestId: requestId,
        }),
      })

      console.log("✅ Response notification created")
    } catch (notificationError) {
      console.error("❌ Failed to create response notification:", notificationError)
      // Don't fail the entire operation
    }

    return NextResponse.json({
      success: true,
      message: `Invite request ${newStatus}`,
      status: newStatus,
    })
  } catch (error) {
    console.error(`Error ${action}ing invite request:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}