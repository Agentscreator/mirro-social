// app/api/embeddings/sync-to-pinecone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable } from "@/src/db/schema";
import { upsertVectorEmbedding } from "@/src/lib/vectorStore";
import { desc, isNotNull } from "drizzle-orm";

// Parse embedding string to number array
function parseEmbedding(str: string): number[] | null {
  try {
    const embedding = JSON.parse(str);
    if (
      Array.isArray(embedding) && 
      embedding.length > 0 &&
      embedding.every(val => typeof val === 'number')
    ) {
      return embedding;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse embedding:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting Pinecone sync for all users...");

    // Get all thoughts with embeddings
    const thoughts = await db
      .select()
      .from(thoughtsTable)
      .where(isNotNull(thoughtsTable.embedding))
      .orderBy(desc(thoughtsTable.createdAt));

    console.log(`Retrieved ${thoughts.length} thoughts with embeddings`);

    // Map of userId to their latest thought with valid embedding
    const userLatestThoughts = new Map();

    for (const thought of thoughts) {
      // Skip if we already have a more recent thought for this user
      if (userLatestThoughts.has(thought.userId)) continue;
      
      // Verify embedding is valid
      const embedding = parseEmbedding(thought.embedding);
      if (embedding) {
        userLatestThoughts.set(thought.userId, {
          thoughtId: thought.id,
          userId: thought.userId,
          embedding
        });
      }
    }

    const latestThoughts = Array.from(userLatestThoughts.values());
    console.log(`Found ${latestThoughts.length} users with valid embeddings`);
    
    if (latestThoughts.length === 0) {
      return NextResponse.json({ 
        message: "No valid embeddings found to sync",
        synced: 0
      });
    }
    
    let syncedCount = 0;
    const errors = [];

    // Process each embedding
    for (const { userId, thoughtId, embedding } of latestThoughts) {
      try {
        if (!embedding || embedding.length === 0) {
          console.log(`Skipping user ${userId}, no valid embedding`);
          continue;
        }
        
        console.log(`Syncing user ${userId} with embedding of length ${embedding.length}`);
        
        // Upsert to Pinecone
        await upsertVectorEmbedding({
          id: userId,
          values: embedding,
          metadata: {
            userId,
            thoughtId
          }
        });
        
        syncedCount++;
        console.log(`Successfully synced embedding for user ${userId}`);
        
      } catch (error) {
        console.error(`Error syncing embedding for user ${userId}:`, error);
        errors.push({ userId, error: error.message });
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${syncedCount} user embeddings to Pinecone`,
      synced: syncedCount,
      total: latestThoughts.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Error syncing embeddings to Pinecone:", error);
    return NextResponse.json(
      { error: "Failed to sync embeddings to Pinecone" },
      { status: 500 }
    );
  }
}