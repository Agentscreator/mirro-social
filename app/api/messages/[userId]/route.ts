import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { messagesTable, usersTable } from "@/src/db/schema"
import { desc, eq, or, and } from "drizzle-orm"

// GET - Fetch messages between current user and specified user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Check if the other user exists
    const otherUser = await db
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

    if (otherUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get messages between the two users
    const messages = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        receiverId: messagesTable.receiverId,
        isRead: messagesTable.isRead,
        createdAt: messagesTable.createdAt,
        messageType: messagesTable.messageType,
        attachmentUrl: messagesTable.attachmentUrl,
        attachmentName: messagesTable.attachmentName,
        attachmentType: messagesTable.attachmentType,
        attachmentSize: messagesTable.attachmentSize,
      })
      .from(messagesTable)
      .where(
        or(
          and(
            eq(messagesTable.senderId, session.user.id),
            eq(messagesTable.receiverId, userId)
          ),
          and(
            eq(messagesTable.senderId, userId),
            eq(messagesTable.receiverId, session.user.id)
          )
        )
      )
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit)
      .offset(offset)

    // Mark messages from the other user as read
    await db
      .update(messagesTable)
      .set({ isRead: 1 })
      .where(
        and(
          eq(messagesTable.senderId, userId),
          eq(messagesTable.receiverId, session.user.id),
          eq(messagesTable.isRead, 0)
        )
      )

    // Reverse to get chronological order (oldest first)
    const sortedMessages = messages.reverse()

    return NextResponse.json({
      messages: sortedMessages,
      user: {
        id: otherUser[0].id,
        username: otherUser[0].username,
        nickname: otherUser[0].nickname,
        profileImage: otherUser[0].profileImage || otherUser[0].image,
        isOnline: false, // TODO: Implement real-time online status
      },
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Send a message to a specific user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    console.log("=== SEND MESSAGE API START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { content, messageType, attachmentUrl, attachmentName, attachmentType, attachmentSize } = body

    console.log("Sending message from:", session.user.id, "to:", userId)
    console.log("Message content:", content?.substring(0, 100))
    console.log("Message type:", messageType)
    console.log("Attachment:", attachmentUrl ? "Yes" : "No")

    // Validate input - either content or attachment is required
    if ((!content || content.trim().length === 0) && !attachmentUrl) {
      return NextResponse.json({ error: "Content or attachment is required" }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 })
    }

    // Check if receiver exists
    const receiver = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)

    if (receiver.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create the message in database
    const newMessage = await db
      .insert(messagesTable)
      .values({
        senderId: session.user.id,
        receiverId: userId,
        content: content?.trim() || null,
        messageType: messageType || 'text',
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        attachmentType: attachmentType || null,
        attachmentSize: attachmentSize || null,
        isRead: 0,
      })
      .returning()

    console.log("✅ Message saved to database:", newMessage[0])

    // Verify the message was saved
    const verifyMessage = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.id, newMessage[0].id))
      .limit(1)

    if (verifyMessage.length === 0) {
      console.error("❌ Message not found after creation")
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    console.log("✅ Message verified in database")
    console.log("=== SEND MESSAGE API END ===")

    return NextResponse.json({
      message: newMessage[0],
      success: "Message sent successfully",
    })
  } catch (error) {
    console.error("❌ Error sending message:", error)
    console.error("Message error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}