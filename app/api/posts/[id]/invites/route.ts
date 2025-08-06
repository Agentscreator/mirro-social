import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postInvitesTable, inviteRequestsTable, usersTable, userSettingsTable, postsTable, notificationsTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// GET - Get invite status for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const postId = parseInt(params.id)
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    // Get invite info for the post
    const inviteInfo = await db
      .select({
        id: postInvitesTable.id,
        participantLimit: postInvitesTable.participantLimit,
        currentParticipants: postInvitesTable.currentParticipants,
      })
      .from(postInvitesTable)
      .where(eq(postInvitesTable.postId, postId))
      .limit(1)

    if (inviteInfo.length === 0) {
      return NextResponse.json({ error: "No invite found for this post" }, { status: 404 })
    }

    // Check user's request status
    const userRequest = await db
      .select({
        id: inviteRequestsTable.id,
        status: inviteRequestsTable.status,
        requestedAt: inviteRequestsTable.requestedAt,
        respondedAt: inviteRequestsTable.respondedAt,
      })
      .from(inviteRequestsTable)
      .where(
        and(
          eq(inviteRequestsTable.inviteId, inviteInfo[0].id),
          eq(inviteRequestsTable.userId, session.user.id)
        )
      )
      .limit(1)

    // Get post author's settings
    const post = await db
      .select({
        userId: postsTable.userId,
      })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const authorSettings = await db
      .select({
        inviteMode: userSettingsTable.inviteMode,
        autoAcceptLimit: userSettingsTable.autoAcceptLimit,
      })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, post[0].userId))
      .limit(1)

    return NextResponse.json({
      invite: inviteInfo[0],
      userRequest: userRequest[0] || null,
      authorSettings: authorSettings[0] || { inviteMode: "manual", autoAcceptLimit: 10 },
    })
  } catch (error) {
    console.error("Error fetching invite status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Send invite request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const postId = parseInt(params.id)
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    // Get or create invite for the post
    let inviteInfo = await db
      .select({
        id: postInvitesTable.id,
        participantLimit: postInvitesTable.participantLimit,
        currentParticipants: postInvitesTable.currentParticipants,
      })
      .from(postInvitesTable)
      .where(eq(postInvitesTable.postId, postId))
      .limit(1)

    if (inviteInfo.length === 0) {
      // Create invite if it doesn't exist
      const newInvite = await db
        .insert(postInvitesTable)
        .values({
          postId,
          participantLimit: 10, // Default limit
          currentParticipants: 0,
        })
        .returning()

      inviteInfo = newInvite
    }

    const invite = inviteInfo[0]

    // Check if user already has a request
    const existingRequest = await db
      .select()
      .from(inviteRequestsTable)
      .where(
        and(
          eq(inviteRequestsTable.inviteId, invite.id),
          eq(inviteRequestsTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingRequest.length > 0) {
      return NextResponse.json({ error: "Request already sent" }, { status: 400 })
    }

    // Get post author's settings
    const post = await db
      .select({
        userId: postsTable.userId,
      })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const authorSettings = await db
      .select({
        inviteMode: userSettingsTable.inviteMode,
        autoAcceptLimit: userSettingsTable.autoAcceptLimit,
      })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, post[0].userId))
      .limit(1)

    const settings = authorSettings[0] || { inviteMode: "manual", autoAcceptLimit: 10 }

    // Determine initial status based on author's settings
    let initialStatus = "pending"
    let respondedAt = null

    if (settings.inviteMode === "auto" && invite.currentParticipants < invite.participantLimit) {
      initialStatus = "accepted"
      respondedAt = new Date()
      
      // Update participant count
      await db
        .update(postInvitesTable)
        .set({
          currentParticipants: invite.currentParticipants + 1,
          updatedAt: new Date(),
        })
        .where(eq(postInvitesTable.id, invite.id))

      // Create notification for the post author
      try {
        const requesterInfo = await db
          .select({
            username: usersTable.username,
            nickname: usersTable.nickname,
          })
          .from(usersTable)
          .where(eq(usersTable.id, session.user.id))
          .limit(1)

        const displayName = requesterInfo[0]?.nickname || requesterInfo[0]?.username || "Someone"
        
        await db.insert(notificationsTable).values({
          userId: post[0].userId, // Post author receives the notification
          fromUserId: session.user.id, // User who requested the invite
          type: "invite_accepted",
          title: "Invite Request Accepted",
          message: `${displayName} has joined your activity invite!`,
          postId: postId,
          inviteRequestId: null, // Will be set after request is created
        })
        
        console.log("✅ Auto-acceptance notification created")
      } catch (notificationError) {
        console.error("❌ Failed to create auto-acceptance notification:", notificationError)
        // Don't fail the entire operation
      }
    }

    // Create the request
    const newRequest = await db
      .insert(inviteRequestsTable)
      .values({
        postId,
        inviteId: invite.id,
        userId: session.user.id,
        status: initialStatus,
        respondedAt,
      })
      .returning()

    return NextResponse.json({ 
      request: newRequest[0],
      autoAccepted: initialStatus === "accepted"
    })
  } catch (error) {
    console.error("Error sending invite request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}