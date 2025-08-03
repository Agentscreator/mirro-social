import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { userSettingsTable } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// GET - Get user's invite settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, session.user.id))
      .limit(1)

    if (settings.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        inviteMode: "manual",
        autoAcceptLimit: 10,
      })
    }

    return NextResponse.json(settings[0])
  } catch (error) {
    console.error("Error fetching invite settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update user's invite settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { inviteMode, autoAcceptLimit } = body

    // Validate input
    if (!["manual", "auto"].includes(inviteMode)) {
      return NextResponse.json({ error: "Invalid invite mode" }, { status: 400 })
    }

    if (typeof autoAcceptLimit !== "number" || autoAcceptLimit < 1 || autoAcceptLimit > 100) {
      return NextResponse.json({ error: "Auto accept limit must be between 1 and 100" }, { status: 400 })
    }

    // Check if settings exist
    const existingSettings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, session.user.id))
      .limit(1)

    let updatedSettings

    if (existingSettings.length === 0) {
      // Create new settings
      updatedSettings = await db
        .insert(userSettingsTable)
        .values({
          userId: session.user.id,
          inviteMode,
          autoAcceptLimit,
        })
        .returning()
    } else {
      // Update existing settings
      updatedSettings = await db
        .update(userSettingsTable)
        .set({
          inviteMode,
          autoAcceptLimit,
          updatedAt: new Date(),
        })
        .where(eq(userSettingsTable.userId, session.user.id))
        .returning()
    }

    return NextResponse.json(updatedSettings[0])
  } catch (error) {
    console.error("Error updating invite settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}