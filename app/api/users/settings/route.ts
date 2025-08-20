//app/api/users/settings/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { usersTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// GET - Fetch user settings data
export async function GET() {
  try {
    console.log("=== SETTINGS GET API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("Unauthorized: No session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Fetching settings for user ID:", session.user.id)

    // Get user data with all settings fields
    const user = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        email: usersTable.email,
        metro_area: usersTable.metro_area,
        image: usersTable.image,
        profileImage: usersTable.profileImage,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.user.id))
      .limit(1)

    if (user.length === 0) {
      console.error("User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("User found:", { id: user[0].id, username: user[0].username })
    console.log("✅ Settings data fetched successfully")
    console.log("=== SETTINGS GET API DEBUG END ===")

    return NextResponse.json({
      success: true,
      user: user[0],
    })
  } catch (error) {
    console.error("❌ Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    console.log("=== SETTINGS UPDATE API DEBUG START ===")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("Unauthorized: No session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Settings update request body:", body)

    const {
      username,
      nickname,
    } = body

    // Validate username if provided
    if (username !== undefined) {
      // Check username format (alphanumeric, underscores, 3-20 chars)
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return NextResponse.json({ 
          error: "Username must be 3-20 characters long and can only contain letters, numbers, and underscores" 
        }, { status: 400 })
      }

      // Check username uniqueness
      const existingUser = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1)

      if (existingUser.length > 0 && existingUser[0].id !== session.user.id) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 })
      }
    }


    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date(),
    }
    
    if (username !== undefined) updateData.username = username
    if (nickname !== undefined) updateData.nickname = nickname

    console.log("Update data:", updateData)

    // Update user settings
    const updatedUser = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, session.user.id))
      .returning()

    if (updatedUser.length === 0) {
      console.error("User not found or update failed")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }


    console.log("✅ Settings updated successfully")
    console.log("=== SETTINGS UPDATE API DEBUG END ===")

    return NextResponse.json({
      success: true,
      user: updatedUser[0],
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("❌ Settings update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}