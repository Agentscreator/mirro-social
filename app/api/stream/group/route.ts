// app/api/stream/group/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { StreamChat } from "stream-chat"
import { db } from "@/src/db"
import { usersTable } from "@/src/db/schema"
import { eq, inArray } from "drizzle-orm"
import crypto from "crypto"

const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_SECRET_KEY!
)

function createGroupChannelId(postId: number, groupName: string): string {
  // Create a unique channel ID based on post ID and group name
  const combined = `post_${postId}_${groupName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  
  // If the combined string is short enough, use it directly
  if (combined.length <= 60) {
    return `group_${combined}`
  }
  
  // Otherwise, create a hash to ensure it's under 64 characters
  const hash = crypto.createHash('md5').update(combined).digest('hex')
  return `group_${hash}`
}

// Helper function to get user data from database
async function getUsersFromDatabase(userIds: string[]) {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        profileImage: usersTable.profileImage,
        image: usersTable.image
      })
      .from(usersTable)
      .where(inArray(usersTable.id, userIds))

    return users
  } catch (error) {
    console.error(`Error fetching users from database:`, error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId, groupName, memberIds } = await request.json()
    
    if (!postId || !groupName || !memberIds || !Array.isArray(memberIds)) {
      return NextResponse.json({ 
        error: "Post ID, group name, and member IDs are required" 
      }, { status: 400 })
    }

    const currentUserId = session.user.id
    const allMemberIds = [currentUserId, ...memberIds.filter(id => id !== currentUserId)]
    
    // Create deterministic channel ID
    const channelId = createGroupChannelId(postId, groupName)
    
    console.log(`Creating group channel with ID: ${channelId} (length: ${channelId.length})`)

    try {
      // Fetch user data from database
      const usersData = await getUsersFromDatabase(allMemberIds)
      
      // Prepare user data for Stream Chat
      const streamUsers = usersData.map(user => ({
        id: user.id,
        name: user.nickname || user.username || `User_${user.id.slice(-8)}`,
        username: user.username || `User_${user.id.slice(-8)}`,
        image: user.profileImage || user.image || undefined,
      }))

      // Add any missing users with fallback data
      const existingUserIds = usersData.map(u => u.id)
      const missingUserIds = allMemberIds.filter(id => !existingUserIds.includes(id))
      
      for (const userId of missingUserIds) {
        streamUsers.push({
          id: userId,
          name: `User_${userId.slice(-8)}`,
          username: `User_${userId.slice(-8)}`,
          image: undefined,
        })
      }

      // Ensure all users exist in Stream Chat
      await Promise.all(
        streamUsers.map(user => serverClient.upsertUser(user))
      )

      // Create group channel
      const channel = serverClient.channel('messaging', channelId, {
        name: groupName,
        members: allMemberIds,
        created_by_id: currentUserId,
        custom: {
          type: 'group',
          postId: postId,
          autoAccept: true,
        }
      })

      // Create the channel
      await channel.create()

      // Send welcome message
      await channel.sendMessage({
        text: `Welcome to ${groupName}! This group was created from a post invitation.`,
        user_id: currentUserId,
      })

      return NextResponse.json({ 
        channelId,
        groupName,
        memberCount: allMemberIds.length,
        success: true 
      })
    } catch (streamError: any) {
      console.error("Stream error:", streamError)
      
      // Handle Stream Chat specific errors
      if (streamError.code === 4 && streamError.message?.includes('already exists')) {
        // Channel already exists, that's fine
        return NextResponse.json({ 
          channelId,
          groupName,
          success: true,
          message: "Group already exists"
        })
      }
      
      // Re-throw other Stream errors
      throw streamError
    }
  } catch (error: any) {
    console.error("Group creation error:", error)
    return NextResponse.json({ 
      error: "Failed to create group",
      details: error.message || "Unknown error",
      success: false
    }, { status: 500 })
  }
}