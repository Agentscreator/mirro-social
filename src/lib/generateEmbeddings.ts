import { eq } from "drizzle-orm";
import { db } from "../db";
import { thoughtsTable } from "../db/schema";
import { querySimilarUsers } from "./vectorStore";
import { openai } from "./openai";

// Generate real embeddings using OpenAI
export async function getEmbedding(content: string): Promise<number[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not configured, using dummy embeddings");
      return new Array(1536).fill(Math.random());
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    });

    if (response.data && response.data.length > 0) {
      return response.data[0].embedding;
    } else {
      throw new Error("No embedding data returned from OpenAI");
    }
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Fallback to dummy embedding on error
    return new Array(1536).fill(Math.random());
  }
}

interface UserSimilarityMatch {
  userId: string;
  similarity: number;
}

function getMostRecentEmbedding(
  thoughts: { embedding: string | null; createdAt: Date }[]
): number[] | null {
  const latest = thoughts
    .filter((t) => t.embedding)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return latest ? JSON.parse(latest.embedding!) : null;
}

/**
 * Fetch similarity matches from Pinecone for a user and a list of candidate user IDs.
 * @param currentUserId - UUID of the current user
 * @param candidateIds - Array of candidate user UUIDs
 */
export async function getEmbeddingSimilarityMatches(
  currentUserId: string,
  candidateIds: string[]
): Promise<UserSimilarityMatch[]> {
  const currentUserThoughts = await db
    .select()
    .from(thoughtsTable)
    .where(eq(thoughtsTable.userId, currentUserId));

  const userEmbedding = getMostRecentEmbedding(currentUserThoughts);
  if (!userEmbedding) {
    console.warn("No embedding for current user");
    return candidateIds.map((id) => ({ userId: id, similarity: 0 }));
  }

  const matchesRaw = await querySimilarUsers(userEmbedding, candidateIds, candidateIds.length);

  return matchesRaw.map((m) => ({ userId: m.userId, similarity: m.similarity }));
}
