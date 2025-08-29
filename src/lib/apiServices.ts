// src/lib/apiServices.ts

export interface RecommendedUser {
  id: string; // Changed to string for UUID
  username: string;
  nickname?: string | null; // Match database nullable type
  image?: string | null;
  tags?: string[];
  reason?: string | null;
  score?: number;
}

export interface RecommendationsResponse {
  users: RecommendedUser[];
  hasMore: boolean;
  nextPage: number | null;
  totalCount: number;
  currentPage: number;
}

export async function fetchRecommendations(
  page: number = 1, 
  pageSize: number = 2,  // Changed from 'limit' to 'pageSize' to match your API
  randomSeed?: number
): Promise<RecommendationsResponse> {
  try {
    console.log(`Fetching recommendations: page=${page}, pageSize=${pageSize}, seed=${randomSeed}`)
    
    const seedParam = randomSeed ? `&seed=${randomSeed}` : '';
    const response = await fetch(`/api/recommendations?page=${page}&pageSize=${pageSize}${seedParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Recommendations API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      // Return empty result instead of throwing to prevent infinite loading
      return {
        users: [],
        hasMore: false,
        nextPage: null,
        totalCount: 0,
        currentPage: page
      };
    }

    const result = await response.json();
    console.log(`Recommendations API returned ${result.users?.length || 0} users`)
    return result;
  } catch (error) {
    console.error('Error in fetchRecommendations:', error);
    
    // Return empty result instead of throwing to prevent infinite loading
    return {
      users: [],
      hasMore: false,
      nextPage: null,
      totalCount: 0,
      currentPage: page
    };
  }
}

export async function generateExplanation(user: RecommendedUser): Promise<string> {
  try {
    const response = await fetch('/api/recommendations/explanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recommendedUser: user  // Changed to match your API expectation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Explanation API Error Response:', errorText);
      throw new Error(`Failed to generate explanation: ${response.statusText}`);
    }

    const data = await response.json();
    return data.explanation || "You might have some interesting things in common!";
  } catch (error) {
    console.error('Error in generateExplanation:', error);
    return "You might have some interesting things in common!";
  }
}