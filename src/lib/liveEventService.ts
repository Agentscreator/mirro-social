import { db } from "@/src/db"
import { liveEventsTable } from "@/src/db/schema"
import { eq, and, lte, gte, sql } from "drizzle-orm"

export class LiveEventService {
  
  // Update event statuses based on current time
  static async updateEventStatuses() {
    const now = new Date()
    
    try {
      // Mark events as live if they've reached their start time
      await db
        .update(liveEventsTable)
        .set({
          status: "live",
          isActive: 1,
          actualStartTime: now,
        })
        .where(
          and(
            eq(liveEventsTable.status, "scheduled"),
            lte(liveEventsTable.scheduledStartTime, now)
          )
        )

      // Mark events as ended if they've passed their end time
      await db
        .update(liveEventsTable)
        .set({
          status: "ended",
          isActive: 0,
          actualEndTime: now,
        })
        .where(
          and(
            eq(liveEventsTable.status, "live"),
            sql`${liveEventsTable.scheduledEndTime} IS NOT NULL`,
            lte(liveEventsTable.scheduledEndTime, now)
          )
        )

      console.log("Live event statuses updated successfully")
    } catch (error) {
      console.error("Error updating live event statuses:", error)
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