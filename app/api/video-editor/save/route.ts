import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { VideoProject } from "@/types/video-editor"

// POST - Save video editor project and create post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { project, videoBlob, content } = body as {
      project: VideoProject;
      videoBlob: string; // Base64 encoded video data
      content: string;
    }

    // Validate input
    if (!project) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content description is required" }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Content too long (max 2000 characters)" }, { status: 400 })
    }

    // TODO: In a real app, you would:
    // 1. Upload the video blob to a file storage service (AWS S3, Cloudinary, etc.)
    // 2. Get the public URL of the uploaded video
    // 3. Store the project data in a separate table for future editing
    
    // For now, we'll create a mock video URL
    const videoUrl = `https://example.com/videos/${project.id}.mp4`

    // Create post with edited video data
    const createPostResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/posts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization header
        ...(request.headers.get('authorization') && {
          authorization: request.headers.get('authorization')!
        })
      },
      body: JSON.stringify({
        content: content.trim(),
        video: videoUrl,
        duration: Math.ceil(project.timeline.duration),
        editedVideoData: {
          projectId: project.id,
          projectName: project.name,
          canvas: project.canvas,
          timeline: {
            duration: project.timeline.duration,
            videoClipCount: project.timeline.videoClips.length,
            audioClipCount: project.timeline.audioClips.length,
            textOverlayCount: project.timeline.textOverlays.length,
            stickerOverlayCount: project.timeline.stickerOverlays.length,
          },
          watermark: project.watermark,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }
      })
    })

    if (!createPostResponse.ok) {
      const error = await createPostResponse.json()
      return NextResponse.json({ error: error.error || "Failed to create post" }, { status: 500 })
    }

    const postResult = await createPostResponse.json()

    return NextResponse.json({
      success: true,
      post: postResult.post,
      project: {
        id: project.id,
        name: project.name,
        videoUrl,
      },
      message: "Video created and posted successfully!"
    })

  } catch (error) {
    console.error("Error saving video project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}