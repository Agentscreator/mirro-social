import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { groupsTable, groupMembersTable, postsTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// POST - Create a group for a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== CREATE GROUP FOR POST API START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const postId = parseInt(id)

    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    const body = await request.json()
    const { groupName, maxMembers = 10 } = body

    if (!groupName || groupName.trim().length === 0) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 })
    }

    // Verify the post exists and belongs to the user
    const post = await db
      .select({
        id: postsTable.id,
        userId: postsTable.userId,
        content: postsTable.content,
      })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to create group for this post" }, { status: 403 })
    }

    console.log("Creating group for post:", postId)

    // Create the group
    const newGroup = await db
      .insert(groupsTable)
      .values({
        name: groupName.trim(),
        description: `Group created from post: ${post[0].content?.substring(0, 100)}${post[0].content && post[0].content.length > 100 ? '...' : ''}`,
        createdBy: session.user.id,
        postId: postId,
        maxMembers: Math.min(Math.max(maxMembers, 1), 100),
        isActive: 1,
      })
      .returning()

    console.log("✅ Group created:", newGroup[0])

    // Add creator as admin member
    await db
      .insert(groupMembersTable)
      .values({
        groupId: newGroup[0].id,
        userId: session.user.id,
        role: "admin",
      })

    console.log("✅ Group member added")

    console.log("=== CREATE GROUP FOR POST API END ===")

    return NextResponse.json({
      group: newGroup[0],
      message: "Group created successfully",
    })
  } catch (error) {
    console.error("❌ Create group for post error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}