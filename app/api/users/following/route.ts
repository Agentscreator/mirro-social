import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock data for demonstration - replace with actual database queries
const mockFollowingUsers = [
  {
    id: 'user1',
    username: 'adventurer_alex',
    profileImage: null,
    image: null
  },
  {
    id: 'user2',
    username: 'hiker_jane',
    profileImage: null,
    image: null
  },
  {
    id: 'user3',
    username: 'mountain_mike',
    profileImage: null,
    image: null
  },
  {
    id: 'user4',
    username: 'dev_sarah',
    profileImage: null,
    image: null
  },
  {
    id: 'user5',
    username: 'code_ninja',
    profileImage: null,
    image: null
  },
  {
    id: 'user6',
    username: 'photo_pro',
    profileImage: null,
    image: null
  },
  {
    id: 'user7',
    username: 'music_lover',
    profileImage: null,
    image: null
  },
  {
    id: 'user8',
    username: 'foodie_friend',
    profileImage: null,
    image: null
  }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase()

    let users = mockFollowingUsers

    // Filter by search query if provided
    if (search) {
      users = users.filter(user => 
        user.username.toLowerCase().includes(search)
      )
    }

    return NextResponse.json({
      users,
      total: users.length
    })
  } catch (error) {
    console.error('Error fetching following users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}