import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Mock invites data - replace with actual database queries
    const mockInvites = [
      {
        id: '1',
        title: 'Weekend Hiking Adventure',
        description: 'Join us for a scenic hike through the mountains',
        location: 'Blue Ridge Mountains',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        time: '09:00',
        createdAt: new Date().toISOString(),
        hostId: session.user.id,
        invitedUsers: ['user1', 'user2'],
        reminders: ['1 day before'],
        coordinates: { lat: 35.7796, lng: -78.6382 }
      }
    ]

    return NextResponse.json({ invites: mockInvites })
  } catch (error) {
    console.error("Error fetching invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      location,
      coordinates,
      date,
      time,
      invitedUsers,
      reminders,
      maxParticipants
    } = body

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      )
    }

    // Create invite object
    const newInvite = {
      id: Date.now().toString(), // In real app, use proper ID generation
      title,
      description,
      location,
      coordinates,
      date,
      time,
      invitedUsers: invitedUsers || [],
      reminders: reminders || [],
      maxParticipants: maxParticipants || 999999,
      hostId: session.user.id,
      createdAt: new Date().toISOString(),
      attendees: [session.user.id] // Host is automatically attending
    }

    // In a real application, you would:
    // 1. Save to database
    // 2. Send notifications to invited users
    // 3. Set up reminder notifications
    // 4. Handle location geocoding if needed

    console.log('Created invite:', newInvite)

    // Mock successful creation
    return NextResponse.json({ 
      success: true, 
      invite: newInvite,
      message: 'Invite created successfully'
    })
  } catch (error) {
    console.error("Error creating invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}