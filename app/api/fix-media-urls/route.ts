import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable } from "@/src/db/schema"
import { sql, eq } from "drizzle-orm"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔧 Starting media URL cleanup...")

    // Find posts with potentially broken URLs
    const postsWithMedia = await db
      .select({
        id: postsTable.id,
        image: postsTable.image,
        video: postsTable.video,
      })
      .from(postsTable)
      .where(
        sql`(${postsTable.image} IS NOT NULL OR ${postsTable.video} IS NOT NULL)`
      )

    const results = {
      total: postsWithMedia.length,
      vercelUrls: 0,
      nonVercelUrls: 0,
      invalidUrls: 0,
      fixed: 0,
      errors: [] as string[]
    }

    for (const post of postsWithMedia) {
      const imageUrl = post.image
      const videoUrl = post.video

      // Check image URL
      if (imageUrl) {
        if (imageUrl.includes('vercel-storage.com') || imageUrl.includes('blob.vercel-storage.com')) {
          results.vercelUrls++
        } else {
          results.nonVercelUrls++
          console.log(`❌ Non-Vercel image URL in post ${post.id}: ${imageUrl}`)
          
          // Set to null for now - you can replace with a default image if needed
          try {
            await db
              .update(postsTable)
              .set({ image: null })
              .where(eq(postsTable.id, post.id))
            results.fixed++
          } catch (error) {
            results.errors.push(`Failed to fix post ${post.id}: ${error}`)
          }
        }
      }

      // Check video URL
      if (videoUrl) {
        if (videoUrl.includes('vercel-storage.com') || videoUrl.includes('blob.vercel-storage.com')) {
          results.vercelUrls++
        } else {
          results.nonVercelUrls++
          console.log(`❌ Non-Vercel video URL in post ${post.id}: ${videoUrl}`)
          
          // Set to null for now - you can replace with a default video if needed
          try {
            await db
              .update(postsTable)
              .set({ video: null })
              .where(eq(postsTable.id, post.id))
            results.fixed++
          } catch (error) {
            results.errors.push(`Failed to fix post ${post.id}: ${error}`)
          }
        }
      }
    }

    console.log("✅ Media URL cleanup completed:", results)
    return NextResponse.json(results)
  } catch (error) {
    console.error("Fix media URLs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}