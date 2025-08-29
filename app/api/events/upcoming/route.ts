import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'

// Mock data for demonstration - replace with actual database queries
const mockEvents = [
  {
    id: '1',
    title: 'Weekend Hiking Adventure',
    description: 'Join us for a scenic hike through the mountains',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    time: '09:00',
    location: 'Blue Ridge Mountains',
    attendees: 12,
    maxAttendees: 20,
    isAttending: true,
    host: {
      id: 'user1',
      username: 'adventurer_alex',
      profileImage: null,
      image: null
    },
    invitedUsers: [
      { id: 'user2', username: 'hiker_jane', profileImage: null, image: null },
      { id: 'user3', username: 'mountain_mike', profileImage: null, image: null }
    ]
  },
  {
    id: '2',
    title: 'Coffee & Code Meetup',
    description: 'Casual coding session with fellow developers',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    time: '14:00',
    location: 'Downtown Coffee Shop',
    attendees: 8,
    maxAttendees: 15,
    isAttending: false,
    host: {
      id: 'user4',
      username: 'dev_sarah',
      profileImage: null,
      image: null
    },
    invitedUsers: [
      { id: 'user5', username: 'code_ninja', profileImage: null, image: null }
    ]
  },
  {
    id: '3',
    title: 'Photography Walk',
    description: 'Explore the city and capture beautiful moments',
    date: null, // No specific date set
    time: null,
    location: 'City Center',
    attendees: 5,
    maxAttendees: 999999,
    isAttending: true,
    host: {
      id: 'user6',
      username: 'photo_pro',
      profileImage: null,
      image: null
    },
    invitedUsers: []
  }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Filter events to show upcoming ones first, then undated ones
    const now = new Date()
    const upcomingEvents = mockEvents
      .filter(event => !event.date || new Date(event.date) > now)
      .sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })

    return NextResponse.json({
      events: upcomingEvents,
      total: upcomingEvents.length
    })
  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}