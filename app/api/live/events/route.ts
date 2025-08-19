import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { liveEventsTable, usersTable } from "@/src/db/schema"
import { desc, eq, sql, and, gte } from "drizzle-orm"

// GET - Fetch active live events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    // Get live events that are currently active or scheduled to start soon
    const events = await db
      .select({
        id: liveEventsTable.id,
        title: liveEventsTable.title,
        description: liveEventsTable.description,
        scheduledStartTime: liveEventsTable.scheduledStartTime,
        scheduledEndTime: liveEventsTable.scheduledEndTime,
        status: liveEventsTable.status,
        currentParticipants: liveEventsTable.currentParticipants,
        maxParticipants: liveEventsTable.maxParticipants,
        location: liveEventsTable.location,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
      })
      .from(liveEventsTable)
      .leftJoin(usersTable, eq(liveEventsTable.userId, usersTable.id))
      .where(
        and(
          // Only show events that are live or scheduled to start within the next 24 hours
          gte(liveEventsTable.scheduledStartTime, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
          sql`${liveEventsTable.status} IN ('scheduled', 'live')`
        )
      )
      .orderBy(desc(liveEventsTable.scheduledStartTime))
      .limit(20)

    return NextResponse.json({
      events,
    })
  } catch (error) {
    console.error("Live events API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new live event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      postId, 
      title, 
      description, 
      scheduledStartTime, 
      scheduledEndTime, 
      maxParticipants, 
      location, 
      latitude, 
      longitude 
    } = body

    // Validate required fields
    if (!postId || !title || !scheduledStartTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create the live event
    const [newEvent] = await db
      .insert(liveEventsTable)
      .values({
        postId,
        userId: session.user.id,
        title,
        description,
        scheduledStartTime: new Date(scheduledStartTime),
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
        maxParticipants,
        location,
        latitude,
        longitude,
      })
      .returning()

    return NextResponse.json({
      event: newEvent,
    })
  } catch (error) {
    console.error("Create live event API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}