import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, postInvitesTable, groupsTable, groupMembersTable } from "@/src/db/schema"

// POST - Create a new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content, image, video, duration, inviteLimit, editedVideoData, autoAcceptInvites, groupName } = body

    // Validate input
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Content too long (max 2000 characters)" }, { status: 400 })
    }

    // Require either image or video (prefer video for new posts)
    if (!video && !image) {
      return NextResponse.json({ error: "Either video or image URL is required" }, { status: 400 })
    }

    // Validate URLs if provided
    if (video) {
      try {
        new URL(video)
      } catch {
        return NextResponse.json({ error: "Invalid video URL format" }, { status: 400 })
      }
    }
    
    if (image) {
      try {
        new URL(image)
      } catch {
        return NextResponse.json({ error: "Invalid image URL format" }, { status: 400 })
      }
    }

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== 'number' || duration <= 0 || duration > 300)) {
      return NextResponse.json({ error: "Duration must be between 1-300 seconds" }, { status: 400 })
    }

    // Create the post
    const newPost = await db
      .insert(postsTable)
      .values({
        userId: session.user.id,
        content: content.trim(),
        image: image?.trim() || null,
        video: video?.trim() || null,
        duration: duration || null,
        editedVideoData: editedVideoData ? JSON.stringify(editedVideoData) : null,
        autoAcceptInvites: autoAcceptInvites ? 1 : 0,
        groupName: groupName?.trim() || null,
      })
      .returning()

    let createdGroup = null

    // Create invite if limit is specified
    if (inviteLimit && inviteLimit > 0) {
      await db
        .insert(postInvitesTable)
        .values({
          postId: newPost[0].id,
          participantLimit: inviteLimit, // No limit restriction
          currentParticipants: 0,
        })

      // Create group if groupName is provided and autoAcceptInvites is enabled
      if (groupName && autoAcceptInvites) {
        const newGroup = await db
          .insert(groupsTable)
          .values({
            name: groupName.trim(),
            description: `Group created from post: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
            createdBy: session.user.id,
            postId: newPost[0].id,
            maxMembers: inviteLimit,
            isActive: 1,
          })
          .returning()

        // Add creator as admin member
        await db
          .insert(groupMembersTable)
          .values({
            groupId: newGroup[0].id,
            userId: session.user.id,
            role: "admin",
          })

        createdGroup = newGroup[0]
      }
    }

    return NextResponse.json({
      post: newPost[0],
      group: createdGroup,
      message: createdGroup 
        ? "Post and group created successfully" 
        : "Post created successfully",
    })
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}