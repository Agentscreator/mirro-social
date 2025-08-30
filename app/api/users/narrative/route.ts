// app/api/users/narrative/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable, usersTable } from "@/src/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import { openai } from "@/src/lib/openai";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get target user's information
    const targetUser = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get target user's recent thoughts
    const thoughts = await db
      .select({
        id: thoughtsTable.id,
        content: thoughtsTable.content,
        createdAt: thoughtsTable.createdAt,
      })
      .from(thoughtsTable)
      .where(eq(thoughtsTable.userId, userId))
      .orderBy(desc(thoughtsTable.createdAt))
      .limit(5); // Get recent thoughts for narrative generation

    if (thoughts.length === 0) {
      return NextResponse.json({ 
        narrative: generateFallbackNarrative(targetUser[0].username || targetUser[0].nickname),
        source: "fallback"
      });
    }

    // Generate AI narrative about this user
    const narrative = await generateUserNarrative(targetUser[0], thoughts);

    return NextResponse.json({ 
      narrative,
      source: "ai"
    });
  } catch (error) {
    console.error("Error generating user narrative:", error);
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 }
    );
  }
}

async function generateUserNarrative(user: any, thoughts: any[]) {
  if (!process.env.OPENAI_API_KEY) {
    return generateFallbackNarrative(user.username || user.nickname);
  }

  try {
    // Combine thoughts for context
    const thoughtTexts = thoughts.map(t => t.content).join('\n\n');
    const userName = user.nickname || user.username;
    
    const prompt = `Based on these personal thoughts and reflections, write a poetic, introspective narrative about this person. The narrative should:

- Be written in second person ("You are someone who...")
- Be 2-3 sentences long
- Capture their inner world and personality
- Be thoughtful and respectful
- Feel like a journal entry about meeting someone with a beautiful mind
- Focus on their depth of thought and character

Thoughts from ${userName}:
${thoughtTexts}

Write a single narrative paragraph that captures who this person seems to be based on their thoughts.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a thoughtful observer who creates beautiful, respectful narratives about people based on their inner thoughts. Focus on their depth, wisdom, and unique perspective."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content?.trim() || generateFallbackNarrative(userName);
  } catch (error) {
    console.error("Error with OpenAI narrative generation:", error);
    return generateFallbackNarrative(user.username || user.nickname);
  }
}

function generateFallbackNarrative(username: string): string {
  const templates = [
    `You are someone who shares a thoughtful presence in this community, ${username}. Your mind seems to wander through meaningful territories, seeking connection and understanding.`,
    `There's a contemplative quality about ${username} that suggests deep waters run beneath the surface. You appear to be someone who values authentic connection.`,
    `${username} carries the essence of someone who thinks deeply about life's mysteries. You seem to find meaning in the spaces between words.`,
    `You are ${username}, a soul who appears to navigate the world with both curiosity and wisdom, seeking genuine connections with kindred spirits.`,
    `There's something about ${username} that speaks to a reflective nature, someone who transforms everyday moments into profound insights.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}