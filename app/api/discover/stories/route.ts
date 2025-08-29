import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Mock data for now - in a real app, this would fetch from your recommendation system
    const narratives = [
      "A fellow night owl who finds inspiration in the quiet hours. Their thoughts on creativity and solitude resonate deeply with your own reflections on finding peace in chaos.",
      "Someone who sees poetry in everyday moments. Their musings about finding beauty in mundane experiences align perfectly with your appreciation for life's subtle wonders.",
      "A kindred spirit who questions the nature of existence. Their philosophical inquiries about purpose and meaning echo your own journey of self-discovery.",
      "Someone who finds wisdom in nature's rhythms. Their thoughts about flowing with life's changes mirror your own understanding of adaptation and resilience.",
      "A passionate soul who believes in the power of authentic connection. Their reflections on vulnerability and courage inspire your own journey toward openness.",
      "An artist at heart who sees the world through a lens of wonder. Their creative spirit and appreciation for beauty mirrors your own artistic sensibilities.",
      "A deep thinker who finds meaning in life's complexities. Their thoughtful approach to existence aligns with your own contemplative nature.",
      "Someone who values authentic human connection above all else. Their desire for meaningful relationships resonates with your own search for genuine bonds.",
      "A dreamer who believes in the magic of possibility. Their optimistic outlook and faith in the future inspire your own hopes and aspirations.",
      "A gentle soul who finds strength in vulnerability. Their courage to be authentic encourages your own journey toward self-acceptance."
    ]

    const nicknames = ["Alex", "Luna", "Sage", "River", "Ember", "Nova", "Kai", "Zara", "Phoenix", "Iris"]
    const usernames = ["alex_dreamer", "luna_writer", "sage_wanderer", "river_soul", "ember_heart", "nova_light", "kai_seeker", "zara_mystic", "phoenix_rise", "iris_bloom"]
    
    const tagSets = [
      ["creativity", "solitude", "night thoughts"],
      ["poetry", "mindfulness", "beauty"],
      ["philosophy", "purpose", "growth"],
      ["nature", "change", "wisdom"],
      ["authenticity", "courage", "connection"],
      ["art", "wonder", "creativity"],
      ["depth", "meaning", "reflection"],
      ["connection", "relationships", "empathy"],
      ["dreams", "possibility", "hope"],
      ["vulnerability", "strength", "acceptance"]
    ]

    const mockStories = Array.from({ length: 8 }, (_, i) => ({
      id: `user${i + 1}`,
      username: usernames[i] || `user${i + 1}`,
      nickname: nicknames[i] || `User ${i + 1}`,
      narrative: narratives[i] || narratives[i % narratives.length],
      tags: tagSets[i] || tagSets[i % tagSets.length],
      score: 0.95 - (i * 0.02)
    }))

    return NextResponse.json({ 
      stories: mockStories,
      hasMore: false 
    })
    
  } catch (error) {
    console.error("Error fetching discover stories:", error)
    return NextResponse.json(
      { error: "Failed to fetch discover stories" },
      { status: 500 }
    )
  }
}