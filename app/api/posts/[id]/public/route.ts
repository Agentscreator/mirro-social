import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, usersTable, postLikesTable, postCommentsTable } from "@/src/db/schema"
import { eq, count, and } from "drizzle-orm"

// GET - Fetch a single post for public viewing (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = Number.parseInt(id)

    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    // Get the post with user info
    const postResult = await db
      .select({
        id: postsTable.id,
        userId: postsTable.userId,
        content: postsTable.content,
        image: postsTable.image,
        video: postsTable.video,
        createdAt: postsTable.createdAt,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const post = postResult[0]

    // Get like count and comment count
    const [likeCountResult, commentCountResult] = await Promise.all([
      db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, postId)),
      db.select({ count: count() }).from(postCommentsTable).where(eq(postCommentsTable.postId, postId)),
    ])

    // Check if current user (if authenticated) has liked the post
    const session = await getServerSession(authOptions)
    let isLiked = false
    
    if (session?.user?.id) {
      const userLikeResult = await db
        .select()
        .from(postLikesTable)
        .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, session.user.id)))
        .limit(1)
      
      isLiked = userLikeResult.length > 0
    }

    const postWithStats = {
      ...post,
      likes: likeCountResult[0]?.count || 0,
      comments: commentCountResult[0]?.count || 0,
      isLiked,
    }

    return NextResponse.json({ post: postWithStats })
  } catch (error) {
    console.error("Error fetching public post:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}