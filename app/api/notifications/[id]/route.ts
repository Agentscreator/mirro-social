import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// PUT - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const notificationId = parseInt(id)
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 })
    }

    console.log("Marking notification as read:", notificationId)

    const updatedNotification = await db
      .update(notificationsTable)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, session.user.id)
        )
      )
      .returning()

    if (updatedNotification.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    console.log("✅ Notification marked as read")

    return NextResponse.json(updatedNotification[0])
  } catch (error) {
    console.error("❌ MARK NOTIFICATION READ ERROR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const notificationId = parseInt(id)
    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 })
    }

    console.log("Deleting notification:", notificationId)

    const deletedNotification = await db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, session.user.id)
        )
      )
      .returning()

    if (deletedNotification.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    console.log("✅ Notification deleted")

    return NextResponse.json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("❌ DELETE NOTIFICATION ERROR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}