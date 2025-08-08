import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// POST - Create a test notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("=== CREATING TEST NOTIFICATION ===")
    console.log("User ID:", session.user.id)

    const notification = await db.insert(notificationsTable).values({
      userId: session.user.id,
      fromUserId: session.user.id,
      type: "test",
      title: "Test Notification",
      message: "This is a test notification to verify the system is working.",
      isRead: 0,
    }).returning()

    console.log("✅ Test notification created:", notification[0])

    // Verify it was saved
    const verify = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notification[0].id))
      .limit(1)

    console.log("✅ Verification:", verify[0] ? "Found" : "Not found")

    return NextResponse.json({
      success: true,
      notification: notification[0],
      verified: verify.length > 0
    })

  } catch (error) {
    console.error("❌ Test notification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}