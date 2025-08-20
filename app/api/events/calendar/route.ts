import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, usersTable, postInvitesTable, postInviteParticipantsTable, postLocationsTable } from "@/src/db/schema"
import { eq, or, and, gte } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    console.log("=== EVENTS CALENDAR API START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("Fetching calendar events for user:", userId)

    // Get all posts that are either:
    // 1. Created by the user (scheduled or live with timing)
    // 2. User is a participant in
    
    // First, get posts created by user that have timing
    const userCreatedEvents = await db
      .select({
        id: postsTable.id,
        content: postsTable.content,
        publishTime: postsTable.publishTime,
        expiryTime: postsTable.expiryTime,
        status: postsTable.status,
        userId: postsTable.userId,
      })
      .from(postsTable)
      .where(
        and(
          eq(postsTable.userId, userId),
          or(
            eq(postsTable.status, "scheduled"),
            and(
              eq(postsTable.status, "live"),
              // Only include live posts that have explicit timing (publishTime is not null)
              // This excludes immediate posts without scheduling
            )
          )
        )
      )

    // Get posts where user is a participant
    const participantEvents = await db
      .select({
        id: postsTable.id,
        content: postsTable.content,
        publishTime: postsTable.publishTime,
        expiryTime: postsTable.expiryTime,
        status: postsTable.status,
        userId: postsTable.userId,
      })
      .from(postsTable)
      .innerJoin(postInvitesTable, eq(postsTable.id, postInvitesTable.postId))
      .innerJoin(postInviteParticipantsTable, eq(postInvitesTable.id, postInviteParticipantsTable.inviteId))
      .where(
        and(
          eq(postInviteParticipantsTable.userId, userId),
          or(
            eq(postsTable.status, "scheduled"),
            eq(postsTable.status, "live")
          )
        )
      )

    // Combine and deduplicate events
    const allEventIds = new Set()
    const combinedEvents = []

    // Add user created events
    for (const event of userCreatedEvents) {
      if (!allEventIds.has(event.id)) {
        allEventIds.add(event.id)
        combinedEvents.push({
          ...event,
          isCreator: true,
          isParticipant: false,
        })
      }
    }

    // Add participant events
    for (const event of participantEvents) {
      if (!allEventIds.has(event.id)) {
        allEventIds.add(event.id)
        combinedEvents.push({
          ...event,
          isCreator: false,
          isParticipant: true,
        })
      } else {
        // Update existing event to mark as participant too
        const existingEvent = combinedEvents.find(e => e.id === event.id)
        if (existingEvent) {
          existingEvent.isParticipant = true
        }
      }
    }

    // Get location data for events
    const eventsWithDetails = await Promise.all(
      combinedEvents.map(async (event) => {
        // Get location if available
        const location = await db
          .select({
            locationName: postLocationsTable.locationName,
          })
          .from(postLocationsTable)
          .where(eq(postLocationsTable.postId, event.id))
          .limit(1)

        // Get participant count if it's an invite
        const participantCount = await db
          .select()
          .from(postInviteParticipantsTable)
          .innerJoin(postInvitesTable, eq(postInviteParticipantsTable.inviteId, postInvitesTable.id))
          .where(eq(postInvitesTable.postId, event.id))

        return {
          id: event.id,
          title: event.content?.substring(0, 50) || "Event",
          content: event.content || "",
          publishTime: event.publishTime?.toISOString() || "",
          expiryTime: event.expiryTime?.toISOString() || null,
          location: location[0]?.locationName || null,
          participantCount: participantCount.length,
          isCreator: event.isCreator,
          isParticipant: event.isParticipant,
        }
      })
    )

    // Filter out events without publishTime (immediate posts)
    const filteredEvents = eventsWithDetails.filter(event => event.publishTime)

    console.log(`✅ Found ${filteredEvents.length} calendar events for user`)

    return NextResponse.json({
      events: filteredEvents,
      success: true,
    })

  } catch (error) {
    console.error("❌ EVENTS CALENDAR API ERROR:", error)
    return NextResponse.json({ 
      error: "Failed to fetch calendar events",
      events: [],
    }, { status: 500 })
  }
}