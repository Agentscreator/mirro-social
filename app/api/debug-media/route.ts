import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, usersTable } from "@/src/db/schema"
import { desc, eq, sql } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the latest 10 posts with media
    const posts = await db
      .select({
        id: postsTable.id,
        content: postsTable.content,
        image: postsTable.image,
        video: postsTable.video,
        createdAt: postsTable.createdAt,
        user: {
          username: usersTable.username,
        }
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(
        sql`(${postsTable.image} IS NOT NULL OR ${postsTable.video} IS NOT NULL)`
      )
      .orderBy(desc(postsTable.id))
      .limit(10)

    console.log("=== MEDIA DEBUG ===")
    posts.forEach(post => {
      console.log(`Post ${post.id}:`)
      console.log(`  Image: ${post.image}`)
      console.log(`  Video: ${post.video}`)
      console.log(`  User: ${post.user?.username}`)
      console.log(`  Created: ${post.createdAt}`)
      console.log("---")
    })

    return NextResponse.json({
      posts,
      summary: {
        total: posts.length,
        withImage: posts.filter(p => p.image).length,
        withVideo: posts.filter(p => p.video).length,
        imageUrls: posts.filter(p => p.image).map(p => p.image),
        videoUrls: posts.filter(p => p.video).map(p => p.video),
      }
    })
  } catch (error) {
    console.error("Debug media error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}