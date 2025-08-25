import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { messagesTable, usersTable } from "@/src/db/schema"
import { eq, sql } from "drizzle-orm"

// Configure the API route
export const runtime = 'nodejs'
export const maxDuration = 30

// GET - Fetch conversations for the current user OR specific chat messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // If userId is provided, fetch messages for that specific chat
    if (userId) {
      const messages = await db
        .select({
          id: messagesTable.id,
          senderId: messagesTable.senderId,
          receiverId: messagesTable.receiverId,
          content: messagesTable.content,
          timestamp: messagesTable.createdAt,
          isRead: messagesTable.isRead,
        })
        .from(messagesTable)
        .where(
          sql`(${messagesTable.senderId} = ${session.user.id} AND ${messagesTable.receiverId} = ${userId}) OR (${messagesTable.senderId} = ${userId} AND ${messagesTable.receiverId} = ${session.user.id})`
        )
        .orderBy(sql`${messagesTable.createdAt} ASC`)
        .limit(100)

      // Get chat user info
      const chatUser = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)

      return NextResponse.json({
        messages: messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        chatUser: chatUser[0] ? {
          ...chatUser[0],
          profileImage: chatUser[0].profileImage || chatUser[0].image,
          isOnline: false
        } : null
      })
    }

    // Fetch messages more efficiently with a limit
    const allMessages = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        receiverId: messagesTable.receiverId,
        content: messagesTable.content,
        createdAt: messagesTable.createdAt,
        isRead: messagesTable.isRead,
      })
      .from(messagesTable)
      .where(
        sql`${messagesTable.senderId} = ${session.user.id} OR ${messagesTable.receiverId} = ${session.user.id}`
      )
      .orderBy(sql`${messagesTable.createdAt} DESC`)
      .limit(1000) // Limit to prevent excessive data loading

    if (allMessages.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // Group messages by conversation partner
    const conversationMap = new Map()

    for (const message of allMessages) {
      const otherUserId = message.senderId === session.user.id ? message.receiverId : message.senderId

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          otherUserId,
          lastMessage: message,
          unreadCount: 0,
        })
      }

      // Count unread messages from this user
      if (message.receiverId === session.user.id && message.isRead === 0) {
        const conv = conversationMap.get(otherUserId)
        conv.unreadCount++
      }
    }

    // Get user details for each conversation in a single query
    const conversationUserIds = Array.from(conversationMap.keys())

    if (conversationUserIds.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // Fetch all users in a single query instead of individual queries
    const users = await Promise.all(
      conversationUserIds.map(async (userId) => {
        const user = await db
          .select({
            id: usersTable.id,
            username: usersTable.username,
            nickname: usersTable.nickname,
            profileImage: usersTable.profileImage,
            image: usersTable.image,
          })
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1)
        
        return user[0]
      })
    )

    const validUsers = users.filter(Boolean)
    console.log("Found users:", validUsers.length)

    // Format the response
    const formattedConversations = validUsers.map(user => {
      const conv = conversationMap.get(user.id)
      const lastMessage = conv.lastMessage

      let lastMessagePreview = lastMessage.content || 'Attachment'
      if (lastMessage.senderId === session.user.id) {
        lastMessagePreview = `You: ${lastMessage.content || 'Attachment'}`
      }

      return {
        id: user.id,
        userId: user.id,
        username: user.username,
        nickname: user.nickname,
        profileImage: user.profileImage || user.image,
        lastMessage: lastMessagePreview,
        lastMessageTime: lastMessage.createdAt,
        unreadCount: conv.unreadCount,
        isOnline: false,
      }
    })

    // Sort by last message time
    formattedConversations.sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    )

    console.log("Returning conversations:", formattedConversations.length)
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
      id: newMessage[0].id,
      content: newMessage[0].content,
      senderId: newMessage[0].senderId,
      receiverId: newMessage[0].receiverId,
      timestamp: newMessage[0].createdAt,
      isRead: newMessage[0].isRead,
    })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}