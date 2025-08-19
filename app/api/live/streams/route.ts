import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { liveStreamsTable, usersTable } from "@/src/db/schema"
import { desc, eq, sql } from "drizzle-orm"

// GET - Fetch active live streams
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get live streams that are currently active
    const streams = await db
      .select({
        id: liveStreamsTable.id,
        title: liveStreamsTable.title,
        description: liveStreamsTable.description,
        thumbnailUrl: liveStreamsTable.thumbnailUrl,
        viewerCount: liveStreamsTable.viewerCount,
        category: liveStreamsTable.category,
        startedAt: liveStreamsTable.startedAt,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
      })
      .from(liveStreamsTable)
      .leftJoin(usersTable, eq(liveStreamsTable.userId, usersTable.id))
      .where(
        sql`${liveStreamsTable.isLive} = 1 AND ${liveStreamsTable.isPrivate} = 0`
      )
      .orderBy(desc(liveStreamsTable.viewerCount))
      .limit(20)

    return NextResponse.json({
      streams,
    })
  } catch (error) {
    console.error("Live streams API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new live stream
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
      category, 
      isPrivate = false,
      tags 
    } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Generate a unique stream key
    const streamKey = `stream_${session.user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create the live stream
    const [newStream] = await db
      .insert(liveStreamsTable)
      .values({
        userId: session.user.id,
        title,
        description,
        streamKey,
        category,
        isPrivate: isPrivate ? 1 : 0,
        tags: tags ? JSON.stringify(tags) : null,
      })
      .returning()

    return NextResponse.json({
      stream: newStream,
    })
  } catch (error) {
    console.error("Create live stream API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}