import { db } from "../db"
import { 
  postsTable, 
  usersTable, 
  postLikesTable, 
  postCommentsTable,
  followersTable,
  userTagsTable,
  tagsTable,
  thoughtsTable,
  profileVisitorsTable
} from "../db/schema"
import { eq, ne, and, sql, desc, asc, gte, lte, inArray, notInArray } from "drizzle-orm"

// Types for feed recommendation
export interface FeedPost {
  id: number
  content: string
  image?: string
  video?: string
  duration?: number
  createdAt: string
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
    image?: string
  }
  likes: number
  isLiked: boolean
  comments: number
  engagementScore?: number
  relevanceScore?: number
  recencyScore?: number
  finalScore?: number
}

export interface FeedRecommendationOptions {
  userId: string
  limit?: number
  excludePostIds?: number[]
  feedType?: 'explore' | 'following'
  timeWindow?: number // hours to look back for trending content
}

export interface UserEngagementProfile {
  userId: string
  preferredContentTypes: string[]
  engagementTimes: number[] // hours of day when user is most active
  averageSessionLength: number
  interactionPreferences: {
    likes: number
    comments: number
    shares: number
    follows: number
  }
  topInterests: string[]
  similarUsers: string[]
}

/**
 * Main feed recommendation engine optimized for TikTok-style engagement
 */
export class FeedRecommendationEngine {
  
  /**
   * Get personalized feed recommendations
   */
  static async getRecommendedFeed(options: FeedRecommendationOptions): Promise<FeedPost[]> {
    const { userId, limit = 10, excludePostIds = [], feedType = 'explore', timeWindow = 168 } = options
    
    try {
      // Get user's engagement profile
      const userProfile = await this.getUserEngagementProfile(userId)
      
      if (feedType === 'following') {
        return await this.getFollowingFeed(userId, limit, excludePostIds)
      }
      
      // For explore feed, use sophisticated recommendation algorithm
      const candidatePosts = await this.getCandidatePosts(userId, timeWindow, excludePostIds)
      
      // Score and rank posts
      const scoredPosts = await this.scoreAndRankPosts(candidatePosts, userProfile, userId)
      
      // Apply diversity and freshness filters
      const diversifiedPosts = this.applyDiversityFilter(scoredPosts, limit)
      
      return diversifiedPosts.slice(0, limit)
    } catch (error) {
      console.error('Error getting recommended feed:', error)
      
      // Fallback to basic recent posts
      return await this.getFallbackFeed(userId, limit, excludePostIds)
    }
  }

  /**
   * Get user's engagement profile for personalization
   */
  static async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    try {
      // Get user's interaction history
      const interactions = await db
        .select({
          type: sql<string>`'like'`,
          targetUserId: postsTable.userId,
          createdAt: postLikesTable.createdAt,
          content: postsTable.content,
        })
        .from(postLikesTable)
        .innerJoin(postsTable, eq(postLikesTable.postId, postsTable.id))
        .where(eq(postLikesTable.userId, userId))
        .orderBy(desc(postLikesTable.createdAt))
        .limit(100)

      // Get users they follow (indicates interest)
      const following = await db
        .select({ followingId: followersTable.followingId })
        .from(followersTable)
        .where(eq(followersTable.followerId, userId))

      // Get user's interests from tags
      const userTags = await db
        .select({
          tagName: tagsTable.name,
          category: tagsTable.category,
        })
        .from(userTagsTable)
        .innerJoin(tagsTable, eq(userTagsTable.tagId, tagsTable.id))
        .where(eq(userTagsTable.userId, userId))

      // Analyze engagement patterns
      const engagementTimes = this.analyzeEngagementTimes(interactions)
      const contentPreferences = this.analyzeContentPreferences(interactions)
      const similarUsers = await this.findSimilarUsers(userId, following.map(f => f.followingId))

      return {
        userId,
        preferredContentTypes: contentPreferences,
        engagementTimes,
        averageSessionLength: 300, // Default 5 minutes
        interactionPreferences: {
          likes: interactions.length,
          comments: 0, // Would need separate query
          shares: 0,
          follows: following.length,
        },
        topInterests: userTags.map(t => t.tagName).slice(0, 10),
        similarUsers: similarUsers.slice(0, 20),
      }
    } catch (error) {
      console.error('Error building user engagement profile:', error)
      return this.getDefaultEngagementProfile(userId)
    }
  }

  /**
   * Get candidate posts for recommendation
   */
  static async getCandidatePosts(
    userId: string, 
    timeWindowHours: number, 
    excludePostIds: number[]
  ): Promise<FeedPost[]> {
    const timeWindowStart = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000)
    
    const posts = await db
      .select({
        id: postsTable.id,
        content: postsTable.content,
        image: postsTable.image,
        video: postsTable.video,
        duration: postsTable.duration,
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
          AND ${postLikesTable.userId} = ${userId}
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
          ne(postsTable.userId, userId), // Don't recommend user's own posts
          gte(postsTable.createdAt, timeWindowStart),
          excludePostIds.length > 0 ? notInArray(postsTable.id, excludePostIds) : undefined,
          sql`(${postsTable.video} IS NOT NULL OR ${postsTable.image} IS NOT NULL)` // Only posts with media
        )
      )
      .orderBy(desc(postsTable.createdAt))
      .limit(200) // Get more candidates for better filtering

    return posts
  }

  /**
   * Score and rank posts based on multiple factors
   */
  static async scoreAndRankPosts(
    posts: FeedPost[], 
    userProfile: UserEngagementProfile, 
    userId: string
  ): Promise<FeedPost[]> {
    const scoredPosts = await Promise.all(posts.map(async (post) => {
      // Calculate different scoring components
      const engagementScore = this.calculateEngagementScore(post)
      const relevanceScore = await this.calculateRelevanceScore(post, userProfile, userId)
      const recencyScore = this.calculateRecencyScore(post)
      const creatorScore = await this.calculateCreatorScore(post, userProfile, userId)
      
      // Weighted final score
      const finalScore = (
        engagementScore * 0.3 +    // 30% engagement
        relevanceScore * 0.4 +     // 40% relevance to user
        recencyScore * 0.2 +       // 20% recency
        creatorScore * 0.1         // 10% creator affinity
      )

      return {
        ...post,
        engagementScore,
        relevanceScore,
        recencyScore,
        finalScore
      }
    }))

    // Sort by final score descending
    return scoredPosts.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
  }

  /**
   * Calculate engagement score based on likes, comments, and recency
   */
  static calculateEngagementScore(post: FeedPost): number {
    const { likes, comments, createdAt } = post
    
    // Calculate engagement rate
    const totalEngagement = likes + (comments * 2) // Weight comments higher
    
    // Time decay factor (more recent posts get boost)
    const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    const timeDecay = Math.exp(-hoursOld / 24) // Exponential decay over 24 hours
    
    // Normalize engagement (assuming max engagement is around 100)
    const normalizedEngagement = Math.min(totalEngagement / 100, 1)
    
    return normalizedEngagement * timeDecay
  }

  /**
   * Calculate relevance score based on user preferences and interests
   */
  static async calculateRelevanceScore(
    post: FeedPost, 
    userProfile: UserEngagementProfile, 
    userId: string
  ): Promise<number> {
    let relevanceScore = 0

    // Check if user follows the creator
    const isFollowing = await this.isUserFollowing(userId, post.user.id)
    if (isFollowing) {
      relevanceScore += 0.5
    }

    // Check if user has interacted with similar content
    const contentSimilarity = await this.calculateContentSimilarity(post, userProfile)
    relevanceScore += contentSimilarity * 0.3

    // Check if creator is similar to users they engage with
    const creatorSimilarity = userProfile.similarUsers.includes(post.user.id) ? 0.2 : 0
    relevanceScore += creatorSimilarity

    return Math.min(relevanceScore, 1)
  }

  /**
   * Calculate recency score (newer posts get higher scores)
   */
  static calculateRecencyScore(post: FeedPost): number {
    const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
    
    // Score decreases exponentially over time
    if (hoursOld < 1) return 1.0       // Perfect score for posts under 1 hour
    if (hoursOld < 6) return 0.8       // High score for posts under 6 hours
    if (hoursOld < 24) return 0.6      // Medium score for posts under 24 hours
    if (hoursOld < 72) return 0.3      // Lower score for posts under 3 days
    return 0.1                         // Minimal score for older posts
  }

  /**
   * Calculate creator affinity score
   */
  static async calculateCreatorScore(
    post: FeedPost, 
    userProfile: UserEngagementProfile, 
    userId: string
  ): Promise<number> {
    let creatorScore = 0

    // Check if user has liked creator's content before
    const hasLikedBefore = await this.hasUserLikedCreatorBefore(userId, post.user.id)
    if (hasLikedBefore) {
      creatorScore += 0.5
    }

    // Check if user has visited creator's profile
    const hasVisitedProfile = await this.hasUserVisitedProfile(userId, post.user.id)
    if (hasVisitedProfile) {
      creatorScore += 0.3
    }

    return Math.min(creatorScore, 1)
  }

  /**
   * Apply diversity filter to avoid too many posts from same creator
   */
  static applyDiversityFilter(posts: FeedPost[], limit: number): FeedPost[] {
    const diversifiedPosts: FeedPost[] = []
    const creatorCounts = new Map<string, number>()
    const maxPostsPerCreator = Math.max(1, Math.floor(limit / 5)) // Max 20% from same creator

    for (const post of posts) {
      const creatorId = post.user.id
      const currentCount = creatorCounts.get(creatorId) || 0

      if (currentCount < maxPostsPerCreator) {
        diversifiedPosts.push(post)
        creatorCounts.set(creatorId, currentCount + 1)
      }

      if (diversifiedPosts.length >= limit) break
    }

    return diversifiedPosts
  }

  /**
   * Get following feed (posts from users the user follows)
   */
  static async getFollowingFeed(
    userId: string, 
    limit: number, 
    excludePostIds: number[]
  ): Promise<FeedPost[]> {
    // Get users that the current user follows
    const following = await db
      .select({ followingId: followersTable.followingId })
      .from(followersTable)
      .where(eq(followersTable.followerId, userId))

    if (following.length === 0) {
      return []
    }

    const followingUserIds = following.map(f => f.followingId)

    const posts = await db
      .select({
        id: postsTable.id,
        content: postsTable.content,
        image: postsTable.image,
        video: postsTable.video,
        duration: postsTable.duration,
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
          AND ${postLikesTable.userId} = ${userId}
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
          inArray(postsTable.userId, followingUserIds),
          excludePostIds.length > 0 ? notInArray(postsTable.id, excludePostIds) : undefined,
          sql`(${postsTable.video} IS NOT NULL OR ${postsTable.image} IS NOT NULL)`
        )
      )
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)

    return posts
  }

  /**
   * Fallback feed for when recommendation engine fails
   */
  static async getFallbackFeed(
    userId: string, 
    limit: number, 
    excludePostIds: number[]
  ): Promise<FeedPost[]> {
    const posts = await db
      .select({
        id: postsTable.id,
        content: postsTable.content,
        image: postsTable.image,
        video: postsTable.video,
        duration: postsTable.duration,
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
          AND ${postLikesTable.userId} = ${userId}
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
          ne(postsTable.userId, userId),
          excludePostIds.length > 0 ? notInArray(postsTable.id, excludePostIds) : undefined,
          sql`(${postsTable.video} IS NOT NULL OR ${postsTable.image} IS NOT NULL)`
        )
      )
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)

    return posts
  }

  // Helper methods
  static async isUserFollowing(userId: string, targetUserId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(followersTable)
      .where(
        and(
          eq(followersTable.followerId, userId),
          eq(followersTable.followingId, targetUserId)
        )
      )
      .limit(1)

    return result.length > 0
  }

  static async hasUserLikedCreatorBefore(userId: string, creatorId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(postLikesTable)
      .innerJoin(postsTable, eq(postLikesTable.postId, postsTable.id))
      .where(
        and(
          eq(postLikesTable.userId, userId),
          eq(postsTable.userId, creatorId)
        )
      )
      .limit(1)

    return result.length > 0
  }

  static async hasUserVisitedProfile(userId: string, profileUserId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(profileVisitorsTable)
      .where(
        and(
          eq(profileVisitorsTable.visitorId, userId),
          eq(profileVisitorsTable.profileId, profileUserId)
        )
      )
      .limit(1)

    return result.length > 0
  }

  static async calculateContentSimilarity(post: FeedPost, userProfile: UserEngagementProfile): Promise<number> {
    // Simple keyword matching for now
    // In production, you'd use more sophisticated NLP
    const postContent = post.content.toLowerCase()
    const userInterests = userProfile.topInterests.map(interest => interest.toLowerCase())
    
    let matches = 0
    for (const interest of userInterests) {
      if (postContent.includes(interest)) {
        matches++
      }
    }

    return Math.min(matches / Math.max(userInterests.length, 1), 1)
  }

  static analyzeEngagementTimes(interactions: any[]): number[] {
    // Analyze what hours of the day user is most active
    const hourCounts = new Array(24).fill(0)
    
    for (const interaction of interactions) {
      const hour = new Date(interaction.createdAt).getHours()
      hourCounts[hour]++
    }

    // Return top engagement hours
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(item => item.hour)
  }

  static analyzeContentPreferences(interactions: any[]): string[] {
    // Analyze content preferences based on interactions
    // This is simplified - in production you'd use more sophisticated analysis
    const contentTypes = ['video', 'image', 'text']
    return contentTypes
  }

  static async findSimilarUsers(userId: string, followingIds: string[]): Promise<string[]> {
    // Find users with similar following patterns or engagement
    // Simplified implementation
    return followingIds.slice(0, 10)
  }

  static getDefaultEngagementProfile(userId: string): UserEngagementProfile {
    return {
      userId,
      preferredContentTypes: ['video', 'image'],
      engagementTimes: [12, 13, 18, 19, 20, 21], // Default active hours
      averageSessionLength: 300,
      interactionPreferences: {
        likes: 0,
        comments: 0,
        shares: 0,
        follows: 0,
      },
      topInterests: [],
      similarUsers: [],
    }
  }
}