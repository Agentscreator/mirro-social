import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { storyViewsTable, storiesTable, groupStoryViewsTable, groupStoriesTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST /api/stories/[storyId]/view - Mark story as viewed
export async function POST(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { storyId: storyIdParam } = await params
    
    // Handle group stories (prefixed with "group_")
    if (storyIdParam.startsWith("group_")) {
      const groupStoryId = Number.parseInt(storyIdParam.replace("group_", ""))
      
      if (isNaN(groupStoryId)) {
        return NextResponse.json({ error: "Invalid group story ID" }, { status: 400 })
      }

      // Check if group story exists and is not expired
      const [groupStory] = await db.select().from(groupStoriesTable).where(eq(groupStoriesTable.id, groupStoryId))

      if (!groupStory) {
        return NextResponse.json({ error: "Group story not found" }, { status: 404 })
      }

      if (new Date() > groupStory.expiresAt) {
        return NextResponse.json({ error: "Group story has expired" }, { status: 410 })
      }

      // Check if user has already viewed this group story
      const [existingView] = await db
        .select()
        .from(groupStoryViewsTable)
        .where(and(eq(groupStoryViewsTable.storyId, groupStoryId), eq(groupStoryViewsTable.userId, userId)))

      // If not viewed yet, record the view
      if (!existingView) {
        await db.insert(groupStoryViewsTable).values({
          storyId: groupStoryId,
          userId,
        })
      }

      return NextResponse.json({ success: true })
    }

    // Handle regular stories
    const storyId = Number.parseInt(storyIdParam)

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
