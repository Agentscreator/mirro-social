import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { storiesTable, storyViewsTable, usersTable, followersTable, communitiesTable, communityMembersTable } from "@/src/db/schema"
import { eq, and, gt, desc, sql, inArray, or } from "drizzle-orm"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
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

    // Fetch active stories (not expired) from:
    // 1. Personal stories from followed users and self
    // 2. Community stories from communities the user is a member of
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
            // Community stories from user's communities
            and(
              eq(storiesTable.type, "community"),
              userCommunityIds.length > 0 ? inArray(storiesTable.communityId, userCommunityIds) : sql`false`
            )
          )
        )
      )
      .orderBy(desc(storiesTable.createdAt))

    // Format the response
    const stories = storiesQuery.map((story) => ({
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

    return NextResponse.json({ stories })
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
      const uploadDir = isVideo ? "videos" : "images"

      // Create upload directory if it doesn't exist
      const uploadPath = join(process.cwd(), "public", "uploads", "stories", uploadDir)
      await mkdir(uploadPath, { recursive: true })

      // Save file
      const filePath = join(uploadPath, fileName)
      await writeFile(filePath, buffer)

      // Set the URL
      const fileUrl = `/uploads/stories/${uploadDir}/${fileName}`
      if (isVideo) {
        videoUrl = fileUrl
      } else {
        imageUrl = fileUrl
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
