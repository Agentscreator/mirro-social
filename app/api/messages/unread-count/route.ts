import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { messagesTable } from "@/src/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total unread message count
    const result = await db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.receiverId, session.user.id),
          eq(messagesTable.isRead, 0)
        )
      )

    const unreadCount = result[0]?.count || 0

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}