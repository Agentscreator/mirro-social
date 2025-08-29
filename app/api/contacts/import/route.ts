import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"

interface ImportedContact {
  id: string
  name: string
  email?: string
  phone?: string
  isOnPlatform?: boolean
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { contacts }: { contacts: ImportedContact[] } = await request.json()

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Invalid contacts data" },
        { status: 400 }
      )
    }

    // Process contacts
    const results = {
      followed: 0,
      invited: 0,
      errors: 0
    }

    for (const contact of contacts) {
      try {
        if (contact.isOnPlatform && contact.userId) {
          // Follow existing users
          // In a real app, you'd add a follow relationship in your database
          // await db.follow.create({
          //   data: {
          //     followerId: session.user.id,
          //     followingId: contact.userId
          //   }
          // })
          results.followed++
        } else {
          // Send invitation to non-platform users
          // In a real app, you'd send email/SMS invitations
          // await sendInvitation({
          //   to: contact.email || contact.phone,
          //   from: session.user.name,
          //   inviteLink: `${process.env.NEXTAUTH_URL}/invite/${generateInviteCode()}`
          // })
          results.invited++
        }
      } catch (error) {
        console.error(`Failed to process contact ${contact.id}:`, error)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${contacts.length} contacts`,
      results
    })

  } catch (error) {
    console.error("Contacts import error:", error)
    return NextResponse.json(
      { error: "Failed to import contacts" },
      { status: 500 }
    )
  }
}