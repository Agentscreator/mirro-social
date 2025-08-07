import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { db } from "@/src/db"
import { 
  albumsTable, 
  albumContributorsTable, 
  albumImagesTable
} from "@/src/db/schema"
import { eq, and } from "drizzle-orm"

// POST - Add image to album
export async function POST(
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
    const { imageUrl, caption } = body

    // Validate input
    if (!imageUrl || imageUrl.trim().length === 0) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    if (caption && caption.length > 1000) {
      return NextResponse.json({ error: "Caption too long (max 1000 characters)" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(imageUrl)
    } catch {
      return NextResponse.json({ error: "Invalid image URL format" }, { status: 400 })
    }

    // Check if album exists and is accessible
    const album = await db
      .select({ 
        id: albumsTable.id,
        isPublic: albumsTable.isPublic,
        creatorId: albumsTable.creatorId
      })
      .from(albumsTable)
      .where(eq(albumsTable.id, albumId))
      .limit(1)

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 })
    }

    // Check if user can contribute (album is public, user is creator, or user is a contributor)
    let canContribute = false

    if (album[0].isPublic === 1) {
      canContribute = true // Public albums allow anyone to contribute
    } else if (album[0].creatorId === session.user.id) {
      canContribute = true // Creator can always contribute
    } else {
      // Check if user is a contributor
      const contributor = await db
        .select({ id: albumContributorsTable.id })
        .from(albumContributorsTable)
        .where(
          and(
            eq(albumContributorsTable.albumId, albumId),
            eq(albumContributorsTable.userId, session.user.id)
          )
        )
        .limit(1)

      canContribute = contributor.length > 0
    }

    if (!canContribute) {
      return NextResponse.json({ error: "You don't have permission to contribute to this album" }, { status: 403 })
    }

    // Add user as contributor if not already
    const existingContributor = await db
      .select({ id: albumContributorsTable.id })
      .from(albumContributorsTable)
      .where(
        and(
          eq(albumContributorsTable.albumId, albumId),
          eq(albumContributorsTable.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingContributor.length === 0) {
      await db
        .insert(albumContributorsTable)
        .values({
          albumId,
          userId: session.user.id,
          canEdit: 0, // Regular contributors can't edit album details
        })
    }

    // Add the image
    const newImage = await db
      .insert(albumImagesTable)
      .values({
        albumId,
        contributorId: session.user.id,
        imageUrl: imageUrl.trim(),
        caption: caption?.trim() || null,
      })
      .returning()

    return NextResponse.json({
      image: newImage[0],
      message: "Image added to album successfully",
    })
  } catch (error) {
    console.error("Error adding image to album:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}