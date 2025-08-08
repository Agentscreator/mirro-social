import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/src/db"
import { postsTable, usersTable, postLikesTable, postCommentsTable, postSharesTable } from "@/src/db/schema"
import { eq, count } from "drizzle-orm"
import { createHash } from "crypto"

// Helper function to generate share token
export function generateShareToken(postId: number, userId: string): string {
  const data = `${postId}-${userId}-${Date.now()}`
  return createHash('sha256').update(data).digest('hex').substring(0, 32)
}

// Helper function to verify share token
function verifyShareToken(token: string, postId: number, userId: string): boolean {
  // For now, we'll accept any valid-looking token
  // In production, you might want to store tokens in the database
  return token.length === 32 && /^[a-f0-9]+$/.test(token)
}

// GET - Fetch shared post (public access)
export async function GET(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    console.log("=== SHARED POST API START ===")
    const shareId = params.shareToken // This is actually the share ID now
    
    if (!shareId) {
      console.error("Missing share ID:", shareId)
      return NextResponse.json({ error: "Invalid share link" }, { status: 400 })
    }

    console.log("Looking up shared post with ID:", shareId)

    // Find the post through the shares table using the share ID
    const sharedPost = await db
      .select({
        postId: postSharesTable.postId,
        userId: postSharesTable.userId,
        createdAt: postSharesTable.createdAt,
      })
      .from(postSharesTable)
      .where(eq(postSharesTable.id, parseInt(shareId)))
      .limit(1)

    if (sharedPost.length === 0) {
      console.error("Share not found:", shareId)
      return NextResponse.json({ error: "Shared post not found" }, { status: 404 })
    }

    const postId = sharedPost[0].postId
    console.log("Found shared post via shares table:", postId)

    // Fetch the post with user info and stats
    const post = await db
      .select({
        id: postsTable.id,
        userId: postsTable.userId,
        content: postsTable.content,
        image: postsTable.image,
        video: postsTable.video,
        duration: postsTable.duration,
        createdAt: postsTable.createdAt,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        },
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (post.length === 0) {
      console.error("Post not found:", postId)
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get like and comment counts
    const [likeCountResult, commentCountResult] = await Promise.all([
      db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, postId)),
      db.select({ count: count() }).from(postCommentsTable).where(eq(postCommentsTable.postId, postId)),
    ])

    const postWithStats = {
      ...post[0],
      likes: likeCountResult[0]?.count || 0,
      comments: commentCountResult[0]?.count || 0,
    }

    console.log("✅ Shared post found and returned:", postWithStats.id)
    console.log("=== SHARED POST API END ===")

    return NextResponse.json({ post: postWithStats })

  } catch (error) {
    console.error("❌ Shared post API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}