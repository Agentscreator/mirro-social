import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { liveStreamsTable, usersTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// GET - Fetch specific live stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const streamId = parseInt(params.streamId)
    if (isNaN(streamId)) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 })
    }

    // Get stream details
    const [stream] = await db
      .select({
        id: liveStreamsTable.id,
        title: liveStreamsTable.title,
        description: liveStreamsTable.description,
        streamUrl: liveStreamsTable.streamUrl,
        thumbnailUrl: liveStreamsTable.thumbnailUrl,
        viewerCount: liveStreamsTable.viewerCount,
        category: liveStreamsTable.category,
        startedAt: liveStreamsTable.startedAt,
        isLive: liveStreamsTable.isLive,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
      })
      .from(liveStreamsTable)
      .leftJoin(usersTable, eq(liveStreamsTable.userId, usersTable.id))
      .where(eq(liveStreamsTable.id, streamId))

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 })
    }

    // Check if stream is private and user has access
    if (stream.isLive === 0) {
      return NextResponse.json({ error: "Stream is not live" }, { status: 400 })
    }

    return NextResponse.json({
      stream,
    })
  } catch (error) {
    console.error("Get stream API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}