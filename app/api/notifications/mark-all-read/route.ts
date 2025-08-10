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

    // Mark all notifications as read for this user
    await db
      .update(notificationsTable)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notificationsTable.userId, session.user.id),
          eq(notificationsTable.isRead, 0)
        )
      )

    return NextResponse.json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}