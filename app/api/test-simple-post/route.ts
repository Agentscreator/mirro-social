import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { postsTable } from "@/src/db/schema"

// POST - Create a simple post for testing
export async function POST(request: NextRequest) {
  try {
    console.log("=== SIMPLE POST TEST START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    console.log("Creating simple post:", { content, userId: session.user.id })

    // Create a very simple post
    const newPost = await db
      .insert(postsTable)
      .values({
        userId: session.user.id,
        content: content || "Simple test post",
      })
      .returning()

    console.log("✅ Simple post created:", newPost[0])

    const response = {
      post: newPost[0],
      message: "Simple post created successfully",
    }

    console.log("=== SIMPLE POST TEST END ===")
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Simple post test error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}