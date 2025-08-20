// app/api/debug/embedding-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable } from "@/src/db/schema";
import { eq, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's thoughts
    const thoughts = await db
      .select()
      .from(thoughtsTable)
      .where(eq(thoughtsTable.userId, session.user.id));

    // Get thoughts with embeddings
    const thoughtsWithEmbeddings = await db
      .select()
      .from(thoughtsTable)
      .where(
        eq(thoughtsTable.userId, session.user.id)
      );

    const thoughtsWithValidEmbeddings = thoughtsWithEmbeddings.filter(thought => {
      if (!thought.embedding) return false;
      try {
        const embedding = JSON.parse(thought.embedding);
        return Array.isArray(embedding) && embedding.length > 100;
      } catch {
        return false;
      }
    });

    // Get all users with embeddings for comparison
    const allUsersWithEmbeddings = await db
      .select({ id: thoughtsTable.userId })
      .from(thoughtsTable)
      .where(isNotNull(thoughtsTable.embedding))
      .groupBy(thoughtsTable.userId);

    return NextResponse.json({
      currentUserId: session.user.id,
      totalThoughts: thoughts.length,
      thoughtsWithEmbeddings: thoughtsWithValidEmbeddings.length,
      allUsersWithEmbeddings: allUsersWithEmbeddings.length,
      hasValidEmbeddings: thoughtsWithValidEmbeddings.length > 0,
      latestThought: thoughts[0] ? {
        id: thoughts[0].id,
        hasEmbedding: !!thoughts[0].embedding,
        embeddingLength: thoughts[0].embedding ? JSON.parse(thoughts[0].embedding).length : 0
      } : null
    });

  } catch (error) {
    console.error("Error checking embedding status:", error);
    return NextResponse.json(
      { error: "Failed to check embedding status" },
      { status: 500 }
    );
  }
}