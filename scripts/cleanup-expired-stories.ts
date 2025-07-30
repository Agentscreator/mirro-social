import { db } from "@/src/db"
import { storiesTable, storyViewsTable } from "@/src/db/schema"
import { lt, eq } from "drizzle-orm" // Added eq import
import { unlink } from "fs/promises"
import { join } from "path"

// This script should be run periodically (e.g., via cron job) to clean up expired stories
export async function cleanupExpiredStories() {
  try {
    console.log("Starting cleanup of expired stories...")

    const now = new Date()

    // Get expired stories with their file paths
    const expiredStories = await db.select().from(storiesTable).where(lt(storiesTable.expiresAt, now))

    console.log(`Found ${expiredStories.length} expired stories`)

    if (expiredStories.length === 0) {
      console.log("No expired stories to clean up")
      return
    }

    // Delete story views for expired stories
    const expiredStoryIds = expiredStories.map((story) => story.id)

    for (const storyId of expiredStoryIds) {
      await db.delete(storyViewsTable).where(eq(storyViewsTable.storyId, storyId)) // Fixed undeclared variable error
    }

    // Delete expired stories from database
    await db.delete(storiesTable).where(lt(storiesTable.expiresAt, now))

    // Delete associated files
    let filesDeleted = 0
    for (const story of expiredStories) {
      try {
        if (story.image) {
          const imagePath = join(process.cwd(), "public", story.image)
          await unlink(imagePath)
          filesDeleted++
        }
        if (story.video) {
          const videoPath = join(process.cwd(), "public", story.video)
          await unlink(videoPath)
          filesDeleted++
        }
      } catch (fileError) {
        console.warn(`Error deleting file for story ${story.id}:`, fileError)
      }
    }

    console.log(`Cleanup completed: ${expiredStories.length} stories deleted, ${filesDeleted} files removed`)
  } catch (error) {
    console.error("Error during story cleanup:", error)
    throw error
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupExpiredStories()
    .then(() => {
      console.log("Story cleanup completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Story cleanup failed:", error)
      process.exit(1)
    })
}