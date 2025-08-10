import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable } from "@/src/db/schema"

// POST - Create a minimal post for testing
export async function POST(request: NextRequest) {
  try {
    console.log("=== MINIMAL POSTS TEST START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Session valid, user ID:", session.user.id)

    const formData = await request.formData()
    const content = formData.get("content") as string

    console.log("Content received:", content)

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Create minimal post
    const newPost = await db
      .insert(postsTable)
      .values({
        userId: session.user.id,
        content: content.trim(),
      })
      .returning()

    console.log("✅ Minimal post created:", newPost[0])

    const response = {
      post: newPost[0],
      message: "Minimal post created successfully",
    }

    console.log("=== MINIMAL POSTS TEST END ===")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Minimal posts test error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}