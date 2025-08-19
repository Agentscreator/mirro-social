import { NextRequest, NextResponse } from "next/server"
import { LiveEventService } from "@/src/lib/liveEventService"

// GET - Update live event statuses (to be called by cron job)
export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication if needed
    const authHeader = request.headers.get("authorization")
    const expectedAuth = process.env.CRON_SECRET || "cron-secret-key"
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Starting scheduled event status update...")

    // Run complete event status check (includes missed events, status updates, and cleanup)
    await LiveEventService.performCompleteEventCheck()

    // Get current stats
    const activeEvents = await LiveEventService.getActiveEvents()
    const upcomingEvents = await LiveEventService.getUpcomingEvents()

    console.log(`Event update complete. Active: ${activeEvents.length}, Upcoming: ${upcomingEvents.length}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      activeEvents: activeEvents.length,
      upcomingEvents: upcomingEvents.length,
    })
  } catch (error) {
    console.error("Cron job error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}