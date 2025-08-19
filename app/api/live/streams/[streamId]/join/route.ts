import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { liveStreamViewersTable, liveStreamsTable } from "@/src/db/schema"
import { eq, and, sql, isNull } from "drizzle-orm"

// POST - Join live stream as viewer
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

    // Check if user is already viewing
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

    if (!existingViewer) {
      // Add viewer
      await db.insert(liveStreamViewersTable).values({
        streamId,
        userId: session.user.id,
      })

      // Increment viewer count
      await db
        .update(liveStreamsTable)
        .set({
          viewerCount: sql`${liveStreamsTable.viewerCount} + 1`,
        })
        .where(eq(liveStreamsTable.id, streamId))
    }

    return NextResponse.json({
      success: true,
      message: "Successfully joined the stream",
    })
  } catch (error) {
    console.error("Join stream API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}