import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { messagesTable, usersTable } from "@/src/db/schema"
import { eq, sql } from "drizzle-orm"

// GET - Fetch conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get conversations with the last message and unread count
    const conversationsQuery = sql`
      WITH latest_messages AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN sender_id = ${session.user.id} THEN receiver_id
            ELSE sender_id
          END
        )
        CASE 
          WHEN sender_id = ${session.user.id} THEN receiver_id
          ELSE sender_id
        END as other_user_id,
        content,
        created_at,
        sender_id
        FROM messages 
        WHERE sender_id = ${session.user.id} OR receiver_id = ${session.user.id}
        ORDER BY 
          CASE 
            WHEN sender_id = ${session.user.id} THEN receiver_id
            ELSE sender_id
          END,
          created_at DESC
      ),
      unread_counts AS (
        SELECT 
          sender_id as other_user_id,
          COUNT(*)::int as unread_count
        FROM messages 
        WHERE receiver_id = ${session.user.id} 
          AND is_read = 0
        GROUP BY sender_id
      )
      SELECT 
        u.id as user_id,
        u.username,
        u.nickname,
        u.profile_image,
        u.image,
        lm.content as last_message,
        lm.created_at as last_message_time,
        lm.sender_id as last_message_sender_id,
        COALESCE(uc.unread_count, 0) as unread_count
      FROM latest_messages lm
      JOIN users u ON u.id = lm.other_user_id
      LEFT JOIN unread_counts uc ON uc.other_user_id = u.id
      ORDER BY lm.created_at DESC
    `

    const conversations = await db.execute(conversationsQuery)

    // Format the response
    const formattedConversations = conversations.rows.map((conv: any) => {
      // Format last message preview
      let lastMessagePreview = conv.last_message
      if (conv.last_message_sender_id === session.user.id) {
        lastMessagePreview = `You: ${conv.last_message}`
      }

      return {
        id: conv.user_id,
        userId: conv.user_id,
        username: conv.username,
        nickname: conv.nickname,
        profileImage: conv.profile_image || conv.image,
        lastMessage: lastMessagePreview,
        lastMessageTime: conv.last_message_time,
        unreadCount: conv.unread_count,
        isOnline: false, // TODO: Implement real-time online status
      }
    })

    return NextResponse.json({ conversations: formattedConversations })
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { receiverId, content } = body

    // Validate input
    if (!receiverId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: "Receiver ID and content are required" }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 })
    }

    // Check if receiver exists
    const receiver = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, receiverId))
      .limit(1)

    if (receiver.length === 0) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 })
    }

    // Create the message
    const newMessage = await db
      .insert(messagesTable)
      .values({
        senderId: session.user.id,
        receiverId,
        content: content.trim(),
        isRead: 0,
      })
      .returning()

    return NextResponse.json({
      message: newMessage[0],
      success: "Message sent successfully",
    })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}