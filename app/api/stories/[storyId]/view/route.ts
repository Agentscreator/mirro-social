import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { storyViewsTable, storiesTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST /api/stories/[storyId]/view - Mark story as viewed
export async function POST(request: NextRequest, { params }: { params: { storyId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const storyId = Number.parseInt(params.storyId)

    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 })
    }

    // Check if story exists and is not expired
    const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId))

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }

    if (new Date() > story.expiresAt) {
      return NextResponse.json({ error: "Story has expired" }, { status: 410 })
    }

    // Check if user has already viewed this story
    const [existingView] = await db
      .select()
      .from(storyViewsTable)
      .where(and(eq(storyViewsTable.storyId, storyId), eq(storyViewsTable.userId, userId)))

    // If not viewed yet, record the view
    if (!existingView) {
      await db.insert(storyViewsTable).values({
        storyId,
        userId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error recording story view:", error)
    return NextResponse.json({ error: "Failed to record story view" }, { status: 500 })
  }
}
