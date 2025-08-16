import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  inviteRequestsTable, 
  postInvitesTable, 
  postsTable, 
  usersTable,
  notificationsTable,
  groupsTable,
  groupMembersTable
} from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

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
    const inviteId = parseInt(id)

    if (isNaN(inviteId)) {
      return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 })
    }

    // Get invite details with post information
    const invite = await db
      .select({
        id: postInvitesTable.id,
        postId: postInvitesTable.postId,
        participantLimit: postInvitesTable.participantLimit,
        currentParticipants: postInvitesTable.currentParticipants,
        postAuthorId: postsTable.userId,
        autoAcceptInvites: postsTable.autoAcceptInvites,
        groupName: postsTable.groupName,
      })
      .from(postInvitesTable)
      .innerJoin(postsTable, eq(postInvitesTable.postId, postsTable.id))
      .where(eq(postInvitesTable.id, inviteId))
      .limit(1)

    if (invite.length === 0) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const inviteData = invite[0]

    // Check if user is trying to request their own invite
    if (inviteData.postAuthorId === session.user.id) {
      return NextResponse.json({ error: "Cannot request your own invite" }, { status: 400 })
    }

    // Removed participant limit check to allow unlimited participants

    // Check if user already has a pending or accepted request
    const existingRequest = await db
      .select()
      .from(inviteRequestsTable)
      .where(
        and(
          eq(inviteRequestsTable.inviteId, inviteId),
          eq(inviteRequestsTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingRequest.length > 0) {
      const status = existingRequest[0].status
      if (status === "pending") {
        return NextResponse.json({ error: "Request already pending" }, { status: 400 })
      } else if (status === "accepted") {
        return NextResponse.json({ error: "Already accepted to this invite" }, { status: 400 })
      }
    }

    // Get user info for notifications
    const user = await db
      .select({
        username: usersTable.username,
        nickname: usersTable.nickname,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.user.id))
      .limit(1)

    const userName = user[0]?.nickname || user[0]?.username || "Someone"

    // Handle auto-accept vs manual approval
    if (inviteData.autoAcceptInvites === 1) {
      // Auto-accept: directly add to participants and group if exists
      
      // Update participant count
      await db
        .update(postInvitesTable)
        .set({
          currentParticipants: inviteData.currentParticipants + 1,
          updatedAt: new Date(),
        })
        .where(eq(postInvitesTable.id, inviteId))

      // Create accepted request record
      const newRequest = await db
        .insert(inviteRequestsTable)
        .values({
          postId: inviteData.postId,
          inviteId: inviteId,
          userId: session.user.id,
          status: "accepted",
          requestedAt: new Date(),
          respondedAt: new Date(),
        })
        .returning()

      // If there's a group associated with this post, add user to group
      if (inviteData.groupName) {
        const group = await db
          .select()
          .from(groupsTable)
          .where(eq(groupsTable.postId, inviteData.postId))
          .limit(1)

        if (group.length > 0) {
          // Check if user is already a member
          const existingMembership = await db
            .select()
            .from(groupMembersTable)
            .where(
              and(
                eq(groupMembersTable.groupId, group[0].id),
                eq(groupMembersTable.userId, session.user.id)
              )
            )
            .limit(1)

          if (existingMembership.length === 0) {
            await db
              .insert(groupMembersTable)
              .values({
                groupId: group[0].id,
                userId: session.user.id,
                role: "member",
              })
          }
        }
      }

      // Notify post author about auto-acceptance
      await db
        .insert(notificationsTable)
        .values({
          userId: inviteData.postAuthorId,
          fromUserId: session.user.id,
          type: "invite_auto_accepted",
          title: "Someone Joined Your Activity",
          message: `${userName} joined your activity!`,
          data: JSON.stringify({
            postId: inviteData.postId,
            inviteRequestId: newRequest[0].id,
            autoAccepted: true,
          }),
          actionUrl: `/posts/${inviteData.postId}`,
        })

      return NextResponse.json({
        message: "Successfully joined the activity!",
        request: newRequest[0],
        autoAccepted: true,
      })
    } else {
      // Manual approval: create pending request and notify post author
      
      const newRequest = await db
        .insert(inviteRequestsTable)
        .values({
          postId: inviteData.postId,
          inviteId: inviteId,
          userId: session.user.id,
          status: "pending",
          requestedAt: new Date(),
        })
        .returning()

      // Notify post author about the request
      await db
        .insert(notificationsTable)
        .values({
          userId: inviteData.postAuthorId,
          fromUserId: session.user.id,
          type: "invite_request",
          title: "New Invite Request",
          message: `${userName} wants to join your activity!`,
          data: JSON.stringify({
            postId: inviteData.postId,
            inviteRequestId: newRequest[0].id,
          }),
          actionUrl: `/posts/${inviteData.postId}`,
        })

      return NextResponse.json({
        message: "Request sent! Waiting for approval.",
        request: newRequest[0],
        autoAccepted: false,
      })
    }
  } catch (error) {
    console.error("Error requesting invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}