import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { groupsTable, groupMembersTable, usersTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// GET - Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params

    // Check if user is a member of the group
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, parseInt(groupId)),
          eq(groupMembersTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get group details
    const group = await db
      .select({
        id: groupsTable.id,
        name: groupsTable.name,
        description: groupsTable.description,
        image: groupsTable.image,
        createdBy: groupsTable.createdBy,
        postId: groupsTable.postId,
        maxMembers: groupsTable.maxMembers,
        createdAt: groupsTable.createdAt,
        creator: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        }
      })
      .from(groupsTable)
      .leftJoin(usersTable, eq(groupsTable.createdBy, usersTable.id))
      .where(eq(groupsTable.id, parseInt(groupId)))
      .limit(1)

    if (group.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Get group members
    const members = await db
      .select({
        id: groupMembersTable.id,
        role: groupMembersTable.role,
        joinedAt: groupMembersTable.joinedAt,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        }
      })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, parseInt(groupId)))

    return NextResponse.json({
      group: {
        ...group[0],
        members,
        memberCount: members.length,
        userRole: membership[0].role,
      }
    })
  } catch (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params
    const body = await request.json()
    const { name, description, image } = body

    // Check if user is admin of the group
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, parseInt(groupId)),
          eq(groupMembersTable.userId, session.user.id),
          eq(groupMembersTable.role, "admin")
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Update group
    const updatedGroup = await db
      .update(groupsTable)
      .set({
        name: name?.trim(),
        description: description?.trim() || null,
        image: image || null,
        updatedAt: new Date(),
      })
      .where(eq(groupsTable.id, parseInt(groupId)))
      .returning()

    return NextResponse.json({
      group: updatedGroup[0],
      message: "Group updated successfully",
    })
  } catch (error) {
    console.error("Error updating group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}