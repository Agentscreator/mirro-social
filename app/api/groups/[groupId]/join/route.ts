import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { groupsTable, groupMembersTable, notificationsTable, usersTable } from "@/src/db/schema"
import { eq, and, sql } from "drizzle-orm"

// POST - Join a group (for auto-accept groups from posts)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params

    // Check if group exists and get details
    const group = await db
      .select({
        id: groupsTable.id,
        name: groupsTable.name,
        createdBy: groupsTable.createdBy,
        maxMembers: groupsTable.maxMembers,
        postId: groupsTable.postId,
      })
      .from(groupsTable)
      .where(eq(groupsTable.id, parseInt(groupId)))
      .limit(1)

    if (group.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, parseInt(groupId)),
          eq(groupMembersTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingMembership.length > 0) {
      return NextResponse.json({ error: "Already a member of this group" }, { status: 400 })
    }

    // Check if group is full
    const memberCount = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(groupMembersTable)
      .where(eq(groupMembersTable.groupId, parseInt(groupId)))

    if (memberCount[0].count >= group[0].maxMembers) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 })
    }

    // Add user to group
    await db
      .insert(groupMembersTable)
      .values({
        groupId: parseInt(groupId),
        userId: session.user.id,
        role: "member",
      })

    // Get user info for notification
    const user = await db
      .select({
        username: usersTable.username,
        nickname: usersTable.nickname,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.user.id))
      .limit(1)

    // Notify group creator
    if (group[0].createdBy !== session.user.id) {
      await db
        .insert(notificationsTable)
        .values({
          userId: group[0].createdBy,
          fromUserId: session.user.id,
          type: "group_member_joined",
          title: "New Group Member",
          message: `${user[0].nickname || user[0].username} joined your group "${group[0].name}"`,
          data: JSON.stringify({
            groupId: group[0].id,
            groupName: group[0].name,
            userId: session.user.id,
          }),
          actionUrl: `/groups/${group[0].id}`,
        })
    }

    return NextResponse.json({
      message: "Successfully joined the group",
      group: group[0],
    })
  } catch (error) {
    console.error("Error joining group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}