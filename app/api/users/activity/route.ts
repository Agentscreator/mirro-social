import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { usersTable } from "@/src/db/schema"
import { eq, sql } from "drizzle-orm"

// POST - Update user's last activity
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update user's last activity timestamp
    await db
      .update(usersTable)
      .set({ 
        updated_at: new Date() 
      })
      .where(eq(usersTable.id, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Get online users (users active in last 5 minutes)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const onlineUsers = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        lastActivity: usersTable.updated_at,
      })
      .from(usersTable)
      .where(sql`${usersTable.updated_at} > ${fiveMinutesAgo}`)

    return NextResponse.json({ onlineUsers })
  } catch (error) {
    console.error("Error fetching online users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}