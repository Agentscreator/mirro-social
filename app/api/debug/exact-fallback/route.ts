// app/api/debug/exact-fallback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable, usersTable } from "@/src/db/schema";
import { ne, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const maxResults = 10;

    console.log(`=== TESTING EXACT FALLBACK QUERY FOR USER ${userId} ===`);

    // This is the EXACT same query from the fallback in recommendationService.ts
    const fallbackUsers = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        nickname: usersTable.nickname,
        image: usersTable.image,
        profileImage: usersTable.profileImage,
      })
      .from(usersTable)
      .where(
        and(
          ne(usersTable.id, userId),
          sql`EXISTS (
            SELECT 1 FROM ${thoughtsTable}
            WHERE ${thoughtsTable.userId} = ${usersTable.id}
            AND ${thoughtsTable.embedding} IS NOT NULL
            LIMIT 1
          )`
        )
      )
      .limit(maxResults)

    console.log(`Exact fallback query found ${fallbackUsers.length} users`);
    console.log('Fallback users:', fallbackUsers.map(u => ({ id: u.id, username: u.username })));

    // Convert to recommendation format
    const recommendationUsers = fallbackUsers.map(user => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname || null,
      image: user.image || null,
      profileImage: user.profileImage || null,
      tags: [],
      similarity: 0.5,
      proximity: undefined,
      score: 0.5,
      reason: null,
    }));

    return NextResponse.json({
      userId,
      totalUsers: fallbackUsers.length,
      users: recommendationUsers
    });

  } catch (error) {
    console.error("Exact fallback test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}