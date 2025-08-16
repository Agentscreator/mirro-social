import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  postsTable, 
  postInvitesTable, 
  inviteRequestsTable, 
  postInviteParticipantsTable,
  groupsTable,
  groupMembersTable,
  notificationsTable,
  usersTable
} from "@/src/db/schema"
import { eq, and, count } from "drizzle-orm"

// POST - Request to join an invite
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

    // Get the post and its invite details
    const postWithInvite = await db
      .select({
        post: postsTable,
        invite: postInvitesTable,
      })
      .from(postsTable)
      .leftJoin(postInvitesTable, eq(postInvitesTable.postId, postsTable.id))
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (postWithInvite.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const { post, invite } = postWithInvite[0]

    if (!invite) {
      return NextResponse.json({ error: "This post doesn't have invites enabled" }, { status: 400 })
    }

    // Check if user is the post owner
    if (post.userId === session.user.id) {
      return NextResponse.json({ error: "You cannot request to join your own invite" }, { status: 400 })
    }

    // Check if user already has a pending or accepted request
    const existingRequest = await db
      .select()
      .from(inviteRequestsTable)
      .where(
        and(
          eq(inviteRequestsTable.postId, postId),
          eq(inviteRequestsTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingRequest.length > 0) {
      const status = existingRequest[0].status
      if (status === "accepted") {
        return NextResponse.json({ error: "You have already joined this invite" }, { status: 400 })
      }
      // Allow re-joining for pending or denied requests by deleting old request
      if (status === "pending" || status === "denied") {
        await db
          .delete(inviteRequestsTable)
          .where(eq(inviteRequestsTable.id, existingRequest[0].id))
      }
    }

    // Check if invite is full (removed limit check to allow unlimited participants)

    // Always auto-accept for communities
    if (true) {
      // Auto-accept the request
      const newRequest = await db
        .insert(inviteRequestsTable)
        .values({
          postId,
          inviteId: invite.id,
          userId: session.user.id,
          status: "accepted",
          requestedAt: new Date(),
          respondedAt: new Date(),
        })
        .returning()

      // Add to participants
      await db
        .insert(postInviteParticipantsTable)
        .values({
          inviteId: invite.id,
          userId: session.user.id,
        })

      // Update participant count
      await db
        .update(postInvitesTable)
        .set({
          currentParticipants: invite.currentParticipants + 1,
        })
        .where(eq(postInvitesTable.id, invite.id))

      // Find or create community if communityName exists
      if (post.communityName) {
        let group = await db
          .select()
          .from(groupsTable)
          .where(eq(groupsTable.postId, postId))
          .limit(1)

        if (group.length === 0) {
          // Create the group
          const newGroup = await db
            .insert(groupsTable)
            .values({
              name: post.communityName,
              description: `Community for: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`,
              createdBy: post.userId,
              postId: postId,
              maxMembers: invite.participantLimit,
              isActive: 1,
            })
            .returning()

          // Add post owner as admin
          await db
            .insert(groupMembersTable)
            .values({
              groupId: newGroup[0].id,
              userId: post.userId,
              role: "admin",
            })

          group = newGroup
        }

        // Add user to group
        const existingMember = await db
          .select()
          .from(groupMembersTable)
          .where(
            and(
              eq(groupMembersTable.groupId, group[0].id),
              eq(groupMembersTable.userId, session.user.id)
            )
          )
          .limit(1)

        if (existingMember.length === 0) {
          await db
            .insert(groupMembersTable)
            .values({
              groupId: group[0].id,
              userId: session.user.id,
              role: "member",
            })
        }
      }

      // Create notification for post owner
      await db
        .insert(notificationsTable)
        .values({
          userId: post.userId,
          fromUserId: session.user.id,
          type: "invite_auto_accepted",
          title: "Someone joined your invite!",
          message: `A user automatically joined your invite${post.communityName ? ` and was added to "${post.communityName}"` : ''}`,
          data: JSON.stringify({
            postId,
            inviteId: invite.id,
            communityName: post.communityName,
          }),
          actionUrl: post.communityName ? `/groups/${group?.[0]?.id}` : `/post/${postId}`,
        })

      return NextResponse.json({
        message: "Successfully joined the invite!",
        status: "accepted",
        autoAccepted: true,
        groupId: group?.[0]?.id || null,
      })
    } else {
      // Create pending request
      const newRequest = await db
        .insert(inviteRequestsTable)
        .values({
          postId,
          inviteId: invite.id,
          userId: session.user.id,
          status: "pending",
        })
        .returning()

      // Create notification for post owner
      await db
        .insert(notificationsTable)
        .values({
          userId: post.userId,
          fromUserId: session.user.id,
          type: "invite_request",
          title: "New invite request",
          message: "Someone wants to join your invite",
          data: JSON.stringify({
            postId,
            inviteId: invite.id,
            requestId: newRequest[0].id,
          }),
          actionUrl: `/post/${postId}`,
        })

      return NextResponse.json({
        message: "Request sent! You'll be notified when the host responds.",
        status: "pending",
        autoAccepted: false,
      })
    }
  } catch (error) {
    console.error("Error processing invite request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Get invite details and user's request status
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

    // Get invite details
    const inviteDetails = await db
      .select({
        invite: postInvitesTable,
        post: {
          id: postsTable.id,
          userId: postsTable.userId,
          content: postsTable.content,
          communityName: postsTable.communityName,
        },
        postOwner: {
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        },
      })
      .from(postInvitesTable)
      .innerJoin(postsTable, eq(postInvitesTable.postId, postsTable.id))
      .innerJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(eq(postInvitesTable.postId, postId))
      .limit(1)

    if (inviteDetails.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const { invite, post, postOwner } = inviteDetails[0]

    // Get user's request status
    let userRequest = null
    if (post.userId !== session.user.id) {
      const request = await db
        .select()
        .from(inviteRequestsTable)
        .where(
          and(
            eq(inviteRequestsTable.postId, postId),
            eq(inviteRequestsTable.userId, session.user.id)
          )
        )
        .limit(1)

      userRequest = request[0] || null
    }

    // Get participant count
    const participantCount = await db
      .select({ count: count() })
      .from(postInviteParticipantsTable)
      .where(eq(postInviteParticipantsTable.inviteId, invite.id))

    return NextResponse.json({
      invite: {
        ...invite,
        currentParticipants: participantCount[0]?.count || 0,
      },
      post,
      postOwner,
      userRequest,
      isOwner: post.userId === session.user.id,
    })
  } catch (error) {
    console.error("Error fetching invite details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}