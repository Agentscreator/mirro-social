import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { 
  albumsTable, 
  albumSharesTable, 
  albumContributorsTable, 
  albumImagesTable,
  usersTable 
} from "@/src/db/schema";
import { eq, sql } from "drizzle-orm";

// Get album by share token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shareToken } = await params;

    // Find album by share token
    const album = await db
      .select({
        id: albumsTable.id,
        title: albumsTable.title,
        description: albumsTable.description,
        creatorId: albumsTable.creatorId,
        isPublic: albumsTable.isPublic,
        allowContributions: albumsTable.allowContributions,
        maxContributors: albumsTable.maxContributors,
        createdAt: albumsTable.createdAt,
        creatorName: usersTable.nickname,
        creatorUsername: usersTable.username,
        creatorAvatar: usersTable.profileImage,
      })
      .from(albumsTable)
      .innerJoin(usersTable, eq(albumsTable.creatorId, usersTable.id))
      .where(eq(albumsTable.shareToken, shareToken))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found or invalid share link" }, { status: 404 });
    }

    const albumData = album[0];

    // Get contributors count
    const contributorsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(albumContributorsTable)
      .where(eq(albumContributorsTable.albumId, albumData.id));

    // Get images count
    const imagesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(albumImagesTable)
      .where(eq(albumImagesTable.albumId, albumData.id));

    // Check if current user is already a contributor
    const isContributor = await db
      .select()
      .from(albumContributorsTable)
      .where(
        eq(albumContributorsTable.albumId, albumData.id) &&
        eq(albumContributorsTable.userId, session.user.id)
      )
      .limit(1);

    // Check if user can contribute (not at max limit)
    const canContribute = albumData.allowContributions === 1 && 
      (albumData.maxContributors === null || contributorsCount[0].count < albumData.maxContributors);

    return NextResponse.json({
      success: true,
      album: {
        id: albumData.id,
        title: albumData.title,
        description: albumData.description,
        creator: {
          id: albumData.creatorId,
          name: albumData.creatorName,
          username: albumData.creatorUsername,
          avatar: albumData.creatorAvatar,
        },
        isPublic: albumData.isPublic === 1,
        allowContributions: albumData.allowContributions === 1,
        contributorsCount: contributorsCount[0].count,
        imagesCount: imagesCount[0].count,
        createdAt: albumData.createdAt,
        isContributor: isContributor.length > 0,
        canContribute,
      },
    });
  } catch (error) {
    console.error("Error fetching shared album:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared album" },
      { status: 500 }
    );
  }
}

// Join album via share token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shareToken } = await params;

    // Find album by share token
    const album = await db
      .select()
      .from(albumsTable)
      .where(eq(albumsTable.shareToken, shareToken))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found or invalid share link" }, { status: 404 });
    }

    const albumData = album[0];

    // Check if contributions are allowed
    if (albumData.allowContributions !== 1) {
      return NextResponse.json({ error: "This album doesn't allow contributions" }, { status: 403 });
    }

    // Check if user is already a contributor
    const existingContributor = await db
      .select()
      .from(albumContributorsTable)
      .where(
        eq(albumContributorsTable.albumId, albumData.id) &&
        eq(albumContributorsTable.userId, session.user.id)
      )
      .limit(1);

    if (existingContributor.length > 0) {
      return NextResponse.json({ error: "You are already a contributor to this album" }, { status: 400 });
    }

    // Check contributor limit
    if (albumData.maxContributors !== null) {
      const contributorsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(albumContributorsTable)
        .where(eq(albumContributorsTable.albumId, albumData.id));

      if (contributorsCount[0].count >= albumData.maxContributors) {
        return NextResponse.json({ error: "Album has reached maximum number of contributors" }, { status: 400 });
      }
    }

    // Add user as contributor
    await db.insert(albumContributorsTable).values({
      albumId: albumData.id,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully joined the album!",
    });
  } catch (error) {
    console.error("Error joining shared album:", error);
    return NextResponse.json(
      { error: "Failed to join album" },
      { status: 500 }
    );
  }
}