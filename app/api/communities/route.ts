import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { communitiesTable, communityMembersTable, usersTable } from "@/src/db/schema"
import { eq, desc, sql } from "drizzle-orm"

// GET /api/communities - Fetch communities the user is a member of
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch communities the user is a member of
    const communitiesQuery = await db
      .select({
        id: communitiesTable.id,
        name: communitiesTable.name,
        description: communitiesTable.description,
        image: communitiesTable.image,
        createdBy: communitiesTable.createdBy,
        createdAt: communitiesTable.createdAt,
        // Count total members
        memberCount: sql<number>`(
          SELECT COUNT(*) FROM ${communityMembersTable} 
          WHERE ${communityMembersTable.communityId} = ${communitiesTable.id}
        )`,
        // Check if user is creator
        isCreator: sql<boolean>`${communitiesTable.createdBy} = ${userId}`,
      })
      .from(communitiesTable)
      .innerJoin(communityMembersTable, eq(communitiesTable.id, communityMembersTable.communityId))
      .where(eq(communityMembersTable.userId, userId))
      .orderBy(desc(communitiesTable.createdAt))

    // Format the response
    const communities = communitiesQuery.map((community) => ({
      id: community.id,
      name: community.name,
      description: community.description,
      image: community.image,
      createdBy: community.createdBy,
      createdAt: community.createdAt?.toISOString(),
      memberCount: community.memberCount || 0,
      isCreator: community.isCreator || false,
    }))

    return NextResponse.json({ communities })
  } catch (error) {
    console.error("Error fetching communities:", error)
    return NextResponse.json({ error: "Failed to fetch communities" }, { status: 500 })
  }
}

// POST /api/communities - Create a new community
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { name, description, image } = await request.json()

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Community name is required" }, { status: 400 })
    }

    // Insert community into database
    const [newCommunity] = await db
      .insert(communitiesTable)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        image: image || null,
        createdBy: userId,
      })
      .returning()

    // Add creator as first member
    await db.insert(communityMembersTable).values({
      communityId: newCommunity.id,
      userId,
    })

    // Format response
    const communityResponse = {
      id: newCommunity.id,
      name: newCommunity.name,
      description: newCommunity.description,
      image: newCommunity.image,
      createdBy: newCommunity.createdBy,
      createdAt: newCommunity.createdAt?.toISOString(),
      memberCount: 1,
      isCreator: true,
    }

    return NextResponse.json(communityResponse, { status: 201 })
  } catch (error) {
    console.error("Error creating community:", error)
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 })
  }
}