import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'

// Mock data for demonstration - replace with actual database queries
const mockEvents = [
  {
    id: '1',
    title: 'Weekend Hiking Adventure',
    description: 'Join us for a scenic hike through the mountains. We\'ll explore beautiful trails, enjoy nature, and have a great time together!',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
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
    description: 'Casual coding session with fellow developers. Bring your laptop and let\'s work on some projects together!',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
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
    description: 'Explore the city and capture beautiful moments. Perfect for beginners and experienced photographers alike!',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    time: '16:00',
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
  },
  {
    id: '4',
    title: 'Book Club Discussion',
    description: 'Monthly book club meeting to discuss our latest read. This month we\'re covering "The Midnight Library".',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    time: '19:00',
    location: 'Local Library',
    attendees: 15,
    maxAttendees: 25,
    isAttending: false,
    host: {
      id: 'user7',
      username: 'bookworm_betty',
      profileImage: null,
      image: null
    },
    invitedUsers: [
      { id: 'user8', username: 'reader_rick', profileImage: null, image: null },
      { id: 'user9', username: 'novel_nancy', profileImage: null, image: null }
    ]
  },
  {
    id: '5',
    title: 'Yoga in the Park',
    description: 'Start your weekend with a relaxing yoga session in the park. All levels welcome!',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    time: '08:00',
    location: 'Central Park',
    attendees: 20,
    maxAttendees: 30,
    isAttending: true,
    host: {
      id: 'user10',
      username: 'zen_master',
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const userId = session.user.id

    let filteredEvents = [...mockEvents]

    // Filter based on type
    switch (type) {
      case 'upcoming':
        const now = new Date()
        filteredEvents = filteredEvents.filter(event => 
          event.date && new Date(event.date) > now
        )
        break
      case 'attending':
        filteredEvents = filteredEvents.filter(event => event.isAttending)
        break
      case 'hosting':
        filteredEvents = filteredEvents.filter(event => event.host.id === userId)
        break
      case 'all':
      default:
        // Show all events
        break
    }

    // Sort by date (upcoming first, then by date)
    filteredEvents.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    return NextResponse.json({
      events: filteredEvents,
      total: filteredEvents.length
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}