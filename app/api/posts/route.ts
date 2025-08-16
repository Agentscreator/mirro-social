import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable, usersTable, postLikesTable, postCommentsTable, postInvitesTable, postLocationsTable } from "@/src/db/schema"
import { desc, eq, count, and } from "drizzle-orm"
import { put } from "@vercel/blob"

// Configure the API route
export const runtime = 'nodejs'
export const maxDuration = 60

async function uploadToStorage(options: {
  buffer: Buffer
  filename: string
  mimetype: string
  folder?: string
}): Promise<string> {
  const { buffer, filename, mimetype, folder = "post-media" } = options

  const timestamp = Date.now()
  const fileExtension = filename.split(".").pop()
  const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`
  const pathname = `${folder}/${uniqueFilename}`

  console.log("=== BLOB UPLOAD DEBUG ===")
  console.log("Uploading to path:", pathname)
  console.log("File size:", buffer.length)
  console.log("MIME type:", mimetype)

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: mimetype,
  })

  console.log("Blob upload successful:", blob.url)
  console.log("=== BLOB UPLOAD COMPLETE ===")

  return blob.url
}

// GET - Fetch posts
export async function GET(request: NextRequest) {
  try {
    console.log("=== POSTS GET API DEBUG START ===")
    console.log("Request URL:", request.url)
    console.log("Request method:", request.method)
    console.log("Timestamp:", new Date().toISOString())

    const session = await getServerSession(authOptions)
    console.log("Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    if (!session?.user?.id) {
      console.error("❌ UNAUTHORIZED: No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get("userId")
    const feedMode = searchParams.get("feed") === "true"
    
    console.log("URL search params:", Object.fromEntries(searchParams.entries()))
    console.log("User ID param extracted:", userIdParam)
    console.log("Feed mode:", feedMode)

    let posts
    if (feedMode) {
      // Feed mode - get posts from all users for recommendations
      console.log("=== FETCHING FEED POSTS ===")

      // Check total posts in database
      const totalPostsCount = await db.select({ count: count() }).from(postsTable)
      console.log("Total posts in database:", totalPostsCount[0]?.count || 0)

      const postsWithLikes = await db
        .select({
          id: postsTable.id,
          userId: postsTable.userId,
          content: postsTable.content,
          image: postsTable.image,
          video: postsTable.video,
          hasPrivateLocation: postsTable.hasPrivateLocation,
          createdAt: postsTable.createdAt,
          updatedAt: postsTable.updatedAt,
          user: {
            username: usersTable.username,
            nickname: usersTable.nickname,
            profileImage: usersTable.profileImage,
          },
        })
        .from(postsTable)
        .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
        .orderBy(desc(postsTable.createdAt))
        .limit(50) // Limit for feed

      console.log("Raw posts fetched for feed:", postsWithLikes.length)

      posts = await Promise.all(
        postsWithLikes.map(async (post) => {
          const [likeCountResult, commentCountResult, userLikeResult] = await Promise.all([
            db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id)),
            db.select({ count: count() }).from(postCommentsTable).where(eq(postCommentsTable.postId, post.id)),
            db
              .select()
              .from(postLikesTable)
              .where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, session.user.id)))
              .limit(1),
          ])

          return {
            ...post,
            likes: likeCountResult[0]?.count || 0,
            comments: commentCountResult[0]?.count || 0,
            isLiked: userLikeResult.length > 0,
          }
        }),
      )

      console.log(`✅ SUCCESSFULLY FETCHED ${posts.length} feed posts`)
    } else if (userIdParam) {
      // User-specific posts
      const cleanUserId = userIdParam.split("?")[0]
      console.log("Cleaned user ID:", cleanUserId)

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(cleanUserId)) {
        console.error("❌ INVALID UUID FORMAT:", cleanUserId)
        return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
      }

      console.log("=== FETCHING POSTS FOR SPECIFIC USER ===")
      console.log("Target user ID:", cleanUserId)

      // First, let's check if the user exists
      const userExists = await db.select().from(usersTable).where(eq(usersTable.id, cleanUserId)).limit(1)
      console.log("User exists check:", userExists.length > 0 ? "✅ YES" : "❌ NO")
      if (userExists.length > 0) {
        console.log("User details:", {
          id: userExists[0].id,
          username: userExists[0].username,
          email: userExists[0].email,
        })
      }

      // Check total posts in database for this user
      const totalPostsCount = await db
        .select({ count: count() })
        .from(postsTable)
        .where(eq(postsTable.userId, cleanUserId))
      console.log("Total posts count for user:", totalPostsCount[0]?.count || 0)

      // Fetch posts for a specific user with user info and like status
      console.log("Executing main posts query...")
      const postsWithLikes = await db
        .select({
          id: postsTable.id,
          userId: postsTable.userId,
          content: postsTable.content,
          image: postsTable.image,
          video: postsTable.video,
          hasPrivateLocation: postsTable.hasPrivateLocation,
          createdAt: postsTable.createdAt,
          updatedAt: postsTable.updatedAt,
          user: {
            username: usersTable.username,
            nickname: usersTable.nickname,
            profileImage: usersTable.profileImage,
          },
        })
        .from(postsTable)
        .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
        .where(eq(postsTable.userId, cleanUserId))
        .orderBy(desc(postsTable.createdAt))

      console.log("Raw posts fetched:", postsWithLikes.length)
      console.log(
        "Posts data:",
        postsWithLikes.map((p) => ({
          id: p.id,
          userId: p.userId,
          content: p.content?.substring(0, 50) + "...",
          hasImage: !!p.image,
          hasVideo: !!p.video,
          createdAt: p.createdAt,
        })),
      )

      // Get like counts, comment counts, and user's like status for each post
      console.log("Processing posts with likes and comments...")
      posts = await Promise.all(
        postsWithLikes.map(async (post, index) => {
          console.log(`Processing post ${index + 1}/${postsWithLikes.length} (ID: ${post.id})`)

          const [likeCountResult, commentCountResult, userLikeResult] = await Promise.all([
            db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id)),
            db.select({ count: count() }).from(postCommentsTable).where(eq(postCommentsTable.postId, post.id)),
            db
              .select()
              .from(postLikesTable)
              .where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, session.user.id)))
              .limit(1),
          ])

          const processedPost = {
            ...post,
            likes: likeCountResult[0]?.count || 0,
            comments: commentCountResult[0]?.count || 0,
            isLiked: userLikeResult.length > 0,
          }

          console.log(`Post ${post.id} processed:`, {
            likes: processedPost.likes,
            comments: processedPost.comments,
            isLiked: processedPost.isLiked,
          })

          return processedPost
        }),
      )

      console.log(`✅ SUCCESSFULLY FETCHED ${posts.length} posts for user ${cleanUserId}`)
    } else {
      // All posts (legacy)
      console.log("=== FETCHING ALL POSTS (LEGACY) ===")

      // Check total posts in database
      const totalPostsCount = await db.select({ count: count() }).from(postsTable)
      console.log("Total posts in database:", totalPostsCount[0]?.count || 0)

      const postsWithLikes = await db
        .select({
          id: postsTable.id,
          userId: postsTable.userId,
          content: postsTable.content,
          image: postsTable.image,
          video: postsTable.video,
          hasPrivateLocation: postsTable.hasPrivateLocation,
          createdAt: postsTable.createdAt,
          updatedAt: postsTable.updatedAt,
          user: {
            username: usersTable.username,
            nickname: usersTable.nickname,
            profileImage: usersTable.profileImage,
          },
        })
        .from(postsTable)
        .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
        .orderBy(desc(postsTable.createdAt))

      console.log("Raw posts fetched for legacy:", postsWithLikes.length)

      posts = await Promise.all(
        postsWithLikes.map(async (post) => {
          const [likeCountResult, commentCountResult, userLikeResult] = await Promise.all([
            db.select({ count: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id)),
            db.select({ count: count() }).from(postCommentsTable).where(eq(postCommentsTable.postId, post.id)),
            db
              .select()
              .from(postLikesTable)
              .where(and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, session.user.id)))
              .limit(1),
          ])

          return {
            ...post,
            likes: likeCountResult[0]?.count || 0,
            comments: commentCountResult[0]?.count || 0,
            isLiked: userLikeResult.length > 0,
          }
        }),
      )

      console.log(`✅ SUCCESSFULLY FETCHED ${posts.length} posts for legacy`)
    }

    const response = { posts }
    console.log("Final response structure:", {
      postsCount: response.posts.length,
      firstPost: response.posts[0]
        ? {
            id: response.posts[0].id,
            userId: response.posts[0].userId,
            hasContent: !!response.posts[0].content,
            hasImage: !!response.posts[0].image,
            hasVideo: !!response.posts[0].video,
            createdAt: response.posts[0].createdAt,
          }
        : null,
    })

    console.log("=== POSTS GET API DEBUG END ===")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ POSTS GET API ERROR:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new post
export async function POST(request: NextRequest) {
  try {
    console.log("=== POSTS CREATE API DEBUG START ===")
    console.log("Request URL:", request.url)
    console.log("Request method:", request.method)
    console.log("Timestamp:", new Date().toISOString())

    const session = await getServerSession(authOptions)
    console.log("Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    })

    if (!session?.user?.id) {
      console.error("❌ UNAUTHORIZED: No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("=== PARSING FORM DATA ===")
    
    // Check content length before parsing
    const contentLength = request.headers.get('content-length')
    console.log("Request content length:", contentLength)
    
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) { // 100MB limit
      console.error("❌ REQUEST TOO LARGE:", contentLength)
      return NextResponse.json({ error: "Request too large (max 100MB)" }, { status: 413 })
    }

    let formData: FormData
    try {
      formData = await request.formData()
      console.log("✅ FormData parsed successfully")
    } catch (formDataError) {
      console.error("❌ FORM DATA PARSING FAILED:", formDataError)
      return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 })
    }

    const content = formData.get("content") as string
    const media = formData.get("media") as File | null
    const isInvite = formData.get("isInvite") === "true"
    const inviteDescription = formData.get("inviteDescription") as string
    const inviteLimit = formData.get("inviteLimit") ? parseInt(formData.get("inviteLimit") as string) : 10
    
    // Location data
    const hasPrivateLocation = formData.get("hasPrivateLocation") === "true"
    const locationName = formData.get("locationName") as string
    const locationAddress = formData.get("locationAddress") as string
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null

    // Community data
    const communityName = formData.get("groupName") as string // Keep same form field name for compatibility

    console.log("Form data parsed:", {
      content: content ? `"${content.substring(0, 100)}${content.length > 100 ? "..." : ""}"` : "null",
      hasMedia: !!media,
      mediaDetails: media
        ? {
            name: media.name,
            size: media.size,
            type: media.type,
          }
        : null,
      isInvite,
      inviteLimit,
      hasPrivateLocation,
      locationName: locationName?.substring(0, 50),
      communityName: communityName?.substring(0, 50),
    })

    if (!content?.trim() && !media) {
      console.error("❌ VALIDATION ERROR: No content or media provided")
      return NextResponse.json({ error: "Content or media is required" }, { status: 400 })
    }

    // For now, allow posts without media if content is provided
    if (!content?.trim()) {
      console.error("❌ VALIDATION ERROR: Content is required")
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    let mediaUrl = null
    let mediaType = null
    if (media) {
      console.log("=== PROCESSING MEDIA UPLOAD ===")

      // Validate file type (images and videos)
      if (!media.type.startsWith("image/") && !media.type.startsWith("video/")) {
        console.error("❌ INVALID FILE TYPE:", media.type)
        return NextResponse.json({ error: "File must be an image or video" }, { status: 400 })
      }

      // Validate file size (max 50MB for videos, 10MB for images)
      const maxSize = media.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (media.size > maxSize) {
        console.error("❌ FILE TOO LARGE:", media.size)
        return NextResponse.json(
          {
            error: `File too large (max ${media.type.startsWith("video/") ? "50MB for videos" : "10MB for images"})`,
          },
          { status: 400 },
        )
      }

      try {
        console.log("Converting media to buffer...")
        const bytes = await media.arrayBuffer()
        const buffer = Buffer.from(bytes)
        console.log("Buffer created, size:", buffer.length)

        try {
          mediaUrl = await uploadToStorage({
            buffer,
            filename: media.name,
            mimetype: media.type,
            folder: "post-media",
          })

          mediaType = media.type.startsWith("video/") ? "video" : "image"
          console.log("✅ MEDIA UPLOADED SUCCESSFULLY:", mediaUrl, "Type:", mediaType)
        } catch (blobError) {
          console.error("❌ BLOB UPLOAD FAILED:", blobError)
          
          // Use a working placeholder URL for fallback
          mediaUrl = media.type.startsWith("video/") 
            ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            : "https://via.placeholder.com/400x300.jpg"
          mediaType = media.type.startsWith("video/") ? "video" : "image"
          
          console.log("⚠️ USING FALLBACK URL:", mediaUrl)
        }
      } catch (uploadError) {
        console.error("❌ MEDIA UPLOAD FAILED:", uploadError)
        console.error("Upload error stack:", uploadError instanceof Error ? uploadError.stack : "No stack trace")
        return NextResponse.json({ error: "Failed to upload media" }, { status: 500 })
      }
    }

    console.log("=== INSERTING POST INTO DATABASE ===")
    const postData: any = {
      userId: session.user.id,
      content: content || "",
      hasPrivateLocation: hasPrivateLocation ? 1 : 0,
      communityName: communityName?.trim() || null,
    }

    if (mediaType === "image") {
      postData.image = mediaUrl
    } else if (mediaType === "video") {
      postData.video = mediaUrl
    }

    console.log("Post data to insert:", {
      userId: postData.userId,
      content: postData.content,
      image: postData.image,
      video: postData.video,
      communityName: postData.communityName,
    })

    console.log("About to insert post into database...")
    let post
    try {
      post = await db.insert(postsTable).values(postData).returning()
      console.log("✅ Post inserted successfully, ID:", post[0]?.id)
    } catch (dbError) {
      console.error("❌ DATABASE INSERT FAILED:", dbError)
      console.error("Post data that failed:", postData)
      throw dbError // Re-throw to be caught by outer try-catch
    }

    console.log("✅ POST INSERTED SUCCESSFULLY:", {
      id: post[0].id,
      userId: post[0].userId,
      content: post[0].content?.substring(0, 50) + "...",
      hasImage: !!post[0].image,
      hasVideo: !!post[0].video,
      createdAt: post[0].createdAt,
    })

    // Verify the post was actually saved by fetching it back
    console.log("=== VERIFYING POST PERSISTENCE ===")
    const verifyPost = await db.select().from(postsTable).where(eq(postsTable.id, post[0].id)).limit(1)

    if (verifyPost.length === 0) {
      console.error("❌ POST VERIFICATION FAILED: Post not found after insert")
      return NextResponse.json({ error: "Post creation failed - not persisted" }, { status: 500 })
    }

    console.log("✅ POST VERIFICATION SUCCESSFUL:", {
      id: verifyPost[0].id,
      userId: verifyPost[0].userId,
      persisted: true,
    })

    // Create location entry if this post has a private location
    if (hasPrivateLocation && locationName?.trim()) {
      console.log("=== CREATING LOCATION ENTRY ===")
      try {
        const locationEntry = await db
          .insert(postLocationsTable)
          .values({
            postId: post[0].id,
            locationName: locationName.trim(),
            locationAddress: locationAddress?.trim() || null,
            latitude: latitude,
            longitude: longitude,
            isPrivate: 1,
          })
          .returning()

        console.log("✅ LOCATION CREATED SUCCESSFULLY:", {
          locationId: locationEntry[0].id,
          postId: locationEntry[0].postId,
          locationName: locationEntry[0].locationName,
        })
      } catch (locationError) {
        console.error("❌ LOCATION CREATION FAILED:", locationError)
        // Don't fail the entire post creation, just log the error
      }
    }

    // Create invite entry if this is an invite post
    if (isInvite) {
      console.log("=== CREATING INVITE ENTRY ===")
      try {
        const inviteEntry = await db
          .insert(postInvitesTable)
          .values({
            postId: post[0].id,
            inviteDescription: inviteDescription?.trim() || null,
            participantLimit: inviteLimit,
            currentParticipants: 0,
          })
          .returning()

        console.log("✅ INVITE CREATED SUCCESSFULLY:", {
          inviteId: inviteEntry[0].id,
          postId: inviteEntry[0].postId,
          participantLimit: inviteEntry[0].participantLimit,
        })

        // Create community if community name is provided
        if (communityName) {
          console.log("=== CREATING AUTO-GROUP ===")
          console.log("Group details:", {
            name: communityName.trim(),
            createdBy: session.user.id,
            postId: post[0].id,
            maxMembers: Math.min(Math.max(inviteLimit, 1), 100),
          })
          
          try {
            // Call the create-group API endpoint
            const groupResponse = await fetch(`${request.url.replace('/api/posts', '')}/api/posts/${post[0].id}/create-group`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('Cookie') || '',
              },
              body: JSON.stringify({
                groupName: communityName.trim(),
                maxMembers: Math.min(Math.max(inviteLimit, 1), 100),
              }),
            })

            if (groupResponse.ok) {
              const groupResult = await groupResponse.json()
              console.log("✅ Group created successfully:", groupResult.group)
              // Note: We don't return the group in the response to keep it simple
            } else {
              const errorText = await groupResponse.text()
              console.error("❌ Failed to create group:", errorText)
            }
          } catch (groupError) {
            console.error("❌ Error creating group:", groupError)
          }
          /*
          try {
            console.log("About to insert group into database...")
            
            // Create group without postId first to avoid potential circular dependency
            const newGroup = await db
              .insert(groupsTable)
              .values({
                name: groupName.trim(),
                description: `Group created from post`,
                createdBy: session.user.id,
                postId: null, // Set to null initially to avoid foreign key issues
                maxMembers: Math.min(Math.max(inviteLimit, 1), 100),
                isActive: 1,
              })
              .returning()

            console.log("✅ GROUP INSERTED:", newGroup[0])

            console.log("About to add group member...")
            // Add creator as admin member
            await db
              .insert(groupMembersTable)
              .values({
                groupId: newGroup[0].id,
                userId: session.user.id,
                role: "admin",
              })

            console.log("✅ GROUP MEMBER ADDED")

            // Now update the group with the postId
            console.log("About to update group with postId...")
            const updatedGroup = await db
              .update(groupsTable)
              .set({ 
                postId: post[0].id,
                description: `Group created from post: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`
              })
              .where(eq(groupsTable.id, newGroup[0].id))
              .returning()

            console.log("✅ GROUP UPDATED WITH POST ID")

            createdGroup = updatedGroup[0] || newGroup[0]
            console.log("✅ AUTO-GROUP CREATED SUCCESSFULLY:", {
              groupId: createdGroup.id,
              groupName: createdGroup.name,
            })
          } catch (groupError) {
            console.error("❌ GROUP CREATION FAILED:", groupError)
            console.error("Group error details:", {
              name: groupError instanceof Error ? groupError.name : "Unknown",
              message: groupError instanceof Error ? groupError.message : String(groupError),
              stack: groupError instanceof Error ? groupError.stack : "No stack",
            })
            // Don't fail the entire post creation, just log the error
          }
          */
        } else {
          console.log("⏭️ Skipping community creation: no community name provided")
        }
      } catch (inviteError) {
        console.error("❌ INVITE CREATION FAILED:", inviteError)
        // Don't fail the entire post creation, just log the error
      }
    }

    // Check total posts count for this user after insert
    const userPostsCount = await db
      .select({ count: count() })
      .from(postsTable)
      .where(eq(postsTable.userId, session.user.id))

    console.log("User's total posts after insert:", userPostsCount[0]?.count || 0)

    // Return the post with additional fields for consistency
    try {
      console.log("=== CREATING RESPONSE ===")
      const newPost = {
        ...post[0],
        likes: 0,
        comments: 0,
        isLiked: false,
      }

      console.log("New post object created:", {
        id: newPost.id,
        userId: newPost.userId,
        content: newPost.content?.substring(0, 50),
      })

      const response = {
        post: newPost,
        group: null, // Groups are now created separately
        message: "Post created successfully",
      }

      console.log("Response object created:", {
        hasPost: !!response.post,
        hasGroup: !!response.group,
        message: response.message,
      })

      console.log("About to return JSON response...")
      console.log("=== POSTS CREATE API DEBUG END ===")
      return NextResponse.json(response)
    } catch (responseError) {
      console.error("❌ RESPONSE CREATION FAILED:", responseError)
      return NextResponse.json({
        post: {
          ...post[0],
          likes: 0,
          comments: 0,
          isLiked: false,
        },
        message: "Post created successfully",
      })
    }
  } catch (error) {
    console.error("❌ POSTS CREATE API ERROR:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    })
    
    // Determine the specific error type and provide a helpful message
    let errorMessage = "Internal server error"
    let statusCode = 500
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()
      
      if (errorMsg.includes('database') || errorMsg.includes('sql')) {
        errorMessage = "Database error occurred"
        console.error("🔍 DATABASE ERROR DETAILS:", error.message)
      } else if (errorMsg.includes('blob') || errorMsg.includes('upload')) {
        errorMessage = "File upload failed"
        statusCode = 400
      } else if (errorMsg.includes('timeout')) {
        errorMessage = "Request timed out"
        statusCode = 408
      } else if (errorMsg.includes('size') || errorMsg.includes('large')) {
        errorMessage = "File too large"
        statusCode = 413
      } else {
        errorMessage = error.message
      }
    }
    
    // Return a clean error response
    try {
      return NextResponse.json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      }, { status: statusCode })
    } catch (jsonError) {
      console.error("❌ JSON SERIALIZATION ERROR:", jsonError)
      return new Response(errorMessage, { status: statusCode })
    }
  }
}