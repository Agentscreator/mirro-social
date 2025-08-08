import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, postSharesTable, usersTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { createHash } from "crypto"

// Helper function to generate share token
function generateShareToken(postId: number, userId: string): string {
  const data = `${postId}-${userId}-${Date.now()}-${Math.random()}`
  return createHash('sha256').update(data).digest('hex').substring(0, 32)
}

// POST - Create a share link for a post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("=== POST SHARE API START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const postId = parseInt(params.id)
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    console.log("Creating share link for post:", postId, "by user:", session.user.id)

    // Verify the post exists
    const post = await db
      .select({
        id: postsTable.id,
        userId: postsTable.userId,
        content: postsTable.content,
        user: {
          username: usersTable.username,
          nickname: usersTable.nickname,
        },
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Generate a unique share token
    const shareToken = generateShareToken(postId, session.user.id)

    // Create share record
    const shareRecord = await db
      .insert(postSharesTable)
      .values({
        postId,
        userId: session.user.id,
      })
      .returning()

    console.log("✅ Share record created:", shareRecord[0])

    // Create the share URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/posts/shared/${shareRecord[0].id}`

    // Prepare share data
    const userDisplayName = post[0].user?.nickname || post[0].user?.username || "Someone"
    const shareData = {
      url: shareUrl,
      title: `Check out this post by ${userDisplayName}`,
      text: post[0].content || "Check out this amazing post!",
      shareId: shareRecord[0].id,
    }

    console.log("✅ Share link created:", shareUrl)
    console.log("=== POST SHARE API END ===")

    return NextResponse.json(shareData)

  } catch (error) {
    console.error("❌ Post share API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}