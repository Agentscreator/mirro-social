import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/src/lib/auth'
import { db } from '@/src/db'
import { savedProfilesTable, usersTable } from '@/src/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userSavedProfiles = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        image: usersTable.image,
        profileImage: usersTable.profileImage,
      })
      .from(savedProfilesTable)
      .innerJoin(usersTable, eq(savedProfilesTable.savedUserId, usersTable.id))
      .where(eq(savedProfilesTable.userId, session.user.id))

    return NextResponse.json({ savedProfiles: userSavedProfiles })
  } catch (error) {
    console.error('Error fetching saved profiles:', error)
    return NextResponse.json({ error: 'Failed to fetch saved profiles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/users/saved called')
  try {
    const session = await auth()
    console.log('Session:', session)
    if (!session?.user?.id) {
      console.log('No session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    const { savedUserId } = body

    if (!savedUserId) {
      console.log('No savedUserId provided')
      return NextResponse.json({ error: 'savedUserId is required' }, { status: 400 })
    }

    // Check if already saved
    const existing = await db
      .select()
      .from(savedProfilesTable)
      .where(
        and(
          eq(savedProfilesTable.userId, session.user.id),
          eq(savedProfilesTable.savedUserId, savedUserId)
        )
      )

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Profile already saved' }, { status: 200 })
    }

    // Save the profile
    await db.insert(savedProfilesTable).values({
      userId: session.user.id,
      savedUserId,
      createdAt: new Date(),
    })

    return NextResponse.json({ message: 'Profile saved successfully' })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const savedUserId = searchParams.get('savedUserId')

    if (!savedUserId) {
      return NextResponse.json({ error: 'savedUserId is required' }, { status: 400 })
    }

    // Remove the saved profile
    await db
      .delete(savedProfilesTable)
      .where(
        and(
          eq(savedProfilesTable.userId, session.user.id),
          eq(savedProfilesTable.savedUserId, savedUserId)
        )
      )

    return NextResponse.json({ message: 'Profile unsaved successfully' })
  } catch (error) {
    console.error('Error unsaving profile:', error)
    return NextResponse.json({ error: 'Failed to unsave profile' }, { status: 500 })
  }
}