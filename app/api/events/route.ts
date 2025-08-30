import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'
import { db } from '@/src/db'
import { liveEventsTable, liveEventParticipantsTable, usersTable } from '@/src/db/schema'
import { desc, eq, sql, and, gte, count } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const userId = session.user.id
    const now = new Date()

    // Base query to get events with host information
    let query = db
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
        createdAt: liveEventsTable.createdAt,
        host: {
          id: usersTable.id,
          username: usersTable.username,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
      })
      .from(liveEventsTable)
      .leftJoin(usersTable, eq(liveEventsTable.userId, usersTable.id))

    // Apply filters based on type
    switch (type) {
      case 'upcoming':
        query = query.where(
          and(
            gte(liveEventsTable.scheduledStartTime, now),
            sql`${liveEventsTable.status} IN ('scheduled', 'live')`
          )
        )
        break
      case 'attending':
        // Get events where user is a participant
        query = query
          .leftJoin(liveEventParticipantsTable, eq(liveEventParticipantsTable.eventId, liveEventsTable.id))
          .where(
            and(
              eq(liveEventParticipantsTable.userId, userId),
              sql`${liveEventsTable.status} IN ('scheduled', 'live', 'ended')`
            )
          )
        break
      case 'hosting':
        query = query.where(eq(liveEventsTable.userId, userId))
        break
      case 'all':
      default:
        // Show all events (scheduled, live, and recently ended)
        query = query.where(
          sql`${liveEventsTable.status} IN ('scheduled', 'live', 'ended')`
        )
        break
    }

    // Execute query and get events
    const rawEvents = await query
      .orderBy(desc(liveEventsTable.scheduledStartTime))
      .limit(50)

    // For each event, check if current user is attending and get invited users
    const eventsWithAttendance = await Promise.all(
      rawEvents.map(async (event) => {
        // Check if current user is attending
        const [userParticipation] = await db
          .select()
          .from(liveEventParticipantsTable)
          .where(
            and(
              eq(liveEventParticipantsTable.eventId, event.id),
              eq(liveEventParticipantsTable.userId, userId)
            )
          )
          .limit(1)

        // Get some invited users (participants)
        const invitedUsers = await db
          .select({
            id: usersTable.id,
            username: usersTable.username,
            profileImage: usersTable.profileImage,
            image: usersTable.image,
          })
          .from(liveEventParticipantsTable)
          .leftJoin(usersTable, eq(liveEventParticipantsTable.userId, usersTable.id))
          .where(eq(liveEventParticipantsTable.eventId, event.id))
          .limit(5)

        return {
          id: event.id.toString(),
          title: event.title,
          description: event.description || '',
          date: event.scheduledStartTime?.toISOString(),
          time: event.scheduledStartTime ? 
            event.scheduledStartTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }) : undefined,
          location: event.location || undefined,
          attendees: event.currentParticipants || 0,
          maxAttendees: event.maxParticipants || undefined,
          isAttending: !!userParticipation,
          host: {
            id: event.host?.id || '',
            username: event.host?.username || 'Unknown',
            profileImage: event.host?.profileImage,
            image: event.host?.image,
          },
          invitedUsers: invitedUsers.map(user => ({
            id: user.id || '',
            username: user.username || 'Unknown',
            profileImage: user.profileImage,
            image: user.image,
          })),
        }
      })
    )

    return NextResponse.json({
      events: eventsWithAttendance,
      total: eventsWithAttendance.length
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}