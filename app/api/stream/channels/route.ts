import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { StreamChat } from "stream-chat"
import { db } from "@/src/db"
import { usersTable, postsTable } from "@/src/db/schema"
import { eq, inArray } from "drizzle-orm"

// Initialize StreamChat server client
const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY
const STREAM_SECRET_KEY = process.env.STREAM_SECRET_KEY

let serverClient: StreamChat | null = null

if (STREAM_API_KEY && STREAM_SECRET_KEY) {
  try {
    serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_SECRET_KEY)
  } catch (error) {
    console.error("Failed to initialize Stream Chat client:", error)
  }
}

// POST - Create a group channel for auto-accept invites
export async function POST(request: NextRequest) {
  try {
    if (!serverClient) {
      return NextResponse.json(
        { error: "Stream Chat service unavailable" },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postId, groupName, memberIds } = body

    console.log("=== CREATING GROUP CHANNEL ===")
    console.log("Post ID:", postId)
    console.log("Group Name:", groupName)
    console.log("Member IDs:", memberIds)

    // Validate input
    if (!postId || !groupName || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "Post ID, group name, and member IDs are required" },
        { status: 400 }
      )
    }

    // Verify the post exists and belongs to the user
    const post = await db
      .select({
        id: postsTable.id,
        userId: postsTable.userId,
        groupName: postsTable.groupName,
      })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post[0].userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get user information for all members
    const allMemberIds = [session.user.id, ...memberIds]
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        profileImage: usersTable.profileImage,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, allMemberIds))

    // Create channel ID based on post ID
    const channelId = `post-${postId}-group`

    try {
      // Create the channel
      const channel = serverClient.channel('messaging', channelId, {
        name: groupName,
        created_by_id: session.user.id,
        members: allMemberIds,
        // Add custom data
        post_id: postId,
        auto_created: true,
        group_type: 'invite_group',
      })

      await channel.create(session.user.id, {
        name: groupName,
        members: allMemberIds.map(id => {
          const user = users.find(u => u.id === id)
          return {
            user_id: id,
            name: user?.nickname || user?.username || `User_${id.slice(-8)}`,
            image: user?.profileImage,
          }
        }),
      })

      // Send welcome message
      await channel.sendMessage({
        text: `Welcome to ${groupName}! 🎉 This group was automatically created for everyone who joined the activity invite.`,
        user_id: session.user.id,
      })

      console.log("✅ Group channel created successfully:", channelId)

      return NextResponse.json({
        channelId,
        groupName,
        memberCount: allMemberIds.length,
        success: true,
      })

    } catch (streamError) {
      console.error("❌ Stream Chat channel creation failed:", streamError)
      return NextResponse.json(
        { error: "Failed to create group chat" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("❌ Group channel creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}