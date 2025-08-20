// app/api/recommendations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { getRecommendations } from "@/src/lib/recommendationService";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log(`Getting recommendations for user ${session.user.id}`);
    
    // Get query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "2");
    
    console.log(`Page: ${page}, PageSize: ${pageSize}`);
        
    // Get recommendations
    const recommendations = await getRecommendations(
      session.user.id,
      page,
      pageSize
    );
    
    console.log(`Returning ${recommendations.users.length} recommendations`);
        
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}