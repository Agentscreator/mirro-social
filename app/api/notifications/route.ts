import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable, usersTable } from "@/src/db/schema"
import { eq, desc, count } from "drizzle-orm"

// GET - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    console.log("=== NOTIFICATIONS GET API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("Unauthorized: No session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const onlyUnread = searchParams.get("unread") === "true"

    console.log("Fetching notifications for user:", session.user.id)
    console.log("Limit:", limit, "Only unread:", onlyUnread)

    // Build the query
    let query = db
      .select({
        id: notificationsTable.id,
        type: notificationsTable.type,
        title: notificationsTable.title,
        message: notificationsTable.message,
        postId: notificationsTable.postId,
        inviteRequestId: notificationsTable.inviteRequestId,
        locationRequestId: notificationsTable.locationRequestId,
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

    if (onlyUnread) {
      query = query.where(eq(notificationsTable.isRead, 0))
    }

    const finalQuery = query
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit)

    console.log("Query:", finalQuery.toSQL())

    const notifications = await finalQuery

    // Get unread count
    const unreadCountResult = await db
      .select({ count: count() })
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, session.user.id))
      .where(eq(notificationsTable.isRead, 0))

    const unreadCount = unreadCountResult[0]?.count || 0

    console.log(`✅ Successfully fetched ${notifications.length} notifications`)
    console.log("Unread count:", unreadCount)

    return NextResponse.json({
      notifications,
      unreadCount,
    })

  } catch (error) {
    console.error("❌ NOTIFICATIONS GET API ERROR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}