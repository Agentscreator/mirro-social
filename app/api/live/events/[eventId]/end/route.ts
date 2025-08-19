import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { LiveEventService } from "@/src/lib/liveEventService"
import { db } from "@/src/db"
import { liveEventsTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// POST - Manually end live event
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const eventId = parseInt(params.eventId)
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 })
    }

    // Check if user is the event owner
    const [event] = await db
      .select()
      .from(liveEventsTable)
      .where(eq(liveEventsTable.id, eventId))

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (event.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to control this event" }, { status: 403 })
    }

    if (event.status !== "live") {
      return NextResponse.json({ error: "Event is not currently live" }, { status: 400 })
    }

    // End the event
    await LiveEventService.endEvent(eventId)

    return NextResponse.json({
      success: true,
      message: "Event ended successfully",
    })
  } catch (error) {
    console.error("End event API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}