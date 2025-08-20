import { NextResponse } from "next/server"
import { createHash, pbkdf2Sync, randomBytes } from "crypto"
import { db } from "@/src/db"
import { usersTable } from "@/src/db/schema"
import { eq, or } from "drizzle-orm"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('Received signup data:', body)
    
    const {
      username,
      email,
      password,
      nickname,
      dob,
      gender,
      genderPreference,
      preferredAgeMin,
      preferredAgeMax,
      proximity,
      timezone,
      metro_area,
      latitude,
      longitude,
    } = body

    // Validate required fields
    if (!username || !email || !password || !dob || !nickname) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUserByEmail = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)

    if (existingUserByEmail.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    const existingUserByUsername = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1)

    if (existingUserByUsername.length > 0) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      )
    }

    // Hash password using Node.js crypto (serverless-friendly)
    const salt = randomBytes(16).toString('hex')
    const hashedPassword = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex') + ':' + salt

    // Create user
    const [newUser] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        password: hashedPassword,
        nickname,
        dob,
        timezone,
        metro_area: metro_area || "Unknown",
        latitude: latitude || 0,
        longitude: longitude || 0,
      })
      .returning()

    console.log('User created:', newUser.id)

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(
      { 
        user: userWithoutPassword, 
        message: "User created successfully"
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}