// app/api/thoughts/process-embeddings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable } from "@/src/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { getEmbedding } from "@/src/lib/generateEmbeddings";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's thoughts that don't have embeddings or have placeholder embeddings
    const allThoughts = await db
      .select()
      .from(thoughtsTable)
      .where(eq(thoughtsTable.userId, session.user.id));

    console.log(`Found ${allThoughts.length} total thoughts for user ${session.user.id}`);

    // Filter thoughts that need proper embeddings (null, empty, or placeholder embeddings)
    const thoughtsWithoutEmbeddings = allThoughts.filter(thought => {
      // If no embedding at all
      if (!thought.embedding || thought.embedding.trim() === '') return true;
      
      try {
        const embedding = JSON.parse(thought.embedding);
        // Check if it's a valid array
        if (!Array.isArray(embedding)) return true;
        
        // Check if it's too short (real embeddings should be 1536 dimensions)
        if (embedding.length < 1000) return true;
        
        // Check if it's a dummy embedding (all same values - happens with Math.random() sometimes)
        const firstValue = embedding[0];
        const isAllSameValue = embedding.every(val => Math.abs(val - firstValue) < 0.0001);
        if (isAllSameValue) return true;
        
        // Check if values are outside reasonable embedding range
        const hasUnreasonableValues = embedding.some(val => 
          typeof val !== 'number' || val < -2 || val > 2 || isNaN(val)
        );
        if (hasUnreasonableValues) return true;
        
        return false; // Looks like a real embedding
      } catch (error) {
        console.log(`Error parsing embedding for thought ${thought.id}:`, error);
        return true; // Invalid JSON, needs reprocessing
      }
    });

    console.log(`Found ${thoughtsWithoutEmbeddings.length} thoughts needing embedding processing`);

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