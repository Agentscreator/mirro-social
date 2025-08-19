import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, usersTable, postLikesTable, postCommentsTable, followersTable } from "@/src/db/schema"
import { desc, eq, sql, and, notInArray, or, ilike, inArray } from "drizzle-orm"
import { FeedRecommendationEngine } from "@/src/lib/feedRecommendationService"

// GET - Fetch feed posts with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const searchQuery = searchParams.get("search")?.trim()
    const feedType = searchParams.get("type") || "explore" // "explore", "following"
    const excludeIds =
      searchParams
        .get("excludeIds")
        ?.split(",")
        .map((id) => Number.parseInt(id))
        .filter((id) => !isNaN(id)) || []

    console.log("=== FEED API DEBUG ===")
    console.log("User ID:", session.user.id)
    console.log("Feed Type:", feedType)
    console.log("Cursor:", cursor)
    console.log("Limit:", limit)
    console.log("Search Query:", searchQuery)
    console.log("Exclude IDs:", excludeIds)

    // Use smart recommendation engine when available
    try {
      console.log("Using smart feed recommendation engine...")
      
      const recommendedPosts = await FeedRecommendationEngine.getRecommendedFeed({
        userId: session.user.id,
        limit: limit + 1, // Get one extra to check if there are more
        excludePostIds: excludeIds,
        feedType: feedType as 'explore' | 'following',
        timeWindow: searchQuery ? 24 : 168, // Use shorter window for search, longer for regular feed
      })

      // Apply search filter if provided
      let posts = recommendedPosts
      if (searchQuery) {
        posts = recommendedPosts.filter(post => 
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (post.user.nickname && post.user.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }

      console.log(`Smart recommendation returned ${posts.length} posts`)
      
      // If we got good results, use them
      if (posts.length > 0) {
        // Check if there are more posts
        const hasMore = posts.length > limit
        const postsToReturn = hasMore ? posts.slice(0, limit) : posts
        const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1].id.toString() : null

        return NextResponse.json({
          posts: postsToReturn,
          nextCursor,
          hasMore,
        })
      }
    } catch (error) {
      console.error("Smart recommendation engine failed, falling back to basic feed:", error)
    }

    // Fallback to original logic if smart recommendations fail
    console.log("Using fallback feed logic...")
    
    // Get following user IDs if needed
    let followingUserIds: string[] = []
    if (feedType === "following") {
      const followingResult = await db
        .select({ followingId: followersTable.followingId })
        .from(followersTable)
        .where(eq(followersTable.followerId, session.user.id))
      
      followingUserIds = followingResult.map(f => f.followingId)
      
      // If user follows no one, return empty result
      if (followingUserIds.length === 0) {
        return NextResponse.json({
          posts: [],
          nextCursor: null,
          hasMore: false,
        })
      }
    }

    // Build the query - handle transition period where both image and video columns exist
    const query = db
      .select({
        id: postsTable.id,
        content: postsTable.content,
        image: postsTable.image,
        video: postsTable.video,
        hasPrivateLocation: postsTable.hasPrivateLocation,
        createdAt: postsTable.createdAt,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
          image: usersTable.image,
        },
        likes: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${postLikesTable} 
          WHERE ${postLikesTable.postId} = ${postsTable.id}
        )`,
        isLiked: sql<boolean>`(
          SELECT COUNT(*) > 0 
          FROM ${postLikesTable} 
          WHERE ${postLikesTable.postId} = ${postsTable.id} 
          AND ${postLikesTable.userId} = ${session.user.id}
        )`,
        comments: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${postCommentsTable} 
          WHERE ${postCommentsTable.postId} = ${postsTable.id}
        )`
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(
        and(
          // Only posts with videos - allow both image and video posts for now during transition
          sql`(${postsTable.video} IS NOT NULL OR ${postsTable.image} IS NOT NULL)`,
          // Filter by feed type
          feedType === "following" && followingUserIds.length > 0 
            ? inArray(postsTable.userId, followingUserIds)
            : undefined,
          // Exclude already seen posts
          excludeIds.length > 0 ? notInArray(postsTable.id, excludeIds) : undefined,
          // Cursor-based pagination
          cursor ? sql`${postsTable.id} < ${Number.parseInt(cursor)}` : undefined,
          // Search functionality
          searchQuery ? or(
            ilike(postsTable.content, `%${searchQuery}%`),
            ilike(usersTable.username, `%${searchQuery}%`),
            ilike(usersTable.nickname, `%${searchQuery}%`)
          ) : undefined,
        ),
      )
      .orderBy(desc(postsTable.id))
      .limit(limit + 1) // Get one extra to check if there are more

    const posts = await query

    console.log(`Found ${posts.length} posts`)

    // Check if there are more posts
    const hasMore = posts.length > limit
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1].id.toString() : null

    return NextResponse.json({
      posts: postsToReturn,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("Feed API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
