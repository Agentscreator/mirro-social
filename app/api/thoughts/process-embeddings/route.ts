// app/api/thoughts/process-embeddings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getEmbedding } from "@/src/lib/generateEmbeddings";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's thoughts that don't have embeddings yet
    const thoughtsWithoutEmbeddings = await db
      .select()
      .from(thoughtsTable)
      .where(
        and(
          eq(thoughtsTable.userId, session.user.id),
          isNull(thoughtsTable.embedding)
        )
      );

    if (thoughtsWithoutEmbeddings.length === 0) {
      return NextResponse.json({ 
        message: "All thoughts already have embeddings", 
        processed: 0 
      });
    }

    let processedCount = 0;
    const errors = [];

    // Process each thought
    for (const thought of thoughtsWithoutEmbeddings) {
      if (!thought.content) continue;

      try {
        console.log(`Processing embedding for thought ${thought.id}`);
        const embedding = await getEmbedding(thought.content);
        const embeddingStr = JSON.stringify(embedding);

        await db
          .update(thoughtsTable)
          .set({ embedding: embeddingStr })
          .where(eq(thoughtsTable.id, thought.id));

        processedCount++;
        console.log(`✅ Processed embedding for thought ${thought.id}`);
      } catch (error) {
        console.error(`❌ Failed to process thought ${thought.id}:`, error);
        errors.push({ thoughtId: thought.id, error: error.message });
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${processedCount} thoughts`,
      processed: processedCount,
      total: thoughtsWithoutEmbeddings.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Error processing embeddings:", error);
    return NextResponse.json(
      { error: "Failed to process embeddings" },
      { status: 500 }
    );
  }
}