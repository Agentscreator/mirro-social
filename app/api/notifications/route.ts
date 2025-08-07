import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable, usersTable } from "@/src/db/schema"
import { desc, eq, count, and } from "drizzle-orm"

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    console.log("=== NOTIFICATIONS GET API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const onlyUnread = searchParams.get("unread") === "true"

    console.log("Fetching notifications for user:", session.user.id)
    console.log("Limit:", limit, "Only unread:", onlyUnread)

    // Get notifications with sender information
    let query = db
      .select({
        id: notificationsTable.id,
        type: notificationsTable.type,
        title: notificationsTable.title,
        message: notificationsTable.message,
        postId: notificationsTable.postId,
        inviteRequestId: notificationsTable.inviteRequestId,
        isRead: notificationsTable.isRead,
        createdAt: notificationsTable.createdAt,
        fromUser: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        },
      })
      .from(notificationsTable)
      .leftJoin(usersTable, eq(notificationsTable.fromUserId, usersTable.id))
      .where(eq(notificationsTable.userId, session.user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit)

    let finalQuery
    if (onlyUnread) {
      finalQuery = db
        .select({
          id: notificationsTable.id,
          type: notificationsTable.type,
          title: notificationsTable.title,
          message: notificationsTable.message,
          postId: notificationsTable.postId,
          inviteRequestId: notificationsTable.inviteRequestId,
          isRead: notificationsTable.isRead,
          createdAt: notificationsTable.createdAt,
          fromUser: {
            id: usersTable.id,
            username: usersTable.username,
            nickname: usersTable.nickname,
            profileImage: usersTable.profileImage,
          },
        })
        .from(notificationsTable)
        .leftJoin(usersTable, eq(notificationsTable.fromUserId, usersTable.id))
        .where(and(
          eq(notificationsTable.userId, session.user.id),
          eq(notificationsTable.isRead, 0)
        ))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
    } else {
      finalQuery = query
    }

    const notifications = await finalQuery

    // Get unread count
    const unreadCountResult = await db
      .select({ count: count() })
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.userId, session.user.id),
        eq(notificationsTable.isRead, 0)
      ))

    console.log(`✅ Retrieved ${notifications.length} notifications`)
    console.log(`Unread count: ${unreadCountResult[0]?.count || 0}`)

    return NextResponse.json({
      notifications,
      unreadCount: unreadCountResult[0]?.count || 0,
    })
  } catch (error) {
    console.error("❌ NOTIFICATIONS GET API ERROR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, fromUserId, type, title, message, postId, inviteRequestId } = body

    console.log("Creating notification:", {
      userId,
      fromUserId,
      type,
      title,
      postId,
      inviteRequestId
    })

    const notification = await db
      .insert(notificationsTable)
      .values({
        userId,
        fromUserId,
        type,
        title,
        message,
        postId,
        inviteRequestId,
      })
      .returning()

    console.log("✅ Notification created:", notification[0].id)

    return NextResponse.json(notification[0])
  } catch (error) {
    console.error("❌ NOTIFICATIONS POST API ERROR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}