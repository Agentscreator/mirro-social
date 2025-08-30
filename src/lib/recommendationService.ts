
import { db } from "../db"
import {
  usersTable,
  userTagsTable,
  tagsTable,
  thoughtsTable,
  communityMembersTable,
  communitiesTable,
  followersTable,
  liveEventParticipantsTable,
  liveEventsTable,
  postInviteParticipantsTable,
  postInvitesTable,
  postsTable,
  postLikesTable,
  postCommentsTable
} from "../db/schema"
import { eq, ne, and, sql, isNotNull, desc, inArray } from "drizzle-orm"
import { Pinecone, type ScoredPineconeRecord } from "@pinecone-database/pinecone"
import { openai } from "../lib/openai" // You'll need to create this

// Initialize Pinecone client - moved here from separate file
const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
})

type RecordMetadata = Record<string, any>

// Types based on your existing structure - Updated for UUID strings
export type RecommendedUser = {
  id: string // Changed from string | number to just string (UUID)
  username: string
  nickname?: string | null // Changed to match database nullable field
  image: string | null
  profileImage?: string | null // Added profileImage field
  tags: string[]
  similarity?: number
  proximity?: number | undefined
  score: number
  reason?: string | null
  tier?: number // Add tier information for debugging
  age?: number // Add age field
  location?: string // Add location field
}

type PaginatedRecommendations = {
  users: RecommendedUser[]
  hasMore: boolean
  nextPage: number | null
  totalCount?: number
  currentPage?: number
}

type UserSummary = {
  userId: string
  username: string
  summary: string
  topThoughts: string[]
}

type TierResults = {
  tier1Users: RecommendedUser[]
  tier2Users: RecommendedUser[]
  tier3Users: RecommendedUser[]
}

/**
 * Gets recommendations for a user based on thought similarity and community connections
 * Excludes users they already follow and prioritizes thought-based matching
 */
export async function getRecommendations(userId: string, page = 1, pageSize = 5): Promise<PaginatedRecommendations> {
  try {
    console.log(`=== STARTING getRecommendations for user ${userId}, page ${page}, pageSize ${pageSize} ===`)

    // First, try Pinecone-based thought similarity if available
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
      try {
        const pineconeResults = await getThoughtBasedRecommendations(userId, pageSize * 2)
        if (pineconeResults.length > 0) {
          console.log(`Found ${pineconeResults.length} thought-based recommendations`)

          // Apply pagination
          const startIdx = (page - 1) * pageSize
          const endIdx = startIdx + pageSize
          const paginatedUsers = pineconeResults.slice(startIdx, endIdx)
          const hasMore = endIdx < pineconeResults.length

          return {
            users: paginatedUsers,
            hasMore,
            nextPage: hasMore ? page + 1 : null,
            totalCount: pineconeResults.length,
            currentPage: page,
          }
        }
      } catch (pineconeError) {
        console.warn("Pinecone recommendations failed, falling back to community-based:", pineconeError)
      }
    }

    // Fallback to community-based recommendations
    console.log('Using community-based recommendations')
    const communityResults = await getCommunityBasedRecommendations(userId, pageSize * 2)

    // Apply pagination
    const startIdx = (page - 1) * pageSize
    const endIdx = startIdx + pageSize
    const paginatedUsers = communityResults.slice(startIdx, endIdx)
    const hasMore = endIdx < communityResults.length

    console.log(`Returning ${paginatedUsers.length} community-based recommendations`)

    return {
      users: paginatedUsers,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      totalCount: communityResults.length,
      currentPage: page,
    }
  } catch (error) {
    console.error("ERROR in getRecommendations:", error)

    // Return empty results on error
    return {
      users: [],
      hasMore: false,
      nextPage: null,
      totalCount: 0,
      currentPage: page,
    }
  }
}

/**
 * Get thought-based recommendations using Pinecone similarity
 * Excludes users the current user already follows
 */
async function getThoughtBasedRecommendations(userId: string, maxResults: number): Promise<RecommendedUser[]> {
  try {
    // Get current user's most recent thought embedding
    const userEmbedding = await getMostRecentUserEmbedding(userId)
    if (!userEmbedding || userEmbedding.length === 0) {
      console.log("No embedding found for current user")
      return []
    }

    // Get users that current user is already following
    const followingUsers = await db
      .select({ followingId: followersTable.followingId })
      .from(followersTable)
      .where(eq(followersTable.followerId, userId))

    const followingIds = followingUsers.map(f => f.followingId)
    console.log(`User ${userId} is following ${followingIds.length} users`)

    // Query Pinecone for similar users
    const indexName = process.env.PINECONE_INDEX || 'mirro-public'
    const index = pineconeClient.index(indexName)

    const queryResponse = await index.namespace('user-embeddings').query({
      vector: userEmbedding,
      topK: maxResults * 3, // Get more to account for filtering
      includeMetadata: true,
    })

    console.log(`Pinecone returned ${queryResponse.matches?.length || 0} matches`)

    // Filter out current user and users they already follow
    const filteredMatches = queryResponse.matches?.filter(match => {
      const matchUserId = match.metadata?.userId
      return matchUserId && matchUserId !== userId && !followingIds.includes(matchUserId as string)
    }) || []

    console.log(`After filtering: ${filteredMatches.length} potential matches`)

    // Get user details from database
    const userIds = filteredMatches
      .map(match => match.metadata?.userId)
      .filter((id): id is string => Boolean(id))

    if (userIds.length === 0) {
      return []
    }

    const userDetails = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        image: usersTable.image,
        profileImage: usersTable.profileImage,
        dob: usersTable.dob,
        metro_area: usersTable.metro_area,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, userIds))

    const userDetailsMap = new Map(userDetails.map(user => [user.id, user]))

    // Create recommendations with similarity scores
    const recommendations: RecommendedUser[] = []

    for (const match of filteredMatches) {
      const userDetail = userDetailsMap.get(match.metadata?.userId as string)
      if (!userDetail) continue

      // Calculate age
      const age = userDetail.dob ?
        Math.floor((Date.now() - new Date(userDetail.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) :
        undefined

      // Handle proximity - convert to number if it's a string
      const proximity = match.metadata?.proximity
      const proximityValue = typeof proximity === 'string' ? parseFloat(proximity) :
        typeof proximity === 'number' ? proximity : undefined

      recommendations.push({
        id: userDetail.id,
        username: userDetail.username,
        nickname: userDetail.nickname || null,
        image: userDetail.image || null,
        profileImage: userDetail.profileImage || null,
        tags: [],
        similarity: match.score || 0,
        proximity: proximityValue,
        score: match.score || 0,
        reason: null, // Will be generated later with AI narratives
        age,
        location: userDetail.metro_area || undefined,
      })
    }

    // Sort by similarity score and return top results
    return recommendations
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, maxResults)

  } catch (error) {
    console.error("Error in getThoughtBasedRecommendations:", error)
    return []
  }
}

/**
 * Get community-based recommendations for users in similar communities
 * Excludes users the current user already follows
 */
async function getCommunityBasedRecommendations(userId: string, maxResults: number): Promise<RecommendedUser[]> {
  try {
    // Get current user's communities
    const userCommunities = await db
      .select({ communityId: communityMembersTable.communityId })
      .from(communityMembersTable)
      .where(eq(communityMembersTable.userId, userId))

    const communityIds = userCommunities.map(c => c.communityId)
    console.log(`User ${userId} is in ${communityIds.length} communities`)

    if (communityIds.length === 0) {
      return []
    }

    // Get users that current user is already following
    const followingUsers = await db
      .select({ followingId: followersTable.followingId })
      .from(followersTable)
      .where(eq(followersTable.followerId, userId))

    const followingIds = followingUsers.map(f => f.followingId)

    // Find users in same communities who have thoughts and aren't followed
    const communityUsers = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        image: usersTable.image,
        profileImage: usersTable.profileImage,
        dob: usersTable.dob,
        metro_area: usersTable.metro_area,
        communityId: communityMembersTable.communityId,
        thoughtCount: sql<number>`(
          SELECT COUNT(*) FROM ${thoughtsTable}
          WHERE ${thoughtsTable.userId} = ${usersTable.id}
          AND ${thoughtsTable.content} IS NOT NULL
          AND LENGTH(${thoughtsTable.content}) > 10
        )`,
      })
      .from(usersTable)
      .innerJoin(communityMembersTable, eq(usersTable.id, communityMembersTable.userId))
      .where(
        and(
          ne(usersTable.id, userId),
          inArray(communityMembersTable.communityId, communityIds),
          sql`${usersTable.id} NOT IN (${followingIds.length > 0 ? followingIds.join("','") : "''"})`,
          sql`EXISTS (
            SELECT 1 FROM ${thoughtsTable}
            WHERE ${thoughtsTable.userId} = ${usersTable.id}
            AND ${thoughtsTable.content} IS NOT NULL
            AND LENGTH(${thoughtsTable.content}) > 10
            LIMIT 1
          )`
        )
      )
      .limit(maxResults * 2)

    console.log(`Found ${communityUsers.length} users in shared communities with thoughts`)

    // Calculate community overlap scores
    const userScores = new Map<string, { user: any, sharedCommunities: number }>()

    for (const user of communityUsers) {
      if (!userScores.has(user.id)) {
        userScores.set(user.id, { user, sharedCommunities: 0 })
      }
      userScores.get(user.id)!.sharedCommunities++
    }

    // Convert to recommendations
    const recommendations: RecommendedUser[] = Array.from(userScores.values()).map(({ user, sharedCommunities }) => {
      const age = user.dob ?
        Math.floor((Date.now() - new Date(user.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) :
        undefined

      // Score based on shared communities and thought count
      const score = (sharedCommunities * 0.7) + (Math.min(user.thoughtCount, 10) * 0.03)

      return {
        id: user.id,
        username: user.username,
        nickname: user.nickname || null,
        image: user.image || null,
        profileImage: user.profileImage || null,
        tags: [],
        similarity: score,
        proximity: undefined,
        score,
        reason: null,
        age,
        location: user.metro_area || undefined,
      }
    })

    // Sort by score and return top results
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)

  } catch (error) {
    console.error("Error in getCommunityBasedRecommendations:", error)
    return []
  }
}

/**
 * Check if a user has any thought embeddings
 */
async function userHasEmbeddings(userId: string): Promise<boolean> {
  try {
    const thoughtWithEmbedding = await db
      .select()
      .from(thoughtsTable)
      .where(
        and(
          eq(thoughtsTable.userId, userId),
          isNotNull(thoughtsTable.embedding),
          isNotNull(thoughtsTable.content)
        )
      )
      .limit(1)

    return thoughtWithEmbedding.length > 0
  } catch (error) {
    console.error("Error checking user embeddings:", error)
    return false
  }
}

/**
 * Get users separated by tiers based on embedding availability
 */
async function getAllTierUsers(userId: string, currentUserHasEmbeddings: boolean): Promise<TierResults> {
  const results: TierResults = {
    tier1Users: [],
    tier2Users: [],
    tier3Users: []
  }

  try {
    // Get embedding-based users if Pinecone is available
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME) {
      const embeddingUsers = await getEmbeddingBasedUsers(userId, 50) // Get more results

      // Separate embedding users by tier
      if (currentUserHasEmbeddings) {
        // If current user has embeddings, these are Tier 1 (AI explanation possible)
        results.tier1Users = embeddingUsers
      } else {
        // If current user has no embeddings, these are Tier 2 (narrative only)
        results.tier2Users = embeddingUsers
      }
    }

    // Get database users (Tier 3)
    const databaseUsers = await getDatabaseUsers(userId, 50)

    // Filter out users already in higher tiers
    const existingUserIds = new Set([
      ...results.tier1Users.map(u => u.id),
      ...results.tier2Users.map(u => u.id)
    ])

    results.tier3Users = databaseUsers.filter(user => !existingUserIds.has(user.id))

    console.log(`Tier distribution - T1: ${results.tier1Users.length}, T2: ${results.tier2Users.length}, T3: ${results.tier3Users.length}`)

    return results
  } catch (error) {
    console.error("Error getting tier users:", error)
    return results
  }
}

/**
 * Get database users without embedding requirements (for Tier 3)
 */
async function getDatabaseUsers(userId: string, maxResults: number): Promise<RecommendedUser[]> {
  try {
    // Get current user's data for matching preferences
    const currentUser = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)

    if (currentUser.length === 0) {
      return []
    }

    const user = currentUser[0]

    // Get current user's tags and communities for similarity scoring
    const userTags = await db
      .select({
        tagId: userTagsTable.tagId,
        tagName: tagsTable.name,
        category: tagsTable.category,
      })
      .from(userTagsTable)
      .innerJoin(tagsTable, eq(userTagsTable.tagId, tagsTable.id))
      .where(eq(userTagsTable.userId, userId))

    const userCommunities = await db
      .select({
        communityId: communityMembersTable.communityId,
      })
      .from(communityMembersTable)
      .where(eq(communityMembersTable.userId, userId))

    const userTagIds = userTags.map((tag) => tag.tagId)
    const userCommunityIds = userCommunities.map((community) => community.communityId)

    // Get potential matches
    const potentialMatches = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        image: usersTable.image,
        profileImage: usersTable.profileImage,
        dob: usersTable.dob,
        metro_area: usersTable.metro_area,
      })
      .from(usersTable)
      .where(ne(usersTable.id, userId))
      .limit(maxResults)

    // Score matches based on shared communities (prioritized) and common tags
    const scoredMatches: RecommendedUser[] = []

    for (const match of potentialMatches) {
      // Get tags and communities for this potential match
      const matchTags = await db
        .select({
          tagId: userTagsTable.tagId,
          tagName: tagsTable.name,
          category: tagsTable.category,
        })
        .from(userTagsTable)
        .innerJoin(tagsTable, eq(userTagsTable.tagId, tagsTable.id))
        .where(eq(userTagsTable.userId, match.id))

      const matchCommunities = await db
        .select({
          communityId: communityMembersTable.communityId,
        })
        .from(communityMembersTable)
        .where(eq(communityMembersTable.userId, match.id))

      const matchTagIds = matchTags.map((tag) => tag.tagId)
      const matchCommunityIds = matchCommunities.map((community) => community.communityId)

      // Calculate compatibility score - prioritize shared communities
      const commonCommunityIds = userCommunityIds.filter((communityId) => matchCommunityIds.includes(communityId))
      const commonTagIds = userTagIds.filter((tagId) => matchTagIds.includes(tagId))

      // Weight shared communities more heavily than tags
      const communityScore = commonCommunityIds.length * 3 // 3x weight for shared communities
      const tagScore = commonTagIds.length
      const score = communityScore + tagScore

      const recommendedUser: RecommendedUser = {
        id: match.id,
        username: match.username,
        nickname: match.nickname,
        image: match.image,
        profileImage: match.profileImage,
        tags: matchTags.map((tag) => tag.tagName).slice(0, 5),
        score,
        similarity: score / Math.max(userTagIds.length + userCommunityIds.length * 3, matchTagIds.length + matchCommunityIds.length * 3),
        reason: null,
      }

      scoredMatches.push(recommendedUser)
    }

    // Sort by score (highest compatibility first)
    scoredMatches.sort((a, b) => b.score - a.score)

    return scoredMatches
  } catch (error) {
    console.error("Error getting database users:", error)
    return []
  }
}

/**
 * Pinecone-based recommendations (your original logic)
 */
async function getPineconeRecommendations(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedRecommendations> {
  // Get the latest user embedding from your database
  const userEmbedding = await getMostRecentUserEmbedding(userId)

  if (!userEmbedding || userEmbedding.length === 0) {
    throw new Error("No user embedding found")
  }

  // Query Pinecone for similar users
  const index = pineconeClient.index(process.env.PINECONE_INDEX_NAME!)
  const queryResponse = await index.query({
    vector: userEmbedding,
    topK: pageSize * 5, // Query more than needed to account for filtering
    includeMetadata: true,
    filter: {
      userId: { $ne: userId }, // Exclude the current user
    },
  })

  // Get additional user data from database for the matched users
  const userIds = queryResponse.matches?.map((match) => match.metadata?.userId).filter(Boolean) || []

  const userDetails = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      nickname: usersTable.nickname,
      image: usersTable.image,
      profileImage: usersTable.profileImage,
    })
    .from(usersTable)
    .where(sql`${usersTable.id} = ANY(${userIds})`)

  // Create a map for quick lookup
  const userDetailsMap = new Map(userDetails.map((user) => [user.id, user]))

  // Process query results into recommendation format
  const results =
    queryResponse.matches?.map((match: ScoredPineconeRecord<RecordMetadata>) => {
      const metadata = match.metadata || {}
      const userDetail = userDetailsMap.get(metadata.userId)

      return {
        id: metadata.userId,
        username: userDetail?.username || metadata.username || `user${metadata.userId}`,
        nickname: userDetail?.nickname || metadata.nickname || null,
        image: userDetail?.image || null, // Get from database
        profileImage: userDetail?.profileImage || null, // Get from database
        tags: metadata.tags ? JSON.parse(metadata.tags) : [],
        similarity: match.score ?? 0,
        proximity: metadata.proximity || undefined,
        score: calculateOverallScore(match.score ?? 0, metadata.proximity),
        reason: null,
      }
    }) || []

  // Sort by score and paginate
  const sortedResults = results.sort((a, b) => b.score - a.score)
  const startIdx = (page - 1) * pageSize
  const endIdx = startIdx + pageSize
  const paginatedResults = sortedResults.slice(startIdx, endIdx)

  return {
    users: paginatedResults,
    hasMore: endIdx < sortedResults.length,
    nextPage: endIdx < sortedResults.length ? page + 1 : null,
    totalCount: sortedResults.length,
    currentPage: page,
  }
}

/**
 * Get users with embeddings (without pagination constraints)
 */
async function getEmbeddingBasedUsers(userId: string, maxResults = 10): Promise<RecommendedUser[]> {
  try {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
      console.log("Pinecone not configured, cannot get embedding-based users")
      return []
    }

    // Check if current user has embeddings
    const currentUserHasEmbeddings = await userHasEmbeddings(userId)
    console.log(`getEmbeddingBasedUsers: User ${userId} has embeddings: ${currentUserHasEmbeddings}`)

    if (currentUserHasEmbeddings) {
      // Current user has embeddings - use similarity-based matching
      const userEmbedding = await getMostRecentUserEmbedding(userId)

      if (!userEmbedding || userEmbedding.length === 0) {
        return []
      }

      // Query Pinecone for similar users - get significantly more results
      const indexName = process.env.PINECONE_INDEX || 'mirro-public'
      console.log(`Using Pinecone index: ${indexName}`)
      const index = pineconeClient.index(indexName)
      // Try with filter first, fallback without filter if it fails
      let queryResponse;
      try {
        queryResponse = await index.namespace('user-embeddings').query({
          vector: userEmbedding,
          topK: maxResults * 5,
          includeMetadata: true,
          filter: {
            id: { $ne: userId }
          }
        });
        console.log(`Pinecone query with filter returned ${queryResponse.matches?.length || 0} matches`);
      } catch (filterError) {
        console.log('Pinecone filter failed, trying without filter:', filterError instanceof Error ? filterError.message : String(filterError));
        queryResponse = await index.namespace('user-embeddings').query({
          vector: userEmbedding,
          topK: maxResults * 5,
          includeMetadata: true,
        });
        console.log(`Pinecone query without filter returned ${queryResponse.matches?.length || 0} matches`);
      }

      console.log(`Pinecone query returned ${queryResponse.matches?.length || 0} matches`)

      // Filter out current user and get user IDs
      const userIds = queryResponse.matches
        ?.map((match) => match.metadata?.userId)
        .filter((id): id is string => Boolean(id) && typeof id === 'string')
        .filter(id => id !== userId) || []

      console.log(`Found ${userIds.length} potential user matches (excluding current user)`)

      // TEMPORARY: Force fallback for testing
      console.log('FORCING FALLBACK - Pinecone returned:', userIds.length, 'user IDs')
      if (userIds.length === 0 || true) { // Force fallback
        console.log('Using database fallback for users with embeddings')
        // Fallback: get users with embeddings from database
        const fallbackUsers = await db
          .select({
            id: usersTable.id,
            username: usersTable.username,
            nickname: usersTable.nickname,
            image: usersTable.image,
            profileImage: usersTable.profileImage,
          })
          .from(usersTable)
          .where(
            and(
              ne(usersTable.id, userId),
              sql`EXISTS (
                SELECT 1 FROM ${thoughtsTable}
                WHERE ${thoughtsTable.userId} = ${usersTable.id}
                AND ${thoughtsTable.embedding} IS NOT NULL
                LIMIT 1
              )`
            )
          )
          .limit(maxResults)

        console.log(`Fallback found ${fallbackUsers.length} users with embeddings`)

        return fallbackUsers.map(user => ({
          id: user.id,
          username: user.username,
          nickname: user.nickname || null,
          image: user.image || null,
          profileImage: user.profileImage || null,
          tags: [],
          similarity: 0.5,
          proximity: undefined,
          score: 0.5,
          reason: null,
        }))
      }

    } else {
      // Current user has no embeddings - return a diverse set of users with embeddings
      console.log(`User ${userId} has no embeddings, getting diverse users with embeddings`)
      const usersWithEmbeddings = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          image: usersTable.image,
          profileImage: usersTable.profileImage,
        })
        .from(usersTable)
        .where(
          and(
            ne(usersTable.id, userId),
            sql`EXISTS (
              SELECT 1 FROM ${thoughtsTable}
              WHERE ${thoughtsTable.userId} = ${usersTable.id}
              AND ${thoughtsTable.embedding} IS NOT NULL
              LIMIT 1
            )`
          )
        )
        .limit(maxResults)

      console.log(`Found ${usersWithEmbeddings.length} diverse users with embeddings for user ${userId}`)

      return usersWithEmbeddings.map(user => ({
        id: user.id,
        username: user.username,
        nickname: user.nickname || null,
        image: user.image || null,
        profileImage: user.profileImage || null,
        tags: [],
        similarity: 0.5, // Default similarity for diverse recommendations
        proximity: undefined,
        score: 0.5,
        reason: null,
      }))
    }
  } catch (error) {
    console.error("Error getting embedding-based users:", error)
    return []
  }
}

/**
 * Database-based recommendations (fallback)
 */
async function getDatabaseRecommendations(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedRecommendations> {
  const offset = (page - 1) * pageSize

  // Get current user's data  
  const currentUser = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)

  if (currentUser.length === 0) {
    throw new Error("Current user not found")
  }

  const user = currentUser[0]

  // Get current user's tags and communities for similarity scoring
  const userTags = await db
    .select({
      tagId: userTagsTable.tagId,
      tagName: tagsTable.name,
      category: tagsTable.category,
    })
    .from(userTagsTable)
    .innerJoin(tagsTable, eq(userTagsTable.tagId, tagsTable.id))
    .where(eq(userTagsTable.userId, userId))

  const userCommunities = await db
    .select({
      communityId: communityMembersTable.communityId,
    })
    .from(communityMembersTable)
    .where(eq(communityMembersTable.userId, userId))

  const userTagIds = userTags.map((tag) => tag.tagId)
  const userCommunityIds = userCommunities.map((community) => community.communityId)

  // Get potential matches with image fields
  const potentialMatches = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      nickname: usersTable.nickname,
      image: usersTable.image,
      profileImage: usersTable.profileImage,
      dob: usersTable.dob,
      metro_area: usersTable.metro_area,
    })
    .from(usersTable)
    .where(ne(usersTable.id, userId))
    .limit(pageSize * 3)
    .offset(offset)

  // Score matches based on shared communities (prioritized) and common tags
  const scoredMatches: RecommendedUser[] = []

  for (const match of potentialMatches) {
    // Get tags and communities for this potential match
    const matchTags = await db
      .select({
        tagId: userTagsTable.tagId,
        tagName: tagsTable.name,
        category: tagsTable.category,
      })
      .from(userTagsTable)
      .innerJoin(tagsTable, eq(userTagsTable.tagId, tagsTable.id))
      .where(eq(userTagsTable.userId, match.id))

    const matchCommunities = await db
      .select({
        communityId: communityMembersTable.communityId,
      })
      .from(communityMembersTable)
      .where(eq(communityMembersTable.userId, match.id))

    const matchTagIds = matchTags.map((tag) => tag.tagId)
    const matchCommunityIds = matchCommunities.map((community) => community.communityId)

    // Calculate compatibility score - prioritize shared communities
    const commonCommunityIds = userCommunityIds.filter((communityId) => matchCommunityIds.includes(communityId))
    const commonTagIds = userTagIds.filter((tagId) => matchTagIds.includes(tagId))

    // Weight shared communities more heavily than tags
    const communityScore = commonCommunityIds.length * 3 // 3x weight for shared communities
    const tagScore = commonTagIds.length
    const score = communityScore + tagScore

    const recommendedUser: RecommendedUser = {
      id: match.id,
      username: match.username,
      nickname: match.nickname,
      image: match.image,
      profileImage: match.profileImage,
      tags: matchTags.map((tag) => tag.tagName).slice(0, 5),
      score,
      similarity: score / Math.max(userTagIds.length + userCommunityIds.length * 3, matchTagIds.length + matchCommunityIds.length * 3),
      reason: null,
    }

    scoredMatches.push(recommendedUser)
  }

  // Sort by score (highest compatibility first)
  scoredMatches.sort((a, b) => b.score - a.score)

  // Take only the requested page size
  const finalMatches = scoredMatches.slice(0, pageSize)

  // Get total count for pagination
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(ne(usersTable.id, userId))

  const totalCount = Number(totalCountResult[0]?.count || 0)
  const hasMore = offset + pageSize < totalCount

  return {
    users: finalMatches,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
    totalCount,
    currentPage: page,
  }
}

/**
 * Calculate dot product of two vectors
 */
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0)
}

/**
 * Calculate Euclidean norm (magnitude) of a vector
 */
function vectorNorm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
}

/**
 * Calculate similarity score between two users' thought embeddings
 */
async function calculatePairwiseSimilarity(userAThoughts: number[][], userBThoughts: number[][]) {
  // Calculate cosine similarity between all pairs of thoughts
  const similarityMatrix = [] as number[][]

  for (let i = 0; i < userAThoughts.length; i++) {
    similarityMatrix[i] = []
    for (let j = 0; j < userBThoughts.length; j++) {
      const similarity =
        dotProduct(userAThoughts[i], userBThoughts[j]) /
        (vectorNorm(userAThoughts[i]) * vectorNorm(userBThoughts[j]))
      similarityMatrix[i][j] = similarity
    }
  }

  return similarityMatrix
}

/**
 * Get top N most similar thought pairs between two users
 */
async function getTopSimilarThoughtPairs(userAId: string, userBId: string, topN = 4) {
  try {
    // Fetch thought embeddings for both users
    const userAThoughts = await getUserThoughtEmbeddings(userAId)
    const userBThoughts = await getUserThoughtEmbeddings(userBId)

    if (!userAThoughts.embeddings.length || !userBThoughts.embeddings.length) {
      return []
    }

    // Calculate similarity matrix
    const similarityMatrix = await calculatePairwiseSimilarity(userAThoughts.embeddings, userBThoughts.embeddings)

    // Find top N pairs
    const pairs = [] as {
      userAThoughtId: string
      userBThoughtId: string
      similarity: number
      userAThoughtText: string
      userBThoughtText: string
    }[]

    // Flatten matrix and sort by similarity
    const flatPairs = []
    for (let i = 0; i < similarityMatrix.length; i++) {
      for (let j = 0; j < similarityMatrix[i].length; j++) {
        flatPairs.push({
          userAIdx: i,
          userBIdx: j,
          similarity: similarityMatrix[i][j],
        })
      }
    }

    // Sort by similarity descending
    flatPairs.sort((a, b) => b.similarity - a.similarity)

    // Take top N pairs
    const topPairs = flatPairs.slice(0, topN)

    // Map indices back to actual thoughts
    for (const pair of topPairs) {
      pairs.push({
        userAThoughtId: userAThoughts.thoughtIds[pair.userAIdx],
        userBThoughtId: userBThoughts.thoughtIds[pair.userBIdx],
        similarity: pair.similarity,
        userAThoughtText: userAThoughts.thoughtTexts[pair.userAIdx],
        userBThoughtText: userBThoughts.thoughtTexts[pair.userBIdx],
      })
    }

    return pairs
  } catch (error) {
    console.error("Error getting top similar thought pairs:", error)
    return []
  }
}

/**
 * Generate user summary based on top thoughts
 */
async function generateUserSummary(userId: string, username: string, thoughts: string[]): Promise<string> {
  // For now, just concatenate thoughts with a character limit
  const combinedThoughts = thoughts.join(" ")
  return combinedThoughts.substring(0, 400)
}

/**
 * Generate explanation for why two users should connect
 * Enhanced with multi-tier fallback logic
 */
export async function generateConnectionExplanation(userA: RecommendedUser, currentUserId: string): Promise<string> {
  try {
    // Tier 1: Try AI-based explanation with both users' embeddings if OpenAI is configured
    if (process.env.OPENAI_API_KEY) {
      return await generateAIExplanation(userA, currentUserId)
    }
  } catch (error) {
    console.warn("AI explanation with both users failed:", error)
  }

  try {
    // Tier 2: Try narrative-only explanation using just the recommended user's embeddings
    if (process.env.OPENAI_API_KEY) {
      return await generateNarrativeOnlyExplanation(userA)
    }
  } catch (error) {
    console.warn("Narrative-only explanation failed, falling back to database:", error)
  }

  // Tier 3: Fallback to database-based explanation using common tags
  return await generateDatabaseExplanation(userA, currentUserId)
}

/**
 * AI-based explanation generation with updated prompt (Tier 1)
 */
async function generateAIExplanation(userA: RecommendedUser, currentUserId: string): Promise<string> {
  // Get top similar thought pairs
  const topPairs = await getTopSimilarThoughtPairs(currentUserId, userA.id)

  if (topPairs.length === 0) {
    throw new Error("No thought pairs found")
  }

  // Create summaries for both users
  const userAThoughts = topPairs.map((p) => p.userAThoughtText)
  const userBThoughts = topPairs.map((p) => p.userBThoughtText)

  const currentUser = await getUserBasicInfo(currentUserId)

  const userASummary = await generateUserSummary(currentUserId, currentUser.username, userAThoughts)

  const userBSummary = await generateUserSummary(userA.id, userA.username, userBThoughts)

  // Get display names (nickname if available, otherwise username)
  const currentUserNickname = currentUser.username // This already handles nickname fallback
  const recommendedUserNickname = userA.nickname || userA.username

  // Call OpenAI with your new prompt structure
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You create explanations about why two users might connect. Write in 80-100 words total. The first half should be a narrative about the person being recommended (using their nickname), describing their journey and approach. The second half should explain similarities and potential connections, addressing the user as "you" and referring to the recommended person by their nickname.

Examples:
"Alex writes about their art like they're talking to a close friend - honestly, sincerely, and with all their heart. They share the days when nothing works and celebrate the breakthroughs that make it all worthwhile. You'll see photos of their messy studio and stories about how chaos sometimes leads to their best work, then the next day they're posting about needing more structure to actually get things done. You both find peace in simple moments - Alex talks about morning meditation like it's coffee with an old friend, and that gentle approach to life seems to match yours perfectly. I think you and Alex could build something really beautiful together."

"Jordan writes about showing up as themselves at work with the same honesty you bring to those tough professional moments. They share those internal conversations you know so well - when to speak up in meetings, when to bite your tongue, how to stay true to yourself without closing doors. You both are figuring out how to be confident in your own ways: you through creative work, Jordan through diving deep into ideas and asking the right questions. There's something beautiful about how different your approaches are, yet how much they complement each other. You both care deeply about justice and spend way too much time perfecting your documentary photography. I have a feeling your conversations would be the kind that start over dinner and end at sunrise."`,
      },
      {
        role: "user",
        content: `Generate an 80-100 word explanation for why you should connect with ${recommendedUserNickname}.
        
        First half: Write a narrative about ${recommendedUserNickname} and their journey/approach based on: ${userBSummary}
        
        Second half: Explain similarities and connections between you (the user) and ${recommendedUserNickname}, addressing the user directly as "you". You (the user) are described as: ${userASummary}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  })

  return (
    response.choices[0].message.content ||
    "We think you two might have a lot in common based on your thoughts and interests."
  )
}

/**
 * Narrative-only explanation generation using just the recommended user's embeddings (Tier 2)
 */
async function generateNarrativeOnlyExplanation(userA: RecommendedUser): Promise<string> {
  // Get recommended user's thought embeddings
  const userBThoughts = await getUserThoughtEmbeddings(userA.id)

  if (!userBThoughts.embeddings.length) {
    throw new Error("No embeddings found for recommended user")
  }

  // Take their top thoughts (most recent or a selection)
  const topThoughts = userBThoughts.thoughtTexts.slice(0, 4)

  const userBSummary = await generateUserSummary(userA.id, userA.username, topThoughts)

  const recommendedUserNickname = userA.nickname || userA.username

  // Call OpenAI with narrative-only prompt
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You create narrative descriptions about users based on their thoughts and reflections. Write in 80-100 words total. Focus entirely on describing the person's journey, approach to life, and what makes them unique. Use their nickname and write as if describing someone the reader might want to get to know.

Examples:
"Alex writes about their art like they're talking to a close friend - honestly, sincerely, and with all their heart. They share the days when nothing works and celebrate the breakthroughs that make it all worthwhile. You'll see photos of their messy studio and stories about how chaos sometimes leads to their best work, then the next day they're posting about needing more structure to actually get things done. You both find peace in simple moments - Alex talks about morning meditation like it's coffee with an old friend, and that gentle approach to life seems to match yours perfectly. I think you and Alex could build something really beautiful together."

"Jordan writes about showing up as themselves at work with the same honesty you bring to those tough professional moments. They share those internal conversations you know so well - when to speak up in meetings, when to bite your tongue, how to stay true to yourself without closing doors. You both are figuring out how to be confident in your own ways: you through creative work, Jordan through diving deep into ideas and asking the right questions. There's something beautiful about how different your approaches are, yet how much they complement each other. You both care deeply about justice and spend way too much time perfecting your documentary photography. I have a feeling your conversations would be the kind that start over dinner and end at sunrise."`,
      },
      {
        role: "user",
        content: `Generate an 80-100 word narrative description of ${recommendedUserNickname} based on their thoughts and reflections: ${userBSummary}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  })

  return (
    response.choices[0].message.content ||
    `${recommendedUserNickname} has a unique perspective and approach to life that might interest you.`
  )
}

/**
 * Database-based explanation generation using common tags (Tier 3)
 */
async function generateDatabaseExplanation(userA: RecommendedUser, currentUserId: string): Promise<string> {
  // Get current user's tags
  const currentUserTags = await db
    .select({
      tagName: tagsTable.name,
      category: tagsTable.category,
    })
    .from(userTagsTable)
    .innerJoin(tagsTable, eq(userTagsTable.tagId, tagsTable.id))
    .where(eq(userTagsTable.userId, currentUserId))

  // Get recommended user's tags
  const recommendedUserTags = await db
    .select({
      tagName: tagsTable.name,
      category: tagsTable.category,
    })
    .from(userTagsTable)
    .innerJoin(tagsTable, eq(userTagsTable.tagId, tagsTable.id))
    .where(eq(userTagsTable.userId, userA.id))

  // Find common interests
  const currentUserInterests = currentUserTags.filter((tag) => tag.category === "interest").map((tag) => tag.tagName)

  const recommendedUserInterests = recommendedUserTags
    .filter((tag) => tag.category === "interest")
    .map((tag) => tag.tagName)

  const commonInterests = currentUserInterests.filter((interest) => recommendedUserInterests.includes(interest))

  // Find common contexts
  const currentUserContexts = currentUserTags.filter((tag) => tag.category === "context").map((tag) => tag.tagName)

  const recommendedUserContexts = recommendedUserTags
    .filter((tag) => tag.category === "context")
    .map((tag) => tag.tagName)

  const commonContexts = currentUserContexts.filter((context) => recommendedUserContexts.includes(context))

  // Find common intentions
  const currentUserIntentions = currentUserTags.filter((tag) => tag.category === "intention").map((tag) => tag.tagName)

  const recommendedUserIntentions = recommendedUserTags
    .filter((tag) => tag.category === "intention")
    .map((tag) => tag.tagName)

  const commonIntentions = currentUserIntentions.filter((intention) => recommendedUserIntentions.includes(intention))

  // Generate explanation based on commonalities
  const displayName = userA.nickname || userA.username
  let explanation = ""

  if (commonInterests.length > 0) {
    if (commonInterests.length === 1) {
      explanation = `You both share an interest in ${commonInterests[0]}.`
    } else if (commonInterests.length === 2) {
      explanation = `You both enjoy ${commonInterests[0]} and ${commonInterests[1]}.`
    } else {
      const firstTwo = commonInterests.slice(0, 2)
      const remaining = commonInterests.length - 2
      explanation = `You both enjoy ${firstTwo.join(", ")} and ${remaining} other shared interest${remaining > 1 ? "s" : ""}.`
    }
  }

  if (commonContexts.length > 0) {
    const contextText =
      commonContexts.length === 1 ? commonContexts[0] : `${commonContexts[0]} and other similar situations`

    if (explanation) {
      explanation += ` You're also both navigating ${contextText.toLowerCase()}.`
    } else {
      explanation = `You're both in similar life situations around ${contextText.toLowerCase()}.`
    }
  }

  if (commonIntentions.length > 0) {
    const intentionText =
      commonIntentions.length === 1 ? commonIntentions[0] : `${commonIntentions[0]} and other shared goals`

    if (explanation) {
      explanation += ` Plus, you both are looking to ${intentionText.toLowerCase()}.`
    } else {
      explanation = `You both are seeking ${intentionText.toLowerCase()}.`
    }
  }

  // Fallback if no common tags
  if (!explanation) {
    explanation = `${displayName} might offer a fresh perspective with different interests and experiences.`
  }

  return explanation
}

// Helper functions that integrate with your existing scripts

/**
 * Parse embedding string to number array (from syncEmbeddingsToPinecone.ts)
 */
function parseEmbedding(str: string): number[] | null {
  try {
    const embedding = JSON.parse(str)
    // Validate it's actually an array of numbers with reasonable length
    if (Array.isArray(embedding) && embedding.length > 0 && embedding.every((val) => typeof val === "number")) {
      return embedding
    }
    console.warn(
      "Invalid embedding format:",
      typeof embedding,
      Array.isArray(embedding) ? `length: ${embedding.length}` : "",
    )
    return null
  } catch (error) {
    console.error("Failed to parse embedding:", error)
    return null
  }
}

/**
 * Get most recent user embedding - integrated from syncEmbeddingsToPinecone.ts
 */
async function getMostRecentUserEmbedding(userId: string): Promise<number[]> {
  try {
    // Get the most recent thought with embedding for this specific user
    const userThought = await db
      .select()
      .from(thoughtsTable)
      .where(and(eq(thoughtsTable.userId, userId), isNotNull(thoughtsTable.embedding)))
      .orderBy(desc(thoughtsTable.createdAt))
      .limit(1)

    if (userThought.length === 0) {
      console.log(`No thoughts with embeddings found for user ${userId}`)
      return []
    }

    const embeddingStr = userThought[0].embedding
    if (!embeddingStr) {
      console.log(`No embedding found for user ${userId}`)
      return []
    }

    const embedding = parseEmbedding(embeddingStr)
    if (!embedding) {
      console.log(`Invalid embedding found for user ${userId}`)
      return []
    }

    return embedding
  } catch (error) {
    console.error("Error getting user embedding:", error)
    return []
  }
}

/**
 * Get all thought embeddings for a user - integrated from updateThoughtEmbeddings.ts
 */
async function getUserThoughtEmbeddings(userId: string) {
  try {
    // Get all thoughts with embeddings for this user
    const thoughts = await db
      .select()
      .from(thoughtsTable)
      .where(
        and(eq(thoughtsTable.userId, userId), isNotNull(thoughtsTable.embedding), isNotNull(thoughtsTable.content)),
      )
      .orderBy(desc(thoughtsTable.createdAt))

    const thoughtIds: string[] = []
    const thoughtTexts: string[] = []
    const embeddings: number[][] = []

    for (const thought of thoughts) {
      if (!thought.content || !thought.embedding) continue

      const embedding = parseEmbedding(thought.embedding)
      if (embedding) {
        thoughtIds.push(thought.id.toString())
        thoughtTexts.push(thought.content)
        embeddings.push(embedding)
      }
    }

    console.log(`Retrieved ${embeddings.length} valid embeddings for user ${userId}`)

    return {
      thoughtIds,
      thoughtTexts,
      embeddings,
    }
  } catch (error) {
    console.error("Error getting user thought embeddings:", error)
    return {
      thoughtIds: [] as string[],
      thoughtTexts: [] as string[],
      embeddings: [] as number[][],
    }
  }
}

async function getUserBasicInfo(userId: string) {
  // Get basic user info from your database
  try {
    const user = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)

    return {
      username: user[0]?.nickname || user[0]?.username || `user${userId}`,
    }
  } catch (error) {
    console.error("Error getting user basic info:", error)
    return {
      username: `user${userId}`,
    }
  }
}

/**
 * Calculate event attendance similarity between two users
 */
async function calculateEventAttendanceSimilarity(userAId: string, userBId: string): Promise<number> {
  try {
    // Get events that userA attended
    const userAEvents = await db
      .select({ eventId: liveEventParticipantsTable.eventId })
      .from(liveEventParticipantsTable)
      .where(eq(liveEventParticipantsTable.userId, userAId))

    // Get events that userB attended
    const userBEvents = await db
      .select({ eventId: liveEventParticipantsTable.eventId })
      .from(liveEventParticipantsTable)
      .where(eq(liveEventParticipantsTable.userId, userBId))

    // Get post invites that userA participated in
    const userAInvites = await db
      .select({ inviteId: postInviteParticipantsTable.inviteId })
      .from(postInviteParticipantsTable)
      .where(eq(postInviteParticipantsTable.userId, userAId))

    // Get post invites that userB participated in
    const userBInvites = await db
      .select({ inviteId: postInviteParticipantsTable.inviteId })
      .from(postInviteParticipantsTable)
      .where(eq(postInviteParticipantsTable.userId, userBId))

    // Find shared events
    const userAEventIds = new Set(userAEvents.map(e => e.eventId))
    const userBEventIds = new Set(userBEvents.map(e => e.eventId))
    const sharedEventIds = new Set([...userAEventIds].filter(x => userBEventIds.has(x)))

    // Find shared post invites
    const userAInviteIds = new Set(userAInvites.map(i => i.inviteId))
    const userBInviteIds = new Set(userBInvites.map(i => i.inviteId))
    const sharedInviteIds = new Set([...userAInviteIds].filter(x => userBInviteIds.has(x)))

    // Calculate similarity score based on shared events/activities
    const sharedEventCount = sharedEventIds.size + sharedInviteIds.size

    // Return normalized score (0-1, with diminishing returns)
    return Math.min(sharedEventCount * 0.1, 1.0) // Each shared event adds 0.1, max 1.0
  } catch (error) {
    console.error("Error calculating event attendance similarity:", error)
    return 0
  }
}

/**
 * Calculate feed preference similarity based on post interactions
 */
async function calculateFeedPreferenceSimilarity(userAId: string, userBId: string): Promise<number> {
  try {
    // Get posts both users have interacted with (liked or commented on)
    const userALikedPosts = await db
      .select({ postId: postLikesTable.postId })
      .from(postLikesTable)
      .where(eq(postLikesTable.userId, userAId))

    const userBLikedPosts = await db
      .select({ postId: postLikesTable.postId })
      .from(postLikesTable)
      .where(eq(postLikesTable.userId, userBId))

    const userACommentedPosts = await db
      .select({ postId: postCommentsTable.postId })
      .from(postCommentsTable)
      .where(eq(postCommentsTable.userId, userAId))

    const userBCommentedPosts = await db
      .select({ postId: postCommentsTable.postId })
      .from(postCommentsTable)
      .where(eq(postCommentsTable.userId, userBId))

    // Combine liked and commented posts for each user
    const userAInteractedPosts = new Set([
      ...userALikedPosts.map(p => p.postId),
      ...userACommentedPosts.map(p => p.postId)
    ])

    const userBInteractedPosts = new Set([
      ...userBLikedPosts.map(p => p.postId),
      ...userBCommentedPosts.map(p => p.postId)
    ])

    // Calculate overlap
    const intersection = new Set([...userAInteractedPosts].filter(x => userBInteractedPosts.has(x)))
    const union = new Set([...userAInteractedPosts, ...userBInteractedPosts])

    // Calculate Jaccard similarity
    if (union.size === 0) return 0
    return intersection.size / union.size
  } catch (error) {
    console.error("Error calculating feed preference similarity:", error)
    return 0
  }
}

function calculateOverallScore(similarity: number, proximity?: number | undefined, eventSimilarity = 0, feedSimilarity = 0): number {
  // Weights for different factors
  const embeddingWeight = 0.5      // 50% - semantic similarity from thoughts
  const eventWeight = 0.25         // 25% - shared event attendance
  const feedWeight = 0.15          // 15% - shared feed preferences
  const proximityWeight = 0.1      // 10% - geographic proximity

  let score = similarity * embeddingWeight + eventSimilarity * eventWeight + feedSimilarity * feedWeight

  // Add proximity bonus if available
  if (proximity !== undefined) {
    const proximityNormalized = Math.min(proximity, 100) / 100
    score += ((1 - proximityNormalized) * proximityWeight)
  }

  return Math.min(score, 1.0) // Cap at 1.0
}

// Export functions that might be used by other scripts
export { getMostRecentUserEmbedding, getUserThoughtEmbeddings, parseEmbedding }
