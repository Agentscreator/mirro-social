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

    // Mark notification as read
    await db
      .update(notificationsTable)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, session.user.id)
        )
      )

    return NextResponse.json({ message: "Notification marked as read" })
  } catch (error) {
    console.error("Error marking notification as read:", error)
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

    // Delete notification
    await db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, session.user.id)
        )
      )

    return NextResponse.json({ message: "Notification deleted" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}