// app/api/debug/recommendations-simple/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { getRecommendations } from "@/src/lib/recommendationService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`=== TESTING RECOMMENDATIONS FOR USER ${session.user.id} ===`);
    
    const recommendations = await getRecommendations(session.user.id, 1, 10);
    
    console.log(`=== RESULT: ${recommendations.users.length} users returned ===`);
    
    return NextResponse.json({
      userId: session.user.id,
      totalUsers: recommendations.users.length,
      users: recommendations.users,
      hasMore: recommendations.hasMore,
      totalCount: recommendations.totalCount
    });

  } catch (error) {
    console.error("Error in simple recommendations test:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}