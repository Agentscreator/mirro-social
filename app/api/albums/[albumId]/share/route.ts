import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { albumsTable, albumSharesTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Generate a share token for an album
export async function POST(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const albumId = parseInt(params.albumId);
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    const { accessLevel = "contribute" } = await request.json();

    // Check if user owns or has access to the album
    const album = await db
      .select()
      .from(albumsTable)
      .where(eq(albumsTable.id, albumId))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const albumData = album[0];
    if (albumData.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Only album creator can generate share links" }, { status: 403 });
    }

    // Generate a unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Update album with share token if it doesn't have one
    if (!albumData.shareToken) {
      await db
        .update(albumsTable)
        .set({ 
          shareToken,
          updatedAt: new Date()
        })
        .where(eq(albumsTable.id, albumId));
    }

    // Create share record
    await db.insert(albumSharesTable).values({
      albumId,
      sharedBy: session.user.id,
      shareToken: albumData.shareToken || shareToken,
      accessLevel,
    });

    const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/albums/shared/${albumData.shareToken || shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      shareToken: albumData.shareToken || shareToken,
    });
  } catch (error) {
    console.error("Error generating share link:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}

// Get existing share links for an album
export async function GET(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const albumId = parseInt(params.albumId);
    if (isNaN(albumId)) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    // Check if user owns the album
    const album = await db
      .select()
      .from(albumsTable)
      .where(eq(albumsTable.id, albumId))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album[0].creatorId !== session.user.id) {
      return NextResponse.json({ error: "Only album creator can view share links" }, { status: 403 });
    }

    // Get share links
    const shares = await db
      .select()
      .from(albumSharesTable)
      .where(eq(albumSharesTable.albumId, albumId));

    const shareLinks = shares.map(share => ({
      id: share.id,
      shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/albums/shared/${share.shareToken}`,
      accessLevel: share.accessLevel,
      createdAt: share.createdAt,
    }));

    return NextResponse.json({
      success: true,
      shareLinks,
    });
  } catch (error) {
    console.error("Error fetching share links:", error);
    return NextResponse.json(
      { error: "Failed to fetch share links" },
      { status: 500 }
    );
  }
}