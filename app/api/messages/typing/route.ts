import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"

// Simple in-memory store for typing indicators
// In production, you'd use Redis or a similar solution
const typingUsers = new Map<string, { userId: string, timestamp: number }>()

// Clean up old typing indicators every 10 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of typingUsers.entries()) {
    if (now - value.timestamp > 5000) { // 5 seconds timeout
      typingUsers.delete(key)
    }
  }
}, 10000)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { receiverId, isTyping } = body

    if (!receiverId) {
      return NextResponse.json({ error: "Receiver ID is required" }, { status: 400 })
    }

    const key = `${session.user.id}-${receiverId}`

    if (isTyping) {
      typingUsers.set(key, {
        userId: session.user.id,
        timestamp: Date.now()
      })
    } else {
      typingUsers.delete(key)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating typing status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('userId')

    if (!otherUserId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if the other user is typing to current user
    const key = `${otherUserId}-${session.user.id}`
    const typingInfo = typingUsers.get(key)
    
    const isTyping = typingInfo && (Date.now() - typingInfo.timestamp < 5000)

    return NextResponse.json({ isTyping: !!isTyping })
  } catch (error) {
    console.error("Error checking typing status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}