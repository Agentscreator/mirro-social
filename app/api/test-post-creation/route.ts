import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, postInvitesTable, groupsTable, groupMembersTable } from "@/src/db/schema"

// POST - Test post creation with minimal data
export async function POST(request: NextRequest) {
  try {
    console.log("=== TEST POST CREATION START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content, createGroup } = body

    console.log("Creating test post with:", { content, createGroup, userId: session.user.id })

    // Create a simple post
    const newPost = await db
      .insert(postsTable)
      .values({
        userId: session.user.id,
        content: content || "Test post content",
        autoAcceptInvites: createGroup ? 1 : 0,
        groupName: createGroup ? "Test Group" : null,
      })
      .returning()

    console.log("✅ Post created:", newPost[0])

    // Create invite
    const invite = await db
      .insert(postInvitesTable)
      .values({
        postId: newPost[0].id,
        participantLimit: 10,
        currentParticipants: 0,
      })
      .returning()

    console.log("✅ Invite created:", invite[0])

    let group = null
    if (createGroup) {
      // Create group
      group = await db
        .insert(groupsTable)
        .values({
          name: "Test Group",
          description: "Test group description",
          createdBy: session.user.id,
          postId: newPost[0].id,
          maxMembers: 10,
          isActive: 1,
        })
        .returning()

      console.log("✅ Group created:", group[0])

      // Add creator as admin
      await db
        .insert(groupMembersTable)
        .values({
          groupId: group[0].id,
          userId: session.user.id,
          role: "admin",
        })

      console.log("✅ Group member added")
    }

    console.log("=== TEST POST CREATION END ===")

    return NextResponse.json({
      success: true,
      post: newPost[0],
      invite: invite[0],
      group: group?.[0] || null,
      message: "Test post created successfully"
    })
  } catch (error) {
    console.error("❌ Test post creation error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}