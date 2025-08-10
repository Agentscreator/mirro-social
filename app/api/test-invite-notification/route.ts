import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { notificationsTable } from "@/src/db/schema"

// POST - Create a test notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create a test notification
    const testNotification = await db
      .insert(notificationsTable)
      .values({
        userId: session.user.id,
        fromUserId: session.user.id,
        type: "test_notification",
        title: "Test Notification",
        message: "This is a test notification to verify the system is working.",
        data: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
        actionUrl: "/messages",
      })
      .returning()

    return NextResponse.json({
      message: "Test notification created successfully",
      notification: testNotification[0],
    })
  } catch (error) {
    console.error("Error creating test notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}