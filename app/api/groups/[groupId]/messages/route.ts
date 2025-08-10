import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { groupMessagesTable, groupMembersTable, usersTable } from "@/src/db/schema"
import { eq, and, desc } from "drizzle-orm"

// GET - Fetch group messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Check if user is a member of the group
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, parseInt(groupId)),
          eq(groupMembersTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get group messages
    const messages = await db
      .select({
        id: groupMessagesTable.id,
        content: groupMessagesTable.content,
        messageType: groupMessagesTable.messageType,
        attachmentUrl: groupMessagesTable.attachmentUrl,
        attachmentType: groupMessagesTable.attachmentType,
        attachmentName: groupMessagesTable.attachmentName,
        attachmentSize: groupMessagesTable.attachmentSize,
        createdAt: groupMessagesTable.createdAt,
        sender: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        }
      })
      .from(groupMessagesTable)
      .innerJoin(usersTable, eq(groupMessagesTable.senderId, usersTable.id))
      .where(eq(groupMessagesTable.groupId, parseInt(groupId)))
      .orderBy(desc(groupMessagesTable.createdAt))
      .limit(limit)
      .offset(offset)

    // Reverse to get chronological order
    const sortedMessages = messages.reverse()

    return NextResponse.json({ messages: sortedMessages })
  } catch (error) {
    console.error("Error fetching group messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Send group message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params
    const body = await request.json()
    const { content, messageType, attachmentUrl, attachmentName, attachmentType, attachmentSize } = body

    // Check if user is a member of the group
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, parseInt(groupId)),
          eq(groupMembersTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Validate input
    if ((!content || content.trim().length === 0) && !attachmentUrl) {
      return NextResponse.json({ error: "Content or attachment is required" }, { status: 400 })
    }

    // Create the message
    const newMessage = await db
      .insert(groupMessagesTable)
      .values({
        groupId: parseInt(groupId),
        senderId: session.user.id,
        content: content?.trim() || null,
        messageType: messageType || 'text',
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        attachmentType: attachmentType || null,
        attachmentSize: attachmentSize || null,
      })
      .returning()

    return NextResponse.json({
      message: newMessage[0],
      success: "Message sent successfully",
    })
  } catch (error) {
    console.error("Error sending group message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}