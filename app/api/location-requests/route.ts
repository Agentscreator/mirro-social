import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { locationRequestsTable, postsTable, usersTable, notificationsTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Create a location request
export async function POST(request: NextRequest) {
  try {
    console.log("=== LOCATION REQUEST API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("Unauthorized: No session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postId } = body

    console.log("Creating location request for post:", postId)
    console.log("Requester ID:", session.user.id)

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    // Get the post and its owner
    const post = await db
      .select({
        id: postsTable.id,
        userId: postsTable.userId,
        hasPrivateLocation: postsTable.hasPrivateLocation,
        user: {
          username: usersTable.username,
          nickname: usersTable.nickname,
        }
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (!post[0].hasPrivateLocation) {
      return NextResponse.json({ error: "This post doesn't have a private location" }, { status: 400 })
    }

    if (post[0].userId === session.user.id) {
      return NextResponse.json({ error: "You can't request location from your own post" }, { status: 400 })
    }

    // Check if request already exists
    const existingRequest = await db
      .select()
      .from(locationRequestsTable)
      .where(
        and(
          eq(locationRequestsTable.postId, postId),
          eq(locationRequestsTable.requesterId, session.user.id)
        )
      )
      .limit(1)

    if (existingRequest.length > 0) {
      return NextResponse.json({ error: "Location request already sent" }, { status: 400 })
    }

    // Create the location request
    const locationRequest = await db
      .insert(locationRequestsTable)
      .values({
        postId: postId,
        requesterId: session.user.id,
        postOwnerId: post[0].userId,
        status: "pending",
      })
      .returning()

    // Create notification for the post owner
    await db
      .insert(notificationsTable)
      .values({
        userId: post[0].userId,
        fromUserId: session.user.id,
        type: "location_request",
        title: "Location Request",
        message: `Someone wants to know the location of your post`,
        postId: postId,
        locationRequestId: locationRequest[0].id,
        isRead: 0,
      })

    console.log("✅ Location request created successfully")
    return NextResponse.json({ 
      message: "Location request sent successfully",
      requestId: locationRequest[0].id 
    })

  } catch (error) {
    console.error("❌ Location request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}