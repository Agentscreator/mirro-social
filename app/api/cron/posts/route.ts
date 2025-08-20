import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/src/db"
import { postsTable, notificationsTable, usersTable, postInviteParticipantsTable, postInvitesTable } from "@/src/db/schema"
import { eq, and, lte, gte, isNotNull } from "drizzle-orm"

// This endpoint will be called by a cron job to check for posts that need to be published or expired
export async function GET(request: NextRequest) {
  try {
    console.log("=== POSTS CRON JOB START ===")
    console.log("Timestamp:", new Date().toISOString())

    // Check authorization (you might want to add a secret header for security)
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || 'development-secret'
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.error("❌ UNAUTHORIZED: Invalid cron secret")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    console.log("Current time:", now.toISOString())

    // Step 1: Publish scheduled posts that are ready
    console.log("=== CHECKING FOR POSTS TO PUBLISH ===")
    
    const postsToPublish = await db
      .select()
      .from(postsTable)
      .where(
        and(
          eq(postsTable.status, "scheduled"),
          lte(postsTable.publishTime, now)
        )
      )

    console.log(`Found ${postsToPublish.length} posts ready to publish`)

    let publishedCount = 0
    for (const post of postsToPublish) {
      try {
        await db
          .update(postsTable)
          .set({ 
            status: "live",
            updatedAt: now
          })
          .where(eq(postsTable.id, post.id))
        
        publishedCount++
        console.log(`✅ Published post ${post.id} (scheduled for ${post.publishTime})`)
      } catch (error) {
        console.error(`❌ Failed to publish post ${post.id}:`, error)
      }
    }

    // Step 2: Expire live posts that have reached their expiry time
    console.log("=== CHECKING FOR POSTS TO EXPIRE ===")
    
    const postsToExpire = await db
      .select()
      .from(postsTable)
      .where(
        and(
          eq(postsTable.status, "live"),
          lte(postsTable.expiryTime, now)
        )
      )

    console.log(`Found ${postsToExpire.length} posts ready to expire`)

    let expiredCount = 0
    for (const post of postsToExpire) {
      if (post.expiryTime) { // Double-check that expiryTime is not null
        try {
          await db
            .update(postsTable)
            .set({ 
              status: "expired",
              updatedAt: now
            })
            .where(eq(postsTable.id, post.id))
          
          expiredCount++
          console.log(`✅ Expired post ${post.id} (expiry time: ${post.expiryTime})`)
        } catch (error) {
          console.error(`❌ Failed to expire post ${post.id}:`, error)
        }
      }
    }

    // Step 3: Send notifications for activities starting in 1 hour
    console.log("=== CHECKING FOR 1-HOUR ACTIVITY NOTIFICATIONS ===")
    
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    const fiftyMinutesFromNow = new Date(now.getTime() + 50 * 60 * 1000) // 50 minutes from now (to avoid double notifications)
    
    // Find scheduled posts that will go live in ~1 hour
    const upcomingActivities = await db
      .select({
        id: postsTable.id,
        userId: postsTable.userId,
        content: postsTable.content,
        publishTime: postsTable.publishTime,
      })
      .from(postsTable)
      .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
      .where(
        and(
          eq(postsTable.status, "scheduled"),
          isNotNull(postsTable.publishTime),
          gte(postsTable.publishTime, fiftyMinutesFromNow),
          lte(postsTable.publishTime, oneHourFromNow)
        )
      )

    console.log(`Found ${upcomingActivities.length} activities starting in ~1 hour`)

    let notificationsSent = 0
    for (const activity of upcomingActivities) {
      try {
        // Create notification for the activity creator
        await db
          .insert(notificationsTable)
          .values({
            userId: activity.userId,
            type: "activity_reminder",
            title: "Activity Starting Soon",
            message: `Your activity "${activity.content?.substring(0, 50)}..." starts in about 1 hour!`,
            data: JSON.stringify({
              postId: activity.id,
              activityTime: activity.publishTime?.toISOString(),
            }),
            actionUrl: `/posts/${activity.id}`,
          })
        
        notificationsSent++
        console.log(`✅ Sent 1-hour reminder to creator for activity ${activity.id}`)

        // Also notify all participants who joined this activity
        const participants = await db
          .select({
            userId: postInviteParticipantsTable.userId,
          })
          .from(postInviteParticipantsTable)
          .innerJoin(postInvitesTable, eq(postInviteParticipantsTable.inviteId, postInvitesTable.id))
          .where(eq(postInvitesTable.postId, activity.id))

        for (const participant of participants) {
          try {
            await db
              .insert(notificationsTable)
              .values({
                userId: participant.userId,
                type: "activity_reminder",
                title: "Activity Starting Soon",
                message: `An activity you joined "${activity.content?.substring(0, 50)}..." starts in about 1 hour!`,
                data: JSON.stringify({
                  postId: activity.id,
                  activityTime: activity.publishTime?.toISOString(),
                }),
                actionUrl: `/posts/${activity.id}`,
              })
            
            notificationsSent++
          } catch (participantError) {
            console.error(`❌ Failed to send reminder to participant ${participant.userId}:`, participantError)
          }
        }

        console.log(`✅ Sent reminders to ${participants.length} participants for activity ${activity.id}`)
      } catch (error) {
        console.error(`❌ Failed to send reminder for activity ${activity.id}:`, error)
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      postsPublished: publishedCount,
      postsExpired: expiredCount,
      notificationsSent: notificationsSent,
      totalProcessed: publishedCount + expiredCount + notificationsSent
    }

    console.log("=== CRON JOB SUMMARY ===", summary)
    console.log("=== POSTS CRON JOB END ===")

    return NextResponse.json({
      success: true,
      message: "Post scheduling cron job completed",
      ...summary
    })

  } catch (error) {
    console.error("❌ POSTS CRON JOB ERROR:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    
    return NextResponse.json({ 
      success: false,
      error: "Cron job failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}