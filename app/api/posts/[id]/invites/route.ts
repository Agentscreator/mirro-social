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
    console.log("=== INVITE REQUEST API START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const postId = parseInt(params.id)
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    console.log("Processing invite request for post:", postId, "by user:", session.user.id)

    // First check if this is the user's own post
    const postOwnerCheck = await db
      .select({
        userId: postsTable.userId,
      })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (postOwnerCheck.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Prevent users from inviting themselves to their own posts
    if (postOwnerCheck[0].userId === session.user.id) {
      return NextResponse.json({ error: "You cannot send an invite request to your own post" }, { status: 400 })
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
          participantLimit: 999999, // Effectively unlimited
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

    if (settings.inviteMode === "auto") {
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

      console.log("✅ Auto-accepted invite, participant count updated")
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

    console.log("✅ Invite request created:", newRequest[0])

    // Create notification for manual requests (pending status)
    if (initialStatus === "pending") {
      try {
        console.log("🔔 Creating notification for pending invite request")
        console.log("Post author ID:", post[0].userId)
        console.log("Requester ID:", session.user.id)
        
        const requesterInfo = await db
          .select({
            username: usersTable.username,
            nickname: usersTable.nickname,
          })
          .from(usersTable)
          .where(eq(usersTable.id, session.user.id))
          .limit(1)

        const displayName = requesterInfo[0]?.nickname || requesterInfo[0]?.username || "Someone"
        console.log("Requester display name:", displayName)
        
        const notification = await db.insert(notificationsTable).values({
          userId: post[0].userId, // Post author receives the notification
          fromUserId: session.user.id, // User who requested the invite
          type: "invite_request",
          title: "New Invite Request",
          message: `${displayName} wants to join your activity invite!`,
          data: JSON.stringify({
            postId: postId,
            inviteRequestId: newRequest[0].id,
          }),
          actionUrl: `/posts/${postId}`,
        }).returning()
        
        console.log("✅ Manual invite request notification created:", notification[0])
        
        // Verify the notification was saved
        const verifyNotification = await db
          .select()
          .from(notificationsTable)
          .where(eq(notificationsTable.id, notification[0].id))
          .limit(1)
        
        if (verifyNotification.length > 0) {
          console.log("✅ Notification verified in database:", verifyNotification[0])
        } else {
          console.error("❌ Notification not found after creation")
        }
        
      } catch (notificationError) {
        console.error("❌ Failed to create invite request notification:", notificationError)
        console.error("Notification error stack:", notificationError instanceof Error ? notificationError.stack : "No stack")
        // Don't fail the entire operation
      }
    }

    // Create notification for auto-accepted requests
    if (initialStatus === "accepted") {
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
        
        const notification = await db.insert(notificationsTable).values({
          userId: post[0].userId, // Post author receives the notification
          fromUserId: session.user.id, // User who requested the invite
          type: "invite_accepted",
          title: "Invite Request Auto-Accepted",
          message: `${displayName} has joined your activity invite!`,
          data: JSON.stringify({
            postId: postId,
            inviteRequestId: newRequest[0].id,
          }),
          actionUrl: `/posts/${postId}`,
        }).returning()
        
        console.log("✅ Auto-acceptance notification created:", notification[0])
      } catch (notificationError) {
        console.error("❌ Failed to create auto-acceptance notification:", notificationError)
        // Don't fail the entire operation
      }
    }

    // Handle auto-group creation if the post has auto-accept enabled
    if (initialStatus === "accepted") {
      try {
        // Get the post details to check for auto-group settings
        const postDetails = await db
          .select({
            autoAcceptInvites: postsTable.autoAcceptInvites,
            groupName: postsTable.groupName,
          })
          .from(postsTable)
          .where(eq(postsTable.id, postId))
          .limit(1)

        if (postDetails[0]?.autoAcceptInvites && postDetails[0]?.groupName) {
          console.log("🔄 Creating auto-group for accepted invite")
          
          // Get all accepted members for this post
          const acceptedMembers = await db
            .select({
              userId: inviteRequestsTable.userId,
            })
            .from(inviteRequestsTable)
            .where(
              and(
                eq(inviteRequestsTable.postId, postId),
                eq(inviteRequestsTable.status, "accepted")
              )
            )

          const memberIds = acceptedMembers.map(m => m.userId)
          
          // Only create group if we have multiple members
          if (memberIds.length >= 1) {
            try {
              // Use internal API call for group creation
              const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
              const groupResponse = await fetch(`${baseUrl}/api/stream/channels`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  postId,
                  groupName: postDetails[0].groupName,
                  memberIds,
                }),
              })

              if (groupResponse.ok) {
                const groupData = await groupResponse.json()
                console.log("✅ Auto-group created successfully:", groupData)
              } else {
                const errorText = await groupResponse.text()
                console.error("❌ Failed to create auto-group:", errorText)
              }
            } catch (groupError) {
              console.error("❌ Error creating auto-group:", groupError)
            }
          }
        }
      } catch (autoGroupError) {
        console.error("❌ Auto-group creation error:", autoGroupError)
        // Don't fail the entire operation
      }
    }

    console.log("=== INVITE REQUEST API END ===")
    return NextResponse.json({ 
      request: newRequest[0],
      autoAccepted: initialStatus === "accepted"
    })
  } catch (error) {
    console.error("Error sending invite request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}