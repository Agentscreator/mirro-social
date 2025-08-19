import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { LiveEventService } from "@/src/lib/liveEventService"

// GET - Manual trigger for checking and updating event statuses (for testing)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🧪 Manual event status check triggered by:", session.user.email)

    // Run complete event status check
    await LiveEventService.performCompleteEventCheck()

    // Get current stats
    const activeEvents = await LiveEventService.getActiveEvents()
    const upcomingEvents = await LiveEventService.getUpcomingEvents()

    console.log(`📊 Manual check complete. Active: ${activeEvents.length}, Upcoming: ${upcomingEvents.length}`)

    return NextResponse.json({
      success: true,
      message: "Event status check completed",
      timestamp: new Date().toISOString(),
      activeEvents: activeEvents.length,
      upcomingEvents: upcomingEvents.length,
      activeEventDetails: activeEvents.map(event => ({
        id: event.id,
        title: event.title,
        status: event.status,
        participants: event.currentParticipants,
        scheduledStart: event.scheduledStartTime,
        actualStart: event.actualStartTime,
      })),
      upcomingEventDetails: upcomingEvents.map(event => ({
        id: event.id,
        title: event.title,
        status: event.status,
        scheduledStart: event.scheduledStartTime,
        timeUntilStart: Math.ceil((new Date(event.scheduledStartTime).getTime() - Date.now()) / (1000 * 60)), // minutes
      })),
    })
  } catch (error) {
    console.error("❌ Manual event check error:", error)
    return NextResponse.json({ 
      error: "Failed to check event statuses",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// POST - Same as GET for convenience
export async function POST(request: NextRequest) {
  return GET(request)
}