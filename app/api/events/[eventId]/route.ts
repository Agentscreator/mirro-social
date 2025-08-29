import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'

// Mock data - same as in the main events route
const mockEvents = [
  {
    id: '1',
    title: 'Weekend Hiking Adventure',
    description: 'Join us for a scenic hike through the mountains. We\'ll explore beautiful trails, enjoy nature, and have a great time together! This is a moderate difficulty hike suitable for most fitness levels. We\'ll provide water and snacks, but please bring your own hiking boots and weather-appropriate clothing.',
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
    ],
    attendeesList: [
      { id: 'user1', username: 'adventurer_alex', profileImage: null, image: null },
      { id: 'user2', username: 'hiker_jane', profileImage: null, image: null },
      { id: 'user3', username: 'mountain_mike', profileImage: null, image: null },
      { id: 'user11', username: 'trail_runner', profileImage: null, image: null },
      { id: 'user12', username: 'nature_lover', profileImage: null, image: null }
    ]
  },
  {
    id: '2',
    title: 'Coffee & Code Meetup',
    description: 'Casual coding session with fellow developers. Bring your laptop and let\'s work on some projects together! We\'ll have WiFi, power outlets, and great coffee. Whether you\'re working on personal projects, learning new technologies, or just want to code in good company, you\'re welcome to join us.',
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
    ],
    attendeesList: [
      { id: 'user4', username: 'dev_sarah', profileImage: null, image: null },
      { id: 'user5', username: 'code_ninja', profileImage: null, image: null },
      { id: 'user13', username: 'js_developer', profileImage: null, image: null },
      { id: 'user14', username: 'python_pro', profileImage: null, image: null }
    ]
  },
  {
    id: '3',
    title: 'Photography Walk',
    description: 'Explore the city and capture beautiful moments. Perfect for beginners and experienced photographers alike! We\'ll walk through the most photogenic spots in the city center, sharing tips and techniques along the way. Bring your camera (phone cameras are perfectly fine too!) and let\'s create some amazing shots together.',
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
    invitedUsers: [],
    attendeesList: [
      { id: 'user6', username: 'photo_pro', profileImage: null, image: null },
      { id: 'user15', username: 'camera_enthusiast', profileImage: null, image: null },
      { id: 'user16', username: 'street_photographer', profileImage: null, image: null }
    ]
  },
  {
    id: '4',
    title: 'Book Club Discussion',
    description: 'Monthly book club meeting to discuss our latest read. This month we\'re covering "The Midnight Library" by Matt Haig. Come prepared to discuss the themes of regret, possibility, and the infinite ways our lives could unfold. Light refreshments will be provided.',
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
    ],
    attendeesList: [
      { id: 'user7', username: 'bookworm_betty', profileImage: null, image: null },
      { id: 'user8', username: 'reader_rick', profileImage: null, image: null },
      { id: 'user9', username: 'novel_nancy', profileImage: null, image: null },
      { id: 'user17', username: 'literature_lover', profileImage: null, image: null }
    ]
  },
  {
    id: '5',
    title: 'Yoga in the Park',
    description: 'Start your weekend with a relaxing yoga session in the park. All levels welcome! We\'ll practice gentle flows and breathing exercises in the beautiful outdoor setting. Please bring your own yoga mat and water bottle. The session will be adapted for all skill levels, so don\'t worry if you\'re a beginner.',
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
    invitedUsers: [],
    attendeesList: [
      { id: 'user10', username: 'zen_master', profileImage: null, image: null },
      { id: 'user18', username: 'yoga_enthusiast', profileImage: null, image: null },
      { id: 'user19', username: 'mindful_mover', profileImage: null, image: null },
      { id: 'user20', username: 'peaceful_soul', profileImage: null, image: null }
    ]
  }
]

interface EventPageProps {
  params: {
    eventId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: EventPageProps
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = params
    const event = mockEvents.find(e => e.id === eventId)

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({
      event,
      success: true
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}