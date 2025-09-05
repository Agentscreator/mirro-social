import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 })
    }

    console.log("🔍 Validating media URL:", url)

    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MediaValidator/1.0)'
        }
      })
      
      const result = {
        url,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        accessible: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      }

      console.log("✅ Media validation result:", result)
      return NextResponse.json(result)
    } catch (fetchError) {
      console.error("❌ Media fetch error:", fetchError)
      return NextResponse.json({
        url,
        accessible: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      })
    }
  } catch (error) {
    console.error("Validate media error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}