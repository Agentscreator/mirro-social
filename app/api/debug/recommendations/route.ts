// app/api/debug/recommendations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable, usersTable } from "@/src/db/schema";
import { eq, ne, and, sql, isNotNull, desc } from "drizzle-orm";
import { Pinecone } from "@pinecone-database/pinecone";

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

// Parse embedding string to number array
function parseEmbedding(str: string): number[] | null {
  try {
    const embedding = JSON.parse(str);
    if (Array.isArray(embedding) && embedding.length > 0 && embedding.every(val => typeof val === 'number')) {
      return embedding;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Get most recent user embedding
async function getMostRecentUserEmbedding(userId: string): Promise<number[]> {
  try {
    const userThought = await db
      .select()
      .from(thoughtsTable)
      .where(and(eq(thoughtsTable.userId, userId), isNotNull(thoughtsTable.embedding)))
      .orderBy(desc(thoughtsTable.createdAt))
      .limit(1);

    if (userThought.length === 0) {
      return [];
    }

    const embedding = parseEmbedding(userThought[0].embedding);
    return embedding || [];
  } catch (error) {
    console.error("Error getting user embedding:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const debugInfo: any = {
      currentUserId: userId,
      steps: []
    };

    // Step 1: Check if user has embeddings
    const userEmbedding = await getMostRecentUserEmbedding(userId);
    debugInfo.steps.push({
      step: 1,
      name: "Get user embedding",
      hasEmbedding: userEmbedding.length > 0,
      embeddingLength: userEmbedding.length
    });

    if (userEmbedding.length === 0) {
      debugInfo.steps.push({
        step: "STOP",
        reason: "User has no valid embeddings"
      });
      return NextResponse.json(debugInfo);
    }

    // Step 2: Query Pinecone
    try {
      const indexName = process.env.PINECONE_INDEX || 'mirro-public';
      const index = pineconeClient.index(indexName);
      
      debugInfo.steps.push({
        step: 2,
        name: "Pinecone setup",
        indexName,
        namespace: 'user-embeddings'
      });

      const queryResponse = await index.namespace('user-embeddings').query({
        vector: userEmbedding,
        topK: 50,
        includeMetadata: true,
      });

      debugInfo.steps.push({
        step: 3,
        name: "Pinecone query",
        totalMatches: queryResponse.matches?.length || 0,
        matches: queryResponse.matches?.map(match => ({
          id: match.id,
          score: match.score,
          userId: match.metadata?.userId
        })) || []
      });

      // Step 3: Filter out current user
      const userIds = queryResponse.matches
        ?.map((match) => match.metadata?.userId)
        .filter(Boolean)
        .filter(id => id !== userId) || [];

      debugInfo.steps.push({
        step: 4,
        name: "Filter current user",
        userIdsAfterFilter: userIds,
        filteredCount: userIds.length
      });

      if (userIds.length === 0) {
        debugInfo.steps.push({
          step: "STOP",
          reason: "No user matches after filtering"
        });
        return NextResponse.json(debugInfo);
      }

      // Step 4: Get user details from database
      const userDetails = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          nickname: usersTable.nickname,
          image: usersTable.image,
          profileImage: usersTable.profileImage,
          hasEmbeddings: sql<boolean>`EXISTS (
            SELECT 1 FROM ${thoughtsTable}
            WHERE ${thoughtsTable.userId} = ${usersTable.id}
            AND ${thoughtsTable.embedding} IS NOT NULL
            LIMIT 1
          )`,
        })
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(${userIds})`);

      debugInfo.steps.push({
        step: 5,
        name: "Database lookup",
        foundUsers: userDetails.length,
        users: userDetails.map(user => ({
          id: user.id,
          username: user.username,
          hasEmbeddings: user.hasEmbeddings
        }))
      });

      // Step 5: Filter users with embeddings
      const usersWithEmbeddings = userDetails.filter(user => user.hasEmbeddings);
      
      debugInfo.steps.push({
        step: 6,
        name: "Filter users with embeddings",
        usersWithEmbeddings: usersWithEmbeddings.length,
        usersFiltered: userDetails.length - usersWithEmbeddings.length
      });

      debugInfo.finalResult = {
        totalRecommendations: usersWithEmbeddings.length,
        success: usersWithEmbeddings.length > 0
      };

    } catch (pineconeError) {
      debugInfo.steps.push({
        step: "ERROR",
        name: "Pinecone error",
        error: pineconeError.message
      });
    }

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}