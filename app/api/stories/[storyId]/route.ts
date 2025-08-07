import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { storiesTable, storyViewsTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { unlink } from "fs/promises"
import { join } from "path"

// DELETE /api/stories/[storyId] - Delete a story
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { storyId: storyIdParam } = await params
    const storyId = Number.parseInt(storyIdParam)

    if (isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 })
    }

    // Get the story to check ownership and get file paths
    const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId))

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 })
    }

    // Check if user owns this story
    if (story.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete associated views first
    await db.delete(storyViewsTable).where(eq(storyViewsTable.storyId, storyId))

    // Delete the story
    await db.delete(storiesTable).where(eq(storiesTable.id, storyId))

    // Delete associated files
    try {
      if (story.image) {
        const imagePath = join(process.cwd(), "public", story.image)
        await unlink(imagePath)
      }
      if (story.video) {
        const videoPath = join(process.cwd(), "public", story.video)
        await unlink(videoPath)
      }
    } catch (fileError) {
      console.warn("Error deleting story files:", fileError)
      // Don't fail the request if file deletion fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting story:", error)
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 })
  }
}
