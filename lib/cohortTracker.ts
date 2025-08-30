import { db } from '@/db/db';
import { 
  usersTable, 
  postsTable, 
  postLikesTable, 
  postCommentsTable, 
  messagesTable,
  storiesTable,
  storyViewsTable,
  followersTable,
  profileVisitorsTable,
  userActivityLogsTable,
  retentionCohortsTable
} from '@/db/schema';
import { eq, gte, lte, and, sql, desc, asc } from 'drizzle-orm';

export interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionRates: { [key: string]: number };
  activeUsers: { [key: string]: number };
}

export interface UserActivityMetrics {
  userId: string;
  lastActiveDate: Date;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalMessages: number;
  totalStoryViews: number;
  totalFollows: number;
  totalProfileVisits: number;
  engagementScore: number;
}

export class CohortTracker {
  
  /**
   * Log user activity for retention tracking
   */
  async logUserActivity(userId: string, activityType: string, metadata?: any) {
    try {
      await db.insert(userActivityLogsTable).values({
        userId,
        activityType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }

  /**
   * Calculate retention cohorts based on user registration date
   */
  async calculateRetentionCohorts(startDate?: Date, endDate?: Date): Promise<CohortData[]> {
    const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const end = endDate || new Date();

    // Get all users grouped by registration month
    const cohortQuery = await db
      .select({
        cohortMonth: sql<string>`DATE_TRUNC('month', ${usersTable.created_at})`,
        userId: usersTable.id,
        registrationDate: usersTable.created_at
      })
      .from(usersTable)
      .where(
        and(
          gte(usersTable.created_at, start),
          lte(usersTable.created_at, end)
        )
      )
      .orderBy(asc(usersTable.created_at));

    // Group users by cohort month
    const cohortMap = new Map<string, string[]>();
    cohortQuery.forEach(user => {
      const month = user.cohortMonth;
      if (!cohortMap.has(month)) {
        cohortMap.set(month, []);
      }
      cohortMap.get(month)!.push(user.userId);
    });

    const cohortData: CohortData[] = [];

    // Calculate retention for each cohort
    for (const [cohortMonth, userIds] of cohortMap.entries()) {
      const cohortStartDate = new Date(cohortMonth);
      const retentionRates: { [key: string]: number } = {};
      const activeUsers: { [key: string]: number } = {};

      // Calculate retention for each month after cohort start
      for (let monthOffset = 0; monthOffset <= 12; monthOffset++) {
        const checkDate = new Date(cohortStartDate);
        checkDate.setMonth(checkDate.getMonth() + monthOffset);
        
        const nextMonth = new Date(checkDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Count active users in this period
        const activeUserCount = await this.getActiveUsersInPeriod(userIds, checkDate, nextMonth);
        
        const retentionRate = (activeUserCount / userIds.length) * 100;
        const monthKey = `month_${monthOffset}`;
        
        retentionRates[monthKey] = Math.round(retentionRate * 100) / 100;
        activeUsers[monthKey] = activeUserCount;
      }

      cohortData.push({
        cohortMonth,
        cohortSize: userIds.length,
        retentionRates,
        activeUsers
      });
    }

    // Store cohort data in database
    await this.storeCohortData(cohortData);

    return cohortData;
  }

  /**
   * Get active users in a specific time period
   */
  private async getActiveUsersInPeriod(userIds: string[], startDate: Date, endDate: Date): Promise<number> {
    const activeUsers = await db
      .select({ userId: userActivityLogsTable.userId })
      .from(userActivityLogsTable)
      .where(
        and(
          sql`${userActivityLogsTable.userId} = ANY(${userIds})`,
          gte(userActivityLogsTable.timestamp, startDate),
          lte(userActivityLogsTable.timestamp, endDate)
        )
      )
      .groupBy(userActivityLogsTable.userId);

    return activeUsers.length;
  }

  /**
   * Store cohort data in database for historical tracking
   */
  private async storeCohortData(cohortData: CohortData[]) {
    for (const cohort of cohortData) {
      try {
        await db.insert(retentionCohortsTable).values({
          cohortMonth: cohort.cohortMonth,
          cohortSize: cohort.cohortSize,
          retentionData: JSON.stringify({
            retentionRates: cohort.retentionRates,
            activeUsers: cohort.activeUsers
          }),
          calculatedAt: new Date()
        }).onConflictDoUpdate({
          target: retentionCohortsTable.cohortMonth,
          set: {
            retentionData: JSON.stringify({
              retentionRates: cohort.retentionRates,
              activeUsers: cohort.activeUsers
            }),
            calculatedAt: new Date()
          }
        });
      } catch (error) {
        console.error(`Error storing cohort data for ${cohort.cohortMonth}:`, error);
      }
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId: string): Promise<UserActivityMetrics> {
    // Get last activity
    const lastActivity = await db
      .select({ timestamp: userActivityLogsTable.timestamp })
      .from(userActivityLogsTable)
      .where(eq(userActivityLogsTable.userId, userId))
      .orderBy(desc(userActivityLogsTable.timestamp))
      .limit(1);

    // Get post count
    const postCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(eq(postsTable.userId, userId));

    // Get likes given
    const likesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(postLikesTable)
      .where(eq(postLikesTable.userId, userId));

    // Get comments made
    const commentsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(postCommentsTable)
      .where(eq(postCommentsTable.userId, userId));

    // Get messages sent
    const messagesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(eq(messagesTable.senderId, userId));

    // Get story views
    const storyViewsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(storyViewsTable)
      .where(eq(storyViewsTable.userId, userId));

    // Get follows made
    const followsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(followersTable)
      .where(eq(followersTable.followerId, userId));

    // Get profile visits made
    const profileVisitsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileVisitorsTable)
      .where(eq(profileVisitorsTable.visitorId, userId));

    const totalPosts = postCount[0]?.count || 0;
    const totalLikes = likesCount[0]?.count || 0;
    const totalComments = commentsCount[0]?.count || 0;
    const totalMessages = messagesCount[0]?.count || 0;
    const totalStoryViews = storyViewsCount[0]?.count || 0;
    const totalFollows = followsCount[0]?.count || 0;
    const totalProfileVisits = profileVisitsCount[0]?.count || 0;

    // Calculate engagement score (weighted)
    const engagementScore = 
      (totalPosts * 10) +
      (totalLikes * 2) +
      (totalComments * 5) +
      (totalMessages * 3) +
      (totalStoryViews * 1) +
      (totalFollows * 4) +
      (totalProfileVisits * 1);

    return {
      userId,
      lastActiveDate: lastActivity[0]?.timestamp || new Date(0),
      totalPosts,
      totalLikes,
      totalComments,
      totalMessages,
      totalStoryViews,
      totalFollows,
      totalProfileVisits,
      engagementScore
    };
  }

  /**
   * Get retention cohort summary
   */
  async getCohortSummary(): Promise<any> {
    const cohorts = await db
      .select()
      .from(retentionCohortsTable)
      .orderBy(desc(retentionCohortsTable.cohortMonth));

    return cohorts.map(cohort => ({
      cohortMonth: cohort.cohortMonth,
      cohortSize: cohort.cohortSize,
      ...JSON.parse(cohort.retentionData || '{}'),
      calculatedAt: cohort.calculatedAt
    }));
  }

  /**
   * Track specific user actions for retention analysis
   */
  async trackUserAction(userId: string, action: string, metadata?: any) {
    const actionTypes = [
      'login',
      'post_created',
      'post_liked',
      'comment_made',
      'message_sent',
      'story_viewed',
      'profile_visited',
      'follow_made',
      'app_opened',
      'feed_scrolled',
      'search_performed'
    ];

    if (actionTypes.includes(action)) {
      await this.logUserActivity(userId, action, metadata);
    }
  }

  /**
   * Get churn risk users (users who haven't been active recently)
   */
  async getChurnRiskUsers(daysSinceLastActivity: number = 7): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActivity);

    const recentlyActiveUsers = await db
      .select({ userId: userActivityLogsTable.userId })
      .from(userActivityLogsTable)
      .where(gte(userActivityLogsTable.timestamp, cutoffDate))
      .groupBy(userActivityLogsTable.userId);

    const recentlyActiveUserIds = recentlyActiveUsers.map(u => u.userId);

    const allUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable);

    return allUsers
      .filter(user => !recentlyActiveUserIds.includes(user.id))
      .map(user => user.id);
  }

  /**
   * Generate retention report
   */
  async generateRetentionReport() {
    const cohorts = await this.calculateRetentionCohorts();
    const churnRiskUsers = await this.getChurnRiskUsers();
    
    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable);

    const activeUsersLast30Days = await db
      .select({ userId: userActivityLogsTable.userId })
      .from(userActivityLogsTable)
      .where(gte(userActivityLogsTable.timestamp, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
      .groupBy(userActivityLogsTable.userId);

    return {
      totalUsers: totalUsers[0]?.count || 0,
      activeUsersLast30Days: activeUsersLast30Days.length,
      churnRiskUsers: churnRiskUsers.length,
      cohorts,
      generatedAt: new Date()
    };
  }
}

export const cohortTracker = new CohortTracker();