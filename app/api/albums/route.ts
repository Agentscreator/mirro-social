import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  albumsTable, 
  usersTable, 
  albumContributorsTable, 
  albumImagesTable,
  albumImageLikesTable 
} from "@/src/db/schema"
import { desc, eq, sql, or } from "drizzle-orm"

// GET - Fetch albums (public albums + user's albums)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const userOnly = searchParams.get("userOnly") === "true"

    // Build the where condition
    let whereCondition = eq(albumsTable.isPublic, 1) // Public albums
    
    if (userOnly) {
      // Only user's albums (both public and private)
      whereCondition = eq(albumsTable.creatorId, session.user.id)
    } else {
      // Public albums + user's albums + albums user contributes to
      whereCondition = or(
        eq(albumsTable.isPublic, 1), // Public albums
        eq(albumsTable.creatorId, session.user.id), // User's albums
        // TODO: Add albums user contributes to
      ) as any
    }

    // Get albums with creator info and stats
    const albums = await db
      .select({
        id: albumsTable.id,
        title: albumsTable.title,
        description: albumsTable.description,
        isPublic: albumsTable.isPublic,
        createdAt: albumsTable.createdAt,
        creatorName: sql<string>`COALESCE(${usersTable.nickname}, ${usersTable.username})`,
        creatorUsername: usersTable.username,
        creatorAvatar: sql<string>`COALESCE(${usersTable.profileImage}, ${usersTable.image})`,
        contributorCount: sql<number>`(
          SELECT COUNT(DISTINCT ${albumContributorsTable.userId})::int 
          FROM ${albumContributorsTable} 
          WHERE ${albumContributorsTable.albumId} = ${albumsTable.id}
        )`,
        imageCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${albumImagesTable} 
          WHERE ${albumImagesTable.albumId} = ${albumsTable.id}
        )`,
        thumbnail: sql<string>`(
          SELECT ${albumImagesTable.imageUrl} 
          FROM ${albumImagesTable} 
          WHERE ${albumImagesTable.albumId} = ${albumsTable.id}
          ORDER BY ${albumImagesTable.createdAt} DESC 
          LIMIT 1
        )`,
      })
      .from(albumsTable)
      .innerJoin(usersTable, eq(albumsTable.creatorId, usersTable.id))
      .where(whereCondition)
      .orderBy(desc(albumsTable.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      albums: albums.map(album => ({
        id: album.id.toString(),
        title: album.title,
        description: album.description,
        creator: {
          name: album.creatorName,
          username: album.creatorUsername,
          avatar: album.creatorAvatar || '/placeholder-avatar.jpg',
        },
        contributors: album.contributorCount,
        images: album.imageCount,
        thumbnail: album.thumbnail || '/placeholder-image.jpg',
        isPublic: album.isPublic === 1,
        createdAt: album.createdAt.toISOString().split('T')[0],
      })),
    })
  } catch (error) {
    console.error("Error fetching albums:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new album
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, isPublic } = body

    // Validate input
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: "Title too long (max 200 characters)" }, { status: 400 })
    }

    if (description && description.length > 1000) {
      return NextResponse.json({ error: "Description too long (max 1000 characters)" }, { status: 400 })
    }

    // Create the album
    const newAlbum = await db
      .insert(albumsTable)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        creatorId: session.user.id,
        isPublic: isPublic ? 1 : 0,
      })
      .returning()

    // Add creator as a contributor with edit permissions
    await db
      .insert(albumContributorsTable)
      .values({
        albumId: newAlbum[0].id,
        userId: session.user.id,
        canEdit: 1,
      })

    return NextResponse.json({
      album: newAlbum[0],
      message: "Album created successfully",
    })
  } catch (error) {
    console.error("Error creating album:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}