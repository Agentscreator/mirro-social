import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postLocationsTable, postsTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// GET - Get location details for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const postId = parseInt(params.id)
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    // Get the post and its location
    const postWithLocation = await db
      .select({
        post: postsTable,
        location: postLocationsTable,
      })
      .from(postsTable)
      .leftJoin(postLocationsTable, eq(postLocationsTable.postId, postsTable.id))
      .where(eq(postsTable.id, postId))
      .limit(1)

    if (postWithLocation.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const { post, location } = postWithLocation[0]

    if (!location) {
      return NextResponse.json({ error: "No location data for this post" }, { status: 404 })
    }

    // Only return location if user is the post owner or has been granted access
    if (post.userId !== session.user.id) {
      // TODO: Check if user has been granted location access
      // For now, return basic info only
      return NextResponse.json({
        hasLocation: true,
        locationName: location.locationName,
        // Don't return address/coordinates unless access granted
      })
    }

    // Return full location data for post owner
    return NextResponse.json({
      hasLocation: true,
      locationName: location.locationName,
      locationAddress: location.locationAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      isPrivate: location.isPrivate === 1,
    })
  } catch (error) {
    console.error("Error fetching location:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}