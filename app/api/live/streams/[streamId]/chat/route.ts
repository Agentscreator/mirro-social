import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { liveStreamChatTable, usersTable } from "@/src/db/schema"
import { eq, desc } from "drizzle-orm"

// GET - Fetch chat messages for stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const streamId = parseInt(params.streamId)
    if (isNaN(streamId)) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 })
    }

    // Get recent chat messages
    const messages = await db
      .select({
        id: liveStreamChatTable.id,
        message: liveStreamChatTable.message,
        messageType: liveStreamChatTable.messageType,
        createdAt: liveStreamChatTable.createdAt,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
      })
      .from(liveStreamChatTable)
      .leftJoin(usersTable, eq(liveStreamChatTable.userId, usersTable.id))
      .where(eq(liveStreamChatTable.streamId, streamId))
      .orderBy(desc(liveStreamChatTable.createdAt))
      .limit(100)

    // Reverse to show oldest first
    messages.reverse()

    return NextResponse.json({
      messages,
    })
  } catch (error) {
    console.error("Get chat messages API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Send chat message
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const streamId = parseInt(params.streamId)
    if (isNaN(streamId)) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 })
    }

    const body = await request.json()
    const { message, messageType = "text" } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (message.length > 500) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 })
    }

    // Insert chat message
    const [newMessage] = await db
      .insert(liveStreamChatTable)
      .values({
        streamId,
        userId: session.user.id,
        message: message.trim(),
        messageType,
      })
      .returning()

    return NextResponse.json({
      message: newMessage,
    })
  } catch (error) {
    console.error("Send chat message API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}