// app/api/debug/database-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { thoughtsTable, usersTable } from "@/src/db/schema";
import { ne, and, sql, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`=== TESTING DATABASE USERS FOR USER ${userId} ===`);

    // Test 1: Get all users
    const allUsers = await db.select().from(usersTable).limit(5);
    console.log(`Total users in database: ${allUsers.length}`);

    // Test 2: Get all thoughts with embeddings
    const thoughtsWithEmbeddings = await db
      .select()
      .from(thoughtsTable)
      .where(isNotNull(thoughtsTable.embedding))
      .limit(5);
    console.log(`Thoughts with embeddings: ${thoughtsWithEmbeddings.length}`);

    // Test 3: Get users with embeddings (simple query)
    const usersWithEmbeddings = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
      })
      .from(usersTable)
      .where(
        sql`EXISTS (
          SELECT 1 FROM ${thoughtsTable}
          WHERE ${thoughtsTable.userId} = ${usersTable.id}
          AND ${thoughtsTable.embedding} IS NOT NULL
          LIMIT 1
        )`
      )
      .limit(10);

    console.log(`Users with embeddings: ${usersWithEmbeddings.length}`);

    // Test 4: Get users with embeddings excluding current user
    const usersExcludingCurrent = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
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
      .limit(10);

    console.log(`Users with embeddings (excluding current): ${usersExcludingCurrent.length}`);

    return NextResponse.json({
      currentUserId: userId,
      allUsers: allUsers.length,
      thoughtsWithEmbeddings: thoughtsWithEmbeddings.length,
      usersWithEmbeddings: usersWithEmbeddings.length,
      usersExcludingCurrent: usersExcludingCurrent.length,
      sampleUsers: usersExcludingCurrent.map(u => ({ id: u.id, username: u.username }))
    });

  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}