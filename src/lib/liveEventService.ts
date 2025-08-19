import { db } from "@/src/db"
import { liveEventsTable } from "@/src/db/schema"
import { eq, and, lte, gte, sql } from "drizzle-orm"

export class LiveEventService {
  
  // Update event statuses based on current time
  static async updateEventStatuses() {
    const now = new Date()
    
    try {
      console.log(`🕒 Checking event statuses at ${now.toISOString()}`)
      
      // Get events that should be activated
      const eventsToActivate = await db
        .select()
        .from(liveEventsTable)
        .where(
          and(
            eq(liveEventsTable.status, "scheduled"),
            lte(liveEventsTable.scheduledStartTime, now)
          )
        )

      console.log(`📅 Found ${eventsToActivate.length} events ready to activate`)

      // Mark events as live if they've reached their start time
      if (eventsToActivate.length > 0) {
        const activatedResult = await db
          .update(liveEventsTable)
          .set({
            status: "live",
            isActive: 1,
            actualStartTime: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(liveEventsTable.status, "scheduled"),
              lte(liveEventsTable.scheduledStartTime, now)
            )
          )
          .returning()

        console.log(`✅ Activated ${activatedResult.length} events:`)
        activatedResult.forEach(event => {
          console.log(`   - Event "${event.title}" (ID: ${event.id}) is now LIVE!`)
        })
      }

      // Get events that should be ended
      const eventsToEnd = await db
        .select()
        .from(liveEventsTable)
        .where(
          and(
            eq(liveEventsTable.status, "live"),
            sql`${liveEventsTable.scheduledEndTime} IS NOT NULL`,
            lte(liveEventsTable.scheduledEndTime, now)
          )
        )

      console.log(`🏁 Found ${eventsToEnd.length} events ready to end`)

      // Mark events as ended if they've passed their end time
      if (eventsToEnd.length > 0) {
        const endedResult = await db
          .update(liveEventsTable)
          .set({
            status: "ended",
            isActive: 0,
            actualEndTime: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(liveEventsTable.status, "live"),
              sql`${liveEventsTable.scheduledEndTime} IS NOT NULL`,
              lte(liveEventsTable.scheduledEndTime, now)
            )
          )
          .returning()

        console.log(`🏁 Ended ${endedResult.length} events:`)
        endedResult.forEach(event => {
          console.log(`   - Event "${event.title}" (ID: ${event.id}) has ended`)
        })
      }

      console.log("✅ Live event statuses updated successfully")
    } catch (error) {
      console.error("❌ Error updating live event statuses:", error)
      throw error
    }
  }

  // Get events that should be active right now
  static async getActiveEvents() {
    const now = new Date()
    
    try {
      const activeEvents = await db
        .select()
        .from(liveEventsTable)
        .where(
          and(
            eq(liveEventsTable.status, "live"),
            eq(liveEventsTable.isActive, 1)
          )
        )

      return activeEvents
    } catch (error) {
      console.error("Error fetching active events:", error)
      return []
    }
  }

  // Get upcoming events (within next 24 hours)
  static async getUpcomingEvents() {
    const now = new Date()
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    try {
      const upcomingEvents = await db
        .select()
        .from(liveEventsTable)
        .where(
          and(
            eq(liveEventsTable.status, "scheduled"),
            gte(liveEventsTable.scheduledStartTime, now),
            lte(liveEventsTable.scheduledStartTime, next24Hours)
          )
        )

      return upcomingEvents
    } catch (error) {
      console.error("Error fetching upcoming events:", error)
      return []
    }
  }

  // Activate an event manually (for testing or manual control)
  static async activateEvent(eventId: number) {
    const now = new Date()
    
    try {
      await db
        .update(liveEventsTable)
        .set({
          status: "live",
          isActive: 1,
          actualStartTime: now,
        })
        .where(eq(liveEventsTable.id, eventId))

      console.log(`Event ${eventId} activated manually`)
    } catch (error) {
      console.error(`Error activating event ${eventId}:`, error)
      throw error
    }
  }

  // End an event manually
  static async endEvent(eventId: number) {
    const now = new Date()
    
    try {
      await db
        .update(liveEventsTable)
        .set({
          status: "ended",
          isActive: 0,
          actualEndTime: now,
        })
        .where(eq(liveEventsTable.id, eventId))

      console.log(`Event ${eventId} ended manually`)
    } catch (error) {
      console.error(`Error ending event ${eventId}:`, error)
      throw error
    }
  }

  // Clean up old events (older than 7 days)
  static async cleanupOldEvents() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    try {
      await db
        .update(liveEventsTable)
        .set({
          status: "archived",
          isActive: 0,
        })
        .where(
          and(
            sql`${liveEventsTable.status} IN ('ended', 'cancelled')`,
            lte(liveEventsTable.createdAt, sevenDaysAgo)
          )
        )

      console.log("Old events cleaned up successfully")
    } catch (error) {
      console.error("Error cleaning up old events:", error)
    }
  }

  // Check for events that should have been activated but weren't (recovery mechanism)
  static async checkMissedEvents() {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    try {
      console.log("🔍 Checking for missed events that should have been activated...")
      
      // Find events that were scheduled to start in the past but are still marked as "scheduled"
      const missedEvents = await db
        .select()
        .from(liveEventsTable)
        .where(
          and(
            eq(liveEventsTable.status, "scheduled"),
            lte(liveEventsTable.scheduledStartTime, now),
            gte(liveEventsTable.scheduledStartTime, oneDayAgo) // Only check events from last 24 hours
          )
        )

      if (missedEvents.length > 0) {
        console.log(`⚠️  Found ${missedEvents.length} missed events that should be activated:`)
        
        for (const event of missedEvents) {
          console.log(`   - Event "${event.title}" (ID: ${event.id}) scheduled for ${event.scheduledStartTime}`)
          
          // Check if event should still be live or if it's already past its end time
          const shouldBeEnded = event.scheduledEndTime && new Date(event.scheduledEndTime) <= now
          
          if (shouldBeEnded) {
            // Event should have ended already
            await db
              .update(liveEventsTable)
              .set({
                status: "ended",
                isActive: 0,
                actualStartTime: new Date(event.scheduledStartTime),
                actualEndTime: new Date(event.scheduledEndTime!),
                updatedAt: now,
              })
              .where(eq(liveEventsTable.id, event.id))
            
            console.log(`   ⏰ Event "${event.title}" marked as ended (missed its window)`)
          } else {
            // Event should be activated now
            await db
              .update(liveEventsTable)
              .set({
                status: "live",
                isActive: 1,
                actualStartTime: new Date(event.scheduledStartTime),
                updatedAt: now,
              })
              .where(eq(liveEventsTable.id, event.id))
            
            console.log(`   ✅ Event "${event.title}" activated (was missed)`)
          }
        }
      } else {
        console.log("✅ No missed events found")
      }
    } catch (error) {
      console.error("❌ Error checking for missed events:", error)
    }
  }

  // Run a complete event status check (used by cron job)
  static async performCompleteEventCheck() {
    console.log("🚀 Starting complete event status check...")
    
    try {
      // First check for missed events
      await this.checkMissedEvents()
      
      // Then run normal status updates
      await this.updateEventStatuses()
      
      // Clean up old events
      await this.cleanupOldEvents()
      
      console.log("🎉 Complete event status check finished successfully")
    } catch (error) {
      console.error("❌ Complete event status check failed:", error)
      throw error
    }
  }

  // Get event statistics
  static async getEventStats(eventId: number) {
    try {
      const [event] = await db
        .select()
        .from(liveEventsTable)
        .where(eq(liveEventsTable.id, eventId))

      if (!event) {
        throw new Error("Event not found")
      }

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        isActive: event.isActive,
        currentParticipants: event.currentParticipants,
        maxParticipants: event.maxParticipants,
        scheduledStartTime: event.scheduledStartTime,
        actualStartTime: event.actualStartTime,
        duration: event.actualStartTime && event.actualEndTime 
          ? Math.floor((event.actualEndTime.getTime() - event.actualStartTime.getTime()) / 1000)
          : null,
      }
    } catch (error) {
      console.error(`Error fetching event stats for ${eventId}:`, error)
      throw error
    }
  }
}