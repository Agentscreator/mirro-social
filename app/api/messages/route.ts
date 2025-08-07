import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { messagesTable, usersTable } from "@/src/db/schema"
import { desc, eq, or, sql } from "drizzle-orm"

// GET - Fetch conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get conversations with the last message and unread count
    const conversations = await db
      .select({
        userId: sql<string>`
          CASE 
            WHEN ${messagesTable.senderId} = ${session.user.id} THEN ${messagesTable.receiverId}
            ELSE ${messagesTable.senderId}
          END
        `,
        username: usersTable.username,
        nickname: usersTable.nickname,
        profileImage: usersTable.profileImage,
        image: usersTable.image,
        lastMessage: messagesTable.content,
        lastMessageTime: messagesTable.createdAt,
        lastMessageSenderId: messagesTable.senderId,
        unreadCount: sql<number>`
          (SELECT COUNT(*)::int FROM ${messagesTable} m2 
           WHERE m2.sender_id != ${session.user.id} 
           AND m2.receiver_id = ${session.user.id}
           AND m2.is_read = 0
           AND (m2.sender_id = ${usersTable.id}))
        `,
      })
      .from(messagesTable)
      .innerJoin(
        usersTable,
        sql`${usersTable.id} = CASE 
          WHEN ${messagesTable.senderId} = ${session.user.id} THEN ${messagesTable.receiverId}
          ELSE ${messagesTable.senderId}
        END`
      )
      .where(
        or(
          eq(messagesTable.senderId, session.user.id),
          eq(messagesTable.receiverId, session.user.id)
        )
      )
      .orderBy(desc(messagesTable.createdAt))
      .groupBy(usersTable.id, usersTable.username, usersTable.nickname, usersTable.profileImage, usersTable.image, messagesTable.content, messagesTable.createdAt, messagesTable.senderId)

    // Format the response
    const formattedConversations = conversations.map(conv => {
      // Format last message preview
      let lastMessagePreview = conv.lastMessage
      if (conv.lastMessageSenderId === session.user.id) {
        lastMessagePreview = `You: ${conv.lastMessage}`
      }

      return {
        id: conv.userId,
        userId: conv.userId,
        username: conv.username,
        nickname: conv.nickname,
        profileImage: conv.profileImage || conv.image,
        lastMessage: lastMessagePreview,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount,
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