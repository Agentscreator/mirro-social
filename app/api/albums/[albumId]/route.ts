import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  albumsTable, 
  usersTable, 
  albumContributorsTable, 
  albumImagesTable,
  albumImageLikesTable,
  albumImageCommentsTable
} from "@/src/db/schema"
import { desc, eq, sql } from "drizzle-orm"

// GET - Fetch album details with images
export async function GET(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const albumId = Number.parseInt(params.albumId)
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 })
    }

    // Get album details
    const albumData = await db
      .select({
        id: albumsTable.id,
        title: albumsTable.title,
        description: albumsTable.description,
        isPublic: albumsTable.isPublic,
        createdAt: albumsTable.createdAt,
        creatorName: sql<string>`COALESCE(${usersTable.nickname}, ${usersTable.username})`,
        creatorUsername: usersTable.username,
        creatorAvatar: sql<string>`COALESCE(${usersTable.profileImage}, ${usersTable.image})`,
      })
      .from(albumsTable)
      .innerJoin(usersTable, eq(albumsTable.creatorId, usersTable.id))
      .where(eq(albumsTable.id, albumId))
      .limit(1)

    if (albumData.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 })
    }

    const album = albumData[0]

    // Check if user has access to the album
    if (album.isPublic === 0) {
      const hasAccess = await db
        .select({ id: albumContributorsTable.id })
        .from(albumContributorsTable)
        .where(
          eq(albumContributorsTable.albumId, albumId) &&
          eq(albumContributorsTable.userId, session.user.id)
        )
        .limit(1)

      if (hasAccess.length === 0) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Get contributors
    const contributors = await db
      .select({
        name: sql<string>`COALESCE(${usersTable.nickname}, ${usersTable.username})`,
        username: usersTable.username,
        avatar: sql<string>`COALESCE(${usersTable.profileImage}, ${usersTable.image})`,
      })
      .from(albumContributorsTable)
      .innerJoin(usersTable, eq(albumContributorsTable.userId, usersTable.id))
      .where(eq(albumContributorsTable.albumId, albumId))
      .orderBy(desc(albumContributorsTable.joinedAt))

    // Get album images
    const images = await db
      .select({
        id: albumImagesTable.id,
        imageUrl: albumImagesTable.imageUrl,
        caption: albumImagesTable.caption,
        likes: albumImagesTable.likes,
        createdAt: albumImagesTable.createdAt,
        contributorName: sql<string>`COALESCE(${usersTable.nickname}, ${usersTable.username})`,
        contributorUsername: usersTable.username,
        contributorAvatar: sql<string>`COALESCE(${usersTable.profileImage}, ${usersTable.image})`,
        commentCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${albumImageCommentsTable} 
          WHERE ${albumImageCommentsTable.imageId} = ${albumImagesTable.id}
        )`,
      })
      .from(albumImagesTable)
      .innerJoin(usersTable, eq(albumImagesTable.contributorId, usersTable.id))
      .where(eq(albumImagesTable.albumId, albumId))
      .orderBy(desc(albumImagesTable.createdAt))

    return NextResponse.json({
      album: {
        id: album.id.toString(),
        title: album.title,
        description: album.description,
        creator: {
          name: album.creatorName,
          username: album.creatorUsername,
          avatar: album.creatorAvatar || '/placeholder-avatar.jpg',
        },
        contributors: contributors.map(c => ({
          name: c.name,
          username: c.username,
          avatar: c.avatar || '/placeholder-avatar.jpg',
        })),
        isPublic: album.isPublic === 1,
        createdAt: album.createdAt.toISOString().split('T')[0],
        images: images.map(img => ({
          id: img.id.toString(),
          url: img.imageUrl,
          caption: img.caption || '',
          contributor: {
            name: img.contributorName,
            username: img.contributorUsername,
            avatar: img.contributorAvatar || '/placeholder-avatar.jpg',
          },
          likes: img.likes,
          comments: img.commentCount,
          createdAt: img.createdAt.toISOString().split('T')[0],
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching album:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update album details
export async function PUT(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const albumId = Number.parseInt(params.albumId)
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 })
    }

    const body = await request.json()
    const { title, description, isPublic } = body

    // Check if user is the creator
    const album = await db
      .select({ creatorId: albumsTable.creatorId })
      .from(albumsTable)
      .where(eq(albumsTable.id, albumId))
      .limit(1)

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 })
    }

    if (album[0].creatorId !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can edit album details" }, { status: 403 })
    }

    // Validate input
    if (title && title.length > 200) {
      return NextResponse.json({ error: "Title too long (max 200 characters)" }, { status: 400 })
    }

    if (description && description.length > 1000) {
      return NextResponse.json({ error: "Description too long (max 1000 characters)" }, { status: 400 })
    }

    // Update the album
    const updatedAlbum = await db
      .update(albumsTable)
      .set({
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isPublic !== undefined && { isPublic: isPublic ? 1 : 0 }),
        updatedAt: new Date(),
      })
      .where(eq(albumsTable.id, albumId))
      .returning()

    return NextResponse.json({
      album: updatedAlbum[0],
      message: "Album updated successfully",
    })
  } catch (error) {
    console.error("Error updating album:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete album
export async function DELETE(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const albumId = Number.parseInt(params.albumId)
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 })
    }

    // Check if user is the creator
    const album = await db
      .select({ creatorId: albumsTable.creatorId })
      .from(albumsTable)
      .where(eq(albumsTable.id, albumId))
      .limit(1)

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 })
    }

    if (album[0].creatorId !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can delete the album" }, { status: 403 })
    }

    // Delete the album (cascade will handle related records)
    await db
      .delete(albumsTable)
      .where(eq(albumsTable.id, albumId))

    return NextResponse.json({
      message: "Album deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting album:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}