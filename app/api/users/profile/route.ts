import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { usersTable, postsTable, postLikesTable, followersTable } from "@/src/db/schema"
import { eq, count, sql } from "drizzle-orm"

// GET - Get user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.user.id))
      .limit(1)

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get post count
    const postCount = await db
      .select({ count: count() })
      .from(postsTable)
      .where(eq(postsTable.userId, session.user.id))

    // Get follower count
    const followerCount = await db
      .select({ count: count() })
      .from(followersTable)
      .where(eq(followersTable.followingId, session.user.id))

    // Get following count
    const followingCount = await db
      .select({ count: count() })
      .from(followersTable)
      .where(eq(followersTable.followerId, session.user.id))

    return NextResponse.json({
      user: user[0],
      stats: {
        posts: postCount[0]?.count || 0,
        followers: followerCount[0]?.count || 0,
        following: followingCount[0]?.count || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    console.log("=== PROFILE UPDATE API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("Unauthorized: No session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Update request body:", body)

    const { about, nickname, metro_area } = body

    // Build update object with only provided fields
    const updateData: any = {}
    if (about !== undefined) updateData.about = about
    if (nickname !== undefined) updateData.nickname = nickname
    if (metro_area !== undefined) updateData.metro_area = metro_area

    console.log("Update data:", updateData)

    if (Object.keys(updateData).length === 0) {
      console.error("No valid fields to update")
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Update user profile
    const updatedUser = await db
      .update(usersTable)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(usersTable.id, session.user.id))
      .returning()

    if (updatedUser.length === 0) {
      console.error("User not found or update failed")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("✅ Profile updated successfully")
    console.log("=== PROFILE UPDATE API DEBUG END ===")

    return NextResponse.json({
      user: updatedUser[0],
      message: "Profile updated successfully",
    })
  } catch (error) {
    console.error("❌ Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
