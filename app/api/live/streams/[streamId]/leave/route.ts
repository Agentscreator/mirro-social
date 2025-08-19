import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { liveStreamViewersTable, liveStreamsTable } from "@/src/db/schema"
import { eq, and, sql, isNull } from "drizzle-orm"

// POST - Leave live stream
export async function POST(
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

    // Find active viewing session
    const [existingViewer] = await db
      .select()
      .from(liveStreamViewersTable)
      .where(
        and(
          eq(liveStreamViewersTable.streamId, streamId),
          eq(liveStreamViewersTable.userId, session.user.id),
          isNull(liveStreamViewersTable.leftAt)
        )
      )

    if (existingViewer) {
      const now = new Date()
      const joinedAt = new Date(existingViewer.joinedAt)
      const watchTime = Math.floor((now.getTime() - joinedAt.getTime()) / 1000)

      // Update viewer record with leave time
      await db
        .update(liveStreamViewersTable)
        .set({
          leftAt: now,
          totalWatchTime: watchTime,
        })
        .where(eq(liveStreamViewersTable.id, existingViewer.id))

      // Decrement viewer count
      await db
        .update(liveStreamsTable)
        .set({
          viewerCount: sql`GREATEST(0, ${liveStreamsTable.viewerCount} - 1)`,
        })
        .where(eq(liveStreamsTable.id, streamId))
    }

    return NextResponse.json({
      success: true,
      message: "Successfully left the stream",
    })
  } catch (error) {
    console.error("Leave stream API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}