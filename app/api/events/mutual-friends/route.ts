import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  followersTable, 
  usersTable, 
  liveEventsTable, 
  liveEventParticipantsTable 
} from "@/src/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get mutual friends (people who follow you AND you follow them back)
    const mutualFriends = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        profileImage: usersTable.profileImage,
        image: usersTable.image,
      })
      .from(usersTable)
      .innerJoin(
        followersTable, 
        eq(followersTable.followingId, usersTable.id)
      )
      .where(
        and(
          eq(followersTable.followerId, userId),
          // Check if they also follow you back
          sql`EXISTS (
            SELECT 1 FROM ${followersTable} f2 
            WHERE f2.follower_id = ${usersTable.id} 
            AND f2.following_id = ${userId}
          )`
        )
      )

    console.log(`Found ${mutualFriends.length} mutual friends for user ${userId}`)

    // Get upcoming events for each mutual friend
    const friendsWithEvents = await Promise.all(
      mutualFriends.map(async (friend) => {
        // Get events where the friend is the host
        const hostedEvents = await db
          .select({
            id: liveEventsTable.id,
            title: liveEventsTable.title,
            description: liveEventsTable.description,
            date: liveEventsTable.date,
            time: liveEventsTable.time,
            location: liveEventsTable.location,
            maxAttendees: liveEventsTable.maxAttendees,
            hostId: liveEventsTable.hostId,
          })
          .from(liveEventsTable)
          .where(
            and(
              eq(liveEventsTable.hostId, friend.id),
              gte(liveEventsTable.date, new Date().toISOString().split('T')[0]) // Only future events
            )
          )
          .orderBy(liveEventsTable.date)

        // Get events where the friend is attending (but not hosting)
        const attendingEvents = await db
          .select({
            id: liveEventsTable.id,
            title: liveEventsTable.title,
            description: liveEventsTable.description,
            date: liveEventsTable.date,
            time: liveEventsTable.time,
            location: liveEventsTable.location,
            maxAttendees: liveEventsTable.maxAttendees,
            hostId: liveEventsTable.hostId,
          })
          .from(liveEventsTable)
          .innerJoin(
            liveEventParticipantsTable,
            eq(liveEventParticipantsTable.eventId, liveEventsTable.id)
          )
          .where(
            and(
              eq(liveEventParticipantsTable.userId, friend.id),
              gte(liveEventsTable.date, new Date().toISOString().split('T')[0]),
              // Don't include events they're hosting (already got those)
              sql`${liveEventsTable.hostId} != ${friend.id}`
            )
          )
          .orderBy(liveEventsTable.date)

        // Get attendee counts for all events
        const allEventIds = [...hostedEvents, ...attendingEvents].map(e => e.id)
        const attendeeCounts = await Promise.all(
          allEventIds.map(async (eventId) => {
            const count = await db
              .select({ count: sql<number>`count(*)` })
              .from(liveEventParticipantsTable)
              .where(eq(liveEventParticipantsTable.eventId, eventId))
            
            return { eventId, count: count[0]?.count || 0 }
          })
        )

        const attendeeCountMap = new Map(
          attendeeCounts.map(({ eventId, count }) => [eventId, count])
        )

        // Combine and format events
        const allEvents = [...hostedEvents, ...attendingEvents].map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          attendees: attendeeCountMap.get(event.id) || 0,
          maxAttendees: event.maxAttendees,
          isAttending: true, // They're either hosting or attending
          host: {
            id: event.hostId,
            username: event.hostId === friend.id ? friend.username : 'Unknown',
            profileImage: event.hostId === friend.id ? friend.profileImage : null,
            image: event.hostId === friend.id ? friend.image : null,
          }
        }))

        // Remove duplicates and sort by date
        const uniqueEvents = allEvents.filter((event, index, self) => 
          index === self.findIndex(e => e.id === event.id)
        ).sort((a, b) => {
          if (!a.date || !b.date) return 0
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })

        return {
          id: friend.id,
          username: friend.username,
          nickname: friend.nickname,
          profileImage: friend.profileImage,
          image: friend.image,
          events: uniqueEvents,
          isOnline: Math.random() > 0.7, // Placeholder - you can implement real online status later
        }
      })
    )

    // Filter out friends with no upcoming events
    const friendsWithUpcomingEvents = friendsWithEvents.filter(friend => friend.events.length > 0)

    const totalEvents = friendsWithUpcomingEvents.reduce((sum, friend) => sum + friend.events.length, 0)

    console.log(`Returning ${friendsWithUpcomingEvents.length} friends with ${totalEvents} total events`)

    return NextResponse.json({
      friends: friendsWithUpcomingEvents,
      totalEvents,
    })

  } catch (error) {
    console.error("Error fetching mutual friends events:", error)
    return NextResponse.json(
      { error: "Failed to fetch mutual friends events" },
      { status: 500 }
    )
  }
}