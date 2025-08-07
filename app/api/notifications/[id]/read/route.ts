import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Mark a notification as read
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const notificationId = parseInt(id)

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 })
    }

    // Update the notification to mark as read
    const result = await db
      .update(notificationsTable)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, session.user.id)
        )
      )
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Notification marked as read" })

  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}