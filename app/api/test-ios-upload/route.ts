import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("=== iOS UPLOAD TEST DEBUG START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Headers:", Object.fromEntries(request.headers.entries()))
    console.log("User Agent:", request.headers.get('user-agent'))
    console.log("Content Type:", request.headers.get('content-type'))
    console.log("Content Length:", request.headers.get('content-length'))

    let formData: FormData
    try {
      formData = await request.formData()
      console.log("✅ FormData parsed successfully")
    } catch (error) {
      console.error("❌ FormData parsing failed:", error)
      return NextResponse.json({ 
        error: "Failed to parse form data",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 400 })
    }

    const entries = Array.from(formData.entries())
    console.log("Form entries count:", entries.length)
    
    for (const [key, value] of entries) {
      if (value instanceof File) {
        console.log(`File field "${key}":`, {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: (value as any).lastModified,
        })
        
        // Test reading the file
        try {
          const arrayBuffer = await value.arrayBuffer()
          console.log(`File "${key}" read successfully, size:`, arrayBuffer.byteLength)
        } catch (readError) {
          console.error(`Failed to read file "${key}":`, readError)
        }
      } else {
        console.log(`Text field "${key}":`, String(value).substring(0, 100))
      }
    }

    console.log("=== iOS UPLOAD TEST DEBUG END ===")
    
    return NextResponse.json({ 
      success: true,
      message: "Upload test completed successfully",
      entryCount: entries.length,
      userId: session.user.id
    })
    
  } catch (error) {
    console.error("❌ iOS UPLOAD TEST ERROR:", error)
    return NextResponse.json({ 
      error: "Test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}