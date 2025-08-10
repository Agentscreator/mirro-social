import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { groupStoriesTable, groupMembersTable, groupStoryViewsTable, usersTable } from "@/src/db/schema"
import { eq, and, gt, desc, sql } from "drizzle-orm"

// GET - Fetch group stories
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params

    // Check if user is a member of the group
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, parseInt(groupId)),
          eq(groupMembersTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get active group stories (not expired)
    const stories = await db
      .select({
        id: groupStoriesTable.id,
        content: groupStoriesTable.content,
        image: groupStoriesTable.image,
        video: groupStoriesTable.video,
        createdAt: groupStoriesTable.createdAt,
        expiresAt: groupStoriesTable.expiresAt,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          profileImage: usersTable.profileImage,
        },
        viewCount: sql<number>`COUNT(${groupStoryViewsTable.id})::int`,
        hasViewed: sql<boolean>`CASE WHEN ${groupStoryViewsTable.userId} = ${session.user.id} THEN true ELSE false END`,
      })
      .from(groupStoriesTable)
      .innerJoin(usersTable, eq(groupStoriesTable.userId, usersTable.id))
      .leftJoin(groupStoryViewsTable, eq(groupStoryViewsTable.storyId, groupStoriesTable.id))
      .where(
        and(
          eq(groupStoriesTable.groupId, parseInt(groupId)),
          gt(groupStoriesTable.expiresAt, new Date())
        )
      )
      .groupBy(
        groupStoriesTable.id,
        usersTable.id,
        groupStoryViewsTable.userId
      )
      .orderBy(desc(groupStoriesTable.createdAt))

    return NextResponse.json({ stories })
  } catch (error) {
    console.error("Error fetching group stories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create group story
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params
    const body = await request.json()
    const { content, image, video } = body

    // Check if user is a member of the group
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, parseInt(groupId)),
          eq(groupMembersTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Validate input
    if (!content && !image && !video) {
      return NextResponse.json({ error: "Content, image, or video is required" }, { status: 400 })
    }

    // Set expiry to 24 hours from now
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create the story
    const newStory = await db
      .insert(groupStoriesTable)
      .values({
        groupId: parseInt(groupId),
        userId: session.user.id,
        content: content?.trim() || null,
        image: image || null,
        video: video || null,
        expiresAt,
      })
      .returning()

    return NextResponse.json({
      story: newStory[0],
      message: "Story created successfully",
    })
  } catch (error) {
    console.error("Error creating group story:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}