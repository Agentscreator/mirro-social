import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable, usersTable, postsTable } from "@/src/db/schema"
import { desc, eq, and } from "drizzle-orm"

// GET - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const notifications = await db
      .select({
        id: notificationsTable.id,
        type: notificationsTable.type,
        title: notificationsTable.title,
        message: notificationsTable.message,
        data: notificationsTable.data,
        isRead: notificationsTable.isRead,
        createdAt: notificationsTable.createdAt,
        fromUser: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
      })
      .from(notificationsTable)
      .leftJoin(usersTable, eq(notificationsTable.fromUserId, usersTable.id))
      .where(eq(notificationsTable.userId, session.user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, type, title, message, data, fromUserId } = body

    // Validate input
    if (!userId || !type || !title || !message) {
      return NextResponse.json({ 
        error: "User ID, type, title, and message are required" 
      }, { status: 400 })
    }

    // Create the notification
    const notification = await db
      .insert(notificationsTable)
      .values({
        userId,
        fromUserId: fromUserId || session.user.id,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        isRead: 0,
      })
      .returning()

    return NextResponse.json({
      notification: notification[0],
      message: "Notification created successfully",
    })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds } = body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ 
        error: "Notification IDs array is required" 
      }, { status: 400 })
    }

    // Mark notifications as read
    await db
      .update(notificationsTable)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notificationsTable.userId, session.user.id),
          // Only update notifications that belong to the user
        )
      )

    return NextResponse.json({ message: "Notifications marked as read" })
  } catch (error) {
    console.error("Error updating notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}