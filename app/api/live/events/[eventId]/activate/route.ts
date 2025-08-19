import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { LiveEventService } from "@/src/lib/liveEventService"
import { db } from "@/src/db"
import { liveEventsTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// POST - Manually activate live event
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

    if (event.status === "live") {
      return NextResponse.json({ error: "Event is already live" }, { status: 400 })
    }

    if (event.status === "ended" || event.status === "cancelled") {
      return NextResponse.json({ error: "Cannot activate ended or cancelled event" }, { status: 400 })
    }

    // Activate the event
    await LiveEventService.activateEvent(eventId)

    return NextResponse.json({
      success: true,
      message: "Event activated successfully",
    })
  } catch (error) {
    console.error("Activate event API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}