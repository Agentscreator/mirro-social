import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { storiesTable, storyViewsTable, usersTable, followersTable, communitiesTable, communityMembersTable, groupStoriesTable, groupStoryViewsTable, groupsTable, groupMembersTable } from "@/src/db/schema"
import { eq, and, gt, desc, sql, inArray, or } from "drizzle-orm"
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from "uuid"

// GET /api/stories - Fetch stories from followed users and own stories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()

    // Get users that the current user follows + their own stories
    const followedUsersQuery = await db
      .select({ followingId: followersTable.followingId })
      .from(followersTable)
      .where(eq(followersTable.followerId, userId))

    const followedUserIds = followedUsersQuery.map((f) => f.followingId)
    const allUserIds = [userId, ...followedUserIds] // Include own stories

    // Get communities the user is a member of
    const userCommunitiesQuery = await db
      .select({ communityId: communityMembersTable.communityId })
      .from(communityMembersTable)
      .where(eq(communityMembersTable.userId, userId))

    const userCommunityIds = userCommunitiesQuery.map((c) => c.communityId)

    // Get communities that friends are members of
    const friendsCommunitiesQuery = await db
      .select({ communityId: communityMembersTable.communityId })
      .from(communityMembersTable)
      .where(
        followedUserIds.length > 0 
          ? inArray(communityMembersTable.userId, followedUserIds)
          : sql`false`
      )

    const friendsCommunityIds = friendsCommunitiesQuery.map((c) => c.communityId)
    
    // Combine all community IDs (user's communities + friends' communities)
    const allCommunityIds = Array.from(new Set([...userCommunityIds, ...friendsCommunityIds]))

    // Get groups the user is a member of
    const userGroupsQuery = await db
      .select({ groupId: groupMembersTable.groupId })
      .from(groupMembersTable)
      .where(eq(groupMembersTable.userId, userId))

    const userGroupIds = userGroupsQuery.map((g) => g.groupId)

    // Get groups that friends are members of
    const friendsGroupsQuery = await db
      .select({ groupId: groupMembersTable.groupId })
      .from(groupMembersTable)
      .where(
        followedUserIds.length > 0 
          ? inArray(groupMembersTable.userId, followedUserIds)
          : sql`false`
      )

    const friendsGroupIds = friendsGroupsQuery.map((g) => g.groupId)
    
    // Combine all group IDs (user's groups + friends' groups)
    const allGroupIds = Array.from(new Set([...userGroupIds, ...friendsGroupIds]))

    // Fetch active stories (not expired) from:
    // 1. Personal stories from followed users and self
    // 2. Community stories from communities the user is a member of + friends' communities
    const storiesQuery = await db
      .select({
        id: storiesTable.id,
        userId: storiesTable.userId,
        type: storiesTable.type,
        communityId: storiesTable.communityId,
        content: storiesTable.content,
        image: storiesTable.image,
        video: storiesTable.video,
        createdAt: storiesTable.createdAt,
        expiresAt: storiesTable.expiresAt,
        username: usersTable.username,
        nickname: usersTable.nickname,
        profileImage: usersTable.profileImage,
        communityName: communitiesTable.name,
        communityImage: communitiesTable.image,
        // Check if current user has viewed this story
        isViewed: sql<boolean>`EXISTS(
          SELECT 1 FROM ${storyViewsTable} 
          WHERE ${storyViewsTable.storyId} = ${storiesTable.id} 
          AND ${storyViewsTable.userId} = ${userId}
        )`,
        // Count total views
        views: sql<number>`(
          SELECT COUNT(*) FROM ${storyViewsTable} 
          WHERE ${storyViewsTable.storyId} = ${storiesTable.id}
        )`,
      })
      .from(storiesTable)
      .innerJoin(usersTable, eq(storiesTable.userId, usersTable.id))
      .leftJoin(communitiesTable, eq(storiesTable.communityId, communitiesTable.id))
      .where(
        and(
          gt(storiesTable.expiresAt, now),
          or(
            // Personal stories from followed users and self
            and(
              eq(storiesTable.type, "personal"),
              allUserIds.length > 0 ? inArray(storiesTable.userId, allUserIds) : sql`false`
            ),
            // Community stories from user's communities + friends' communities
            and(
              eq(storiesTable.type, "community"),
              allCommunityIds.length > 0 ? inArray(storiesTable.communityId, allCommunityIds) : sql`false`
            )
          )
        )
      )
      .orderBy(desc(storiesTable.createdAt))

    // Fetch group stories separately
    const groupStoriesQuery = await db
      .select({
        id: groupStoriesTable.id,
        userId: groupStoriesTable.userId,
        groupId: groupStoriesTable.groupId,
        content: groupStoriesTable.content,
        image: groupStoriesTable.image,
        video: groupStoriesTable.video,
        createdAt: groupStoriesTable.createdAt,
        expiresAt: groupStoriesTable.expiresAt,
        username: usersTable.username,
        nickname: usersTable.nickname,
        profileImage: usersTable.profileImage,
        groupName: groupsTable.name,
        groupImage: groupsTable.image,
        // Check if current user has viewed this group story
        isViewed: sql<boolean>`EXISTS(
          SELECT 1 FROM ${groupStoryViewsTable} 
          WHERE ${groupStoryViewsTable.storyId} = ${groupStoriesTable.id} 
          AND ${groupStoryViewsTable.userId} = ${userId}
        )`,
        // Count total views
        views: sql<number>`(
          SELECT COUNT(*) FROM ${groupStoryViewsTable} 
          WHERE ${groupStoryViewsTable.storyId} = ${groupStoriesTable.id}
        )`,
      })
      .from(groupStoriesTable)
      .innerJoin(usersTable, eq(groupStoriesTable.userId, usersTable.id))
      .innerJoin(groupsTable, eq(groupStoriesTable.groupId, groupsTable.id))
      .where(
        and(
          gt(groupStoriesTable.expiresAt, now),
          allGroupIds.length > 0 ? inArray(groupStoriesTable.groupId, allGroupIds) : sql`false`
        )
      )
      .orderBy(desc(groupStoriesTable.createdAt))

    // Format regular stories
    const formattedStories = storiesQuery.map((story) => ({
      id: story.id,
      userId: story.userId,
      type: story.type,
      communityId: story.communityId,
      content: story.content,
      image: story.image,
      video: story.video,
      createdAt: story.createdAt?.toISOString(),
      expiresAt: story.expiresAt?.toISOString(),
      views: story.views || 0,
      isViewed: story.isViewed || false,
      user: {
        id: story.userId,
        username: story.username,
        nickname: story.nickname,
        profileImage: story.profileImage,
      },
      community: story.type === "community" ? {
        id: story.communityId,
        name: story.communityName,
        image: story.communityImage,
      } : null,
    }))

    // Format group stories as community stories for consistent display
    const formattedGroupStories = groupStoriesQuery.map((story) => ({
      id: `group_${story.id}`, // Prefix to distinguish from regular stories
      userId: story.userId,
      type: "community", // Treat as community type for the frontend
      communityId: story.groupId?.toString(),
      content: story.content,
      image: story.image,
      video: story.video,
      createdAt: story.createdAt?.toISOString(),
      expiresAt: story.expiresAt?.toISOString(),
      views: story.views || 0,
      isViewed: story.isViewed || false,
      user: {
        id: story.userId,
        username: story.username,
        nickname: story.nickname,
        profileImage: story.profileImage,
      },
      community: {
        id: story.groupId?.toString(),
        name: story.groupName,
        image: story.groupImage,
      },
    }))

    // Combine all stories and sort by creation date
    const allStories = [...formattedStories, ...formattedGroupStories]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ stories: allStories })
  } catch (error) {
    console.error("Error fetching stories:", error)
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 })
  }
}

// POST /api/stories - Create a new story
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const formData = await request.formData()

    const content = formData.get("content") as string
    const mediaFile = formData.get("media") as File | null
    const storyType = (formData.get("type") as string) || "personal"
    const communityId = formData.get("communityId") as string | null

    // Validate that we have either content or media
    if (!content?.trim() && !mediaFile) {
      return NextResponse.json({ error: "Story must have either text content or media" }, { status: 400 })
    }

    // Validate community story requirements
    if (storyType === "community") {
      if (!communityId) {
        return NextResponse.json({ error: "Community ID is required for community stories" }, { status: 400 })
      }

      // Check if user is a member of the community
      const membership = await db
        .select()
        .from(communityMembersTable)
        .where(and(eq(communityMembersTable.communityId, communityId), eq(communityMembersTable.userId, userId)))
        .limit(1)

      if (membership.length === 0) {
        return NextResponse.json({ error: "You must be a member of this community to post stories" }, { status: 403 })
      }
    }

    let imageUrl: string | null = null
    let videoUrl: string | null = null

    // Handle media upload
    if (mediaFile) {
      const bytes = await mediaFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Generate unique filename
      const fileExtension = mediaFile.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExtension}`

      // Determine if it's image or video
      const isVideo = mediaFile.type.startsWith("video/")
      const pathname = `stories/${isVideo ? 'videos' : 'images'}/${fileName}`

      // Upload to Vercel Blob
      const blob = await put(pathname, buffer, {
        access: 'public',
        contentType: mediaFile.type,
      })

      // Set the URL
      if (isVideo) {
        videoUrl = blob.url
      } else {
        imageUrl = blob.url
      }
    }

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Insert story into database
    const [newStory] = await db
      .insert(storiesTable)
      .values({
        userId,
        type: storyType as "personal" | "community",
        communityId: storyType === "community" ? communityId : null,
        content: content?.trim() || null,
        image: imageUrl,
        video: videoUrl,
        expiresAt,
      })
      .returning()

    // Get user info and community info for response
    const [userInfo] = await db
      .select({
        username: usersTable.username,
        nickname: usersTable.nickname,
        profileImage: usersTable.profileImage,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))

    let communityInfo = null
    if (storyType === "community" && communityId) {
      const [community] = await db
        .select({
          id: communitiesTable.id,
          name: communitiesTable.name,
          image: communitiesTable.image,
        })
        .from(communitiesTable)
        .where(eq(communitiesTable.id, communityId))
      communityInfo = community || null
    }

    // Format response
    const storyResponse = {
      id: newStory.id,
      userId: newStory.userId,
      type: newStory.type,
      communityId: newStory.communityId,
      content: newStory.content,
      image: newStory.image,
      video: newStory.video,
      createdAt: newStory.createdAt?.toISOString(),
      expiresAt: newStory.expiresAt?.toISOString(),
      views: 0,
      isViewed: false,
      user: {
        id: userId,
        username: userInfo?.username,
        nickname: userInfo?.nickname,
        profileImage: userInfo?.profileImage,
      },
      community: communityInfo,
    }

    return NextResponse.json(storyResponse, { status: 201 })
  } catch (error) {
    console.error("Error creating story:", error)
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 })
  }
}
