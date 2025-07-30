import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { communitiesTable, communityMembersTable } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST /api/communities/[communityId]/join - Join a community
export async function POST(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { communityId } = params

    // Check if community exists
    const [community] = await db
      .select()
      .from(communitiesTable)
      .where(eq(communitiesTable.id, communityId))
      .limit(1)

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 })
    }

    // Check if user is already a member
    const [existingMembership] = await db
      .select()
      .from(communityMembersTable)
      .where(and(eq(communityMembersTable.communityId, communityId), eq(communityMembersTable.userId, userId)))
      .limit(1)

    if (existingMembership) {
      return NextResponse.json({ error: "Already a member of this community" }, { status: 400 })
    }

    // Add user as member
    await db.insert(communityMembersTable).values({
      communityId,
      userId,
    })

    return NextResponse.json({ message: "Successfully joined community" })
  } catch (error) {
    console.error("Error joining community:", error)
    return NextResponse.json({ error: "Failed to join community" }, { status: 500 })
  }
}

// DELETE /api/communities/[communityId]/join - Leave a community
export async function DELETE(
  request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { communityId } = params

    // Check if user is a member
    const [membership] = await db
      .select()
      .from(communityMembersTable)
      .where(and(eq(communityMembersTable.communityId, communityId), eq(communityMembersTable.userId, userId)))
      .limit(1)

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this community" }, { status: 400 })
    }

    // Check if user is the creator (creators cannot leave their own communities)
    const [community] = await db
      .select()
      .from(communitiesTable)
      .where(eq(communitiesTable.id, communityId))
      .limit(1)

    if (community?.createdBy === userId) {
      return NextResponse.json({ error: "Community creators cannot leave their own communities" }, { status: 400 })
    }

    // Remove user from community
    await db
      .delete(communityMembersTable)
      .where(and(eq(communityMembersTable.communityId, communityId), eq(communityMembersTable.userId, userId)))

    return NextResponse.json({ message: "Successfully left community" })
  } catch (error) {
    console.error("Error leaving community:", error)
    return NextResponse.json({ error: "Failed to leave community" }, { status: 500 })
  }
}