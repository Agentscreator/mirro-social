import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Marking all notifications as read for user:", session.user.id)

    const updatedNotifications = await db
      .update(notificationsTable)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notificationsTable.userId, session.user.id),
          eq(notificationsTable.isRead, 0)
        )
      )
      .returning()

    console.log(`✅ Marked ${updatedNotifications.length} notifications as read`)

    return NextResponse.json({
      message: "All notifications marked as read",
      count: updatedNotifications.length,
    })
  } catch (error) {
    console.error("❌ MARK ALL NOTIFICATIONS READ ERROR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}