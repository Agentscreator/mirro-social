import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postInvitesTable, postInviteParticipantsTable, postsTable, usersTable, notificationsTable } from "@/src/db/schema"
import { eq, and, count } from "drizzle-orm"

// POST - Accept an invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const postId = Number.parseInt(id)

    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    // Get the post and invite info
    const postResult = await db
      .select({
        post: {
          id: postsTable.id,
          userId: postsTable.userId,
          content: postsTable.content,
          autoAcceptInvites: postsTable.autoAcceptInvites,
          groupName: postsTable.groupName,
        },
        invite: {
          id: postInvitesTable.id,
          participantLimit: postInvitesTable.participantLimit,
          currentParticipants: postInvitesTable.currentParticipants,
        },
      })
      .from(postsTable)
      .leftJoin(postInvitesTable, eq(postInvitesTable.postId, postsTable.id))
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const { post, invite } = postResult[0]

    if (!invite) {
      return NextResponse.json({ error: "This post is not an invite" }, { status: 400 })
    }

    // Check if user already accepted
    const existingParticipant = await db
      .select()
      .from(postInviteParticipantsTable)
      .where(
        and(
          eq(postInviteParticipantsTable.inviteId, invite.id),
          eq(postInviteParticipantsTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingParticipant.length > 0) {
      return NextResponse.json({ error: "You have already accepted this invite" }, { status: 400 })
    }

    // Check if invite is full (unless unlimited)
    if (invite.participantLimit > 0 && invite.currentParticipants >= invite.participantLimit) {
      return NextResponse.json({ error: "This invite is full" }, { status: 400 })
    }

    // Add participant
    await db.insert(postInviteParticipantsTable).values({
      inviteId: invite.id,
      userId: session.user.id,
    })

    // Update participant count
    await db
      .update(postInvitesTable)
      .set({ currentParticipants: invite.currentParticipants + 1 })
      .where(eq(postInvitesTable.id, invite.id))

    // Create notification for post owner
    if (post.userId !== session.user.id) {
      const userInfo = await db
        .select({
          username: usersTable.username,
          nickname: usersTable.nickname,
        })
        .from(usersTable)
        .where(eq(usersTable.id, session.user.id))
        .limit(1)

      const userName = userInfo[0]?.nickname || userInfo[0]?.username || "Someone"

      await db.insert(notificationsTable).values({
        userId: post.userId,
        fromUserId: session.user.id,
        type: "invite_accepted",
        title: "Invite Accepted!",
        message: `${userName} accepted your invitation`,
        data: JSON.stringify({ postId, inviteId: invite.id }),
        isRead: 0,
      })
    }

    // If auto-accept is enabled, create/add to group chat
    if (post.autoAcceptInvites && post.groupName) {
      try {
        // Get all participants for this invite
        const participants = await db
          .select({ userId: postInviteParticipantsTable.userId })
          .from(postInviteParticipantsTable)
          .where(eq(postInviteParticipantsTable.inviteId, invite.id))

        const memberIds = participants.map(p => p.userId)
        
        // Create or update group chat
        const groupResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/stream/group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            postId,
            groupName: post.groupName,
            memberIds,
          }),
        })

        if (!groupResponse.ok) {
          console.error("Failed to create/update group chat:", await groupResponse.text())
        }
      } catch (error) {
        console.error("Error creating group chat:", error)
        // Don't fail the invite acceptance if group creation fails
      }
    }

    return NextResponse.json({
      message: "Invite accepted successfully",
      participantCount: invite.currentParticipants + 1,
      autoGroupCreated: post.autoAcceptInvites && post.groupName,
    })
  } catch (error) {
    console.error("Error accepting invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Decline/leave an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const postId = Number.parseInt(id)

    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    // Get the invite info
    const inviteResult = await db
      .select({
        id: postInvitesTable.id,
        currentParticipants: postInvitesTable.currentParticipants,
      })
      .from(postInvitesTable)
      .where(eq(postInvitesTable.postId, postId))
      .limit(1)

    if (inviteResult.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const invite = inviteResult[0]

    // Remove participant
    const deletedRows = await db
      .delete(postInviteParticipantsTable)
      .where(
        and(
          eq(postInviteParticipantsTable.inviteId, invite.id),
          eq(postInviteParticipantsTable.userId, session.user.id)
        )
      )

    if (deletedRows.length === 0) {
      return NextResponse.json({ error: "You haven't accepted this invite" }, { status: 400 })
    }

    // Update participant count
    await db
      .update(postInvitesTable)
      .set({ currentParticipants: Math.max(0, invite.currentParticipants - 1) })
      .where(eq(postInvitesTable.id, invite.id))

    return NextResponse.json({
      message: "Left invite successfully",
      participantCount: Math.max(0, invite.currentParticipants - 1),
    })
  } catch (error) {
    console.error("Error leaving invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}