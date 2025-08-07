import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { locationRequestsTable, postLocationsTable, notificationsTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Accept or deny a location request
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; action: string }> }
) {
  try {
    console.log("=== LOCATION REQUEST ACTION API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("Unauthorized: No session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, action } = await context.params
    const requestId = parseInt(id)
    
    console.log("Processing location request:", requestId, "Action:", action)

    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 })
    }

    if (!['accept', 'deny'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get the location request
    const locationRequest = await db
      .select()
      .from(locationRequestsTable)
      .where(eq(locationRequestsTable.id, requestId))
      .limit(1)

    if (locationRequest.length === 0) {
      return NextResponse.json({ error: "Location request not found" }, { status: 404 })
    }

    const request_data = locationRequest[0]

    // Verify the current user is the post owner
    if (request_data.postOwnerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the request status
    await db
      .update(locationRequestsTable)
      .set({
        status: action === 'accept' ? 'accepted' : 'denied',
        respondedAt: new Date(),
      })
      .where(eq(locationRequestsTable.id, requestId))

    let responseData: any = {
      message: `Location request ${action}ed successfully`
    }

    // If accepted, get the location data
    if (action === 'accept') {
      const locationData = await db
        .select()
        .from(postLocationsTable)
        .where(eq(postLocationsTable.postId, request_data.postId))
        .limit(1)

      if (locationData.length > 0) {
        responseData.location = {
          name: locationData[0].locationName,
          address: locationData[0].locationAddress,
          latitude: locationData[0].latitude,
          longitude: locationData[0].longitude,
        }
      }

      // Create notification for the requester
      await db
        .insert(notificationsTable)
        .values({
          userId: request_data.requesterId,
          fromUserId: session.user.id,
          type: "location_shared",
          title: "Location Shared",
          message: `Your location request has been approved`,
          postId: request_data.postId,
          isRead: 0,
        })
    } else {
      // Create notification for the requester (denied)
      await db
        .insert(notificationsTable)
        .values({
          userId: request_data.requesterId,
          fromUserId: session.user.id,
          type: "location_denied",
          title: "Location Request Denied",
          message: `Your location request was not approved`,
          postId: request_data.postId,
          isRead: 0,
        })
    }

    console.log(`✅ Location request ${action}ed successfully`)
    return NextResponse.json(responseData)

  } catch (error) {
    console.error(`❌ Location request ${action} error:`, error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}