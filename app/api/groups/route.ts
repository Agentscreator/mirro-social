import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { groupsTable, groupMembersTable, usersTable, postsTable } from "@/src/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"

// GET - Fetch user's groups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get groups where user is a member
    const userGroups = await db
      .select({
        id: groupsTable.id,
        name: groupsTable.name,
        description: groupsTable.description,
        image: groupsTable.image,
        createdBy: groupsTable.createdBy,
        postId: groupsTable.postId,
        maxMembers: groupsTable.maxMembers,
        createdAt: groupsTable.createdAt,
        memberRole: groupMembersTable.role,
        creator: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        }
      })
      .from(groupMembersTable)
      .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .leftJoin(usersTable, eq(groupsTable.createdBy, usersTable.id))
      .where(
        and(
          eq(groupMembersTable.userId, session.user.id),
          eq(groupsTable.isActive, 1)
        )
      )
      .orderBy(desc(groupsTable.createdAt))

    // Add member count to each group
    const groupsWithMemberCount = await Promise.all(
      userGroups.map(async (group) => {
        const memberCount = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(groupMembersTable)
          .where(eq(groupMembersTable.groupId, group.id))
        
        return {
          ...group,
          memberCount: memberCount[0]?.count || 0,
        }
      })
    )

    return NextResponse.json({ groups: groupsWithMemberCount })
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new group
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, image, postId, maxMembers = 10 } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Group name too long (max 100 characters)" }, { status: 400 })
    }

    // Create the group
    const newGroup = await db
      .insert(groupsTable)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        image: image || null,
        createdBy: session.user.id,
        postId: postId || null,
        maxMembers,
        isActive: 1,
      })
      .returning()

    // Add creator as admin member
    await db
      .insert(groupMembersTable)
      .values({
        groupId: newGroup[0].id,
        userId: session.user.id,
        role: "admin",
      })

    return NextResponse.json({
      group: newGroup[0],
      message: "Group created successfully",
    })
  } catch (error) {
    console.error("Error creating group:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}