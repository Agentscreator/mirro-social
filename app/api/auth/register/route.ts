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
    if (!username || !email || !password || !dob || !nickname || !gender || !genderPreference || !preferredAgeMin || !preferredAgeMax || !proximity) {
      console.log('Missing required fields:', { 
        username: !!username, 
        email: !!email, 
        password: !!password, 
        dob: !!dob, 
        nickname: !!nickname,
        gender: !!gender,
        genderPreference: !!genderPreference,
        preferredAgeMin: !!preferredAgeMin,
        preferredAgeMax: !!preferredAgeMax,
        proximity: !!proximity
      })
      return NextResponse.json(
        { error: "Missing required fields: username, email, password, dob, nickname, gender, genderPreference, preferredAgeMin, preferredAgeMax, and proximity are required" },
        { status: 400 }
      )
    }

    // Validate field lengths
    if (username.length > 100) {
      return NextResponse.json(
        { error: "Username must be 100 characters or less" },
        { status: 400 }
      )
    }

    if (nickname.length > 100) {
      return NextResponse.json(
        { error: "Nickname must be 100 characters or less" },
        { status: 400 }
      )
    }

    if (email.length > 255) {
      return NextResponse.json(
        { error: "Email must be 255 characters or less" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Check if user already exists
    try {
      const existingUserByEmail = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()))
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
        .where(eq(usersTable.username, username.toLowerCase()))
        .limit(1)

      if (existingUserByUsername.length > 0) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        )
      }
    } catch (dbError) {
      console.error("Database error during user existence check:", dbError)
      return NextResponse.json(
        { error: "Database error during registration" },
        { status: 500 }
      )
    }

    // Hash password using Node.js crypto (serverless-friendly)
    const salt = randomBytes(16).toString('hex')
    const hashedPassword = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex') + ':' + salt

    // Create user with all required fields
    let newUser
    try {
      const result = await db
        .insert(usersTable)
        .values({
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          password: hashedPassword,
          nickname,
          dob,
          gender,
          genderPreference,
          preferredAgeMin: parseInt(preferredAgeMin.toString()),
          preferredAgeMax: parseInt(preferredAgeMax.toString()),
          proximity,
          timezone: timezone || "UTC",
          metro_area: metro_area || "Unknown",
          latitude: latitude ? parseFloat(latitude.toString()) : 0.0,
          longitude: longitude ? parseFloat(longitude.toString()) : 0.0,
        })
        .returning()

      newUser = result[0]
      console.log('User created successfully:', newUser.id)
    } catch (dbError) {
      console.error("Database error during user creation:", dbError)
      
      // Check if it's a unique constraint violation
      if (dbError instanceof Error && dbError.message.includes('unique')) {
        return NextResponse.json(
          { error: "Username or email already exists" },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      )
    }

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