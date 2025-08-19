import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { liveEventsTable, liveEventParticipantsTable } from "@/src/db/schema"
import { eq, and, sql } from "drizzle-orm"

// POST - Join live event
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

    // Get the event details
    const [event] = await db
      .select()
      .from(liveEventsTable)
      .where(eq(liveEventsTable.id, eventId))

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check if event is full
    if (event.currentParticipants >= (event.maxParticipants || 50)) {
      return NextResponse.json({ error: "Event is full" }, { status: 400 })
    }

    // Check if user is already participating
    const [existingParticipation] = await db
      .select()
      .from(liveEventParticipantsTable)
      .where(
        and(
          eq(liveEventParticipantsTable.eventId, eventId),
          eq(liveEventParticipantsTable.userId, session.user.id),
          sql`${liveEventParticipantsTable.leftAt} IS NULL`
        )
      )

    if (existingParticipation) {
      return NextResponse.json({ error: "Already participating in this event" }, { status: 400 })
    }

    // Add participant
    await db.insert(liveEventParticipantsTable).values({
      eventId,
      userId: session.user.id,
    })

    // Increment participant count
    await db
      .update(liveEventsTable)
      .set({
        currentParticipants: sql`${liveEventsTable.currentParticipants} + 1`,
      })
      .where(eq(liveEventsTable.id, eventId))

    return NextResponse.json({
      success: true,
      message: "Successfully joined the event",
    })
  } catch (error) {
    console.error("Join event API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}