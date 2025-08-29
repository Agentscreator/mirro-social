// app/api/debug/discover-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { fetchRecommendations } from "@/src/lib/apiServices";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log(`=== TESTING DISCOVER FOR USER ${session.user.id} ===`);
    
    // Test the same call that the discover page makes
    const result = await fetchRecommendations(1, 10, Math.floor(Math.random() * 1000));
    
    console.log(`=== RESULT: ${result.users.length} users returned ===`);
    
    return NextResponse.json({
      userId: session.user.id,
      totalUsers: result.users.length,
      users: result.users,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
      success: true
    });
  } catch (error) {
    console.error("Error in discover test:", error);
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
}