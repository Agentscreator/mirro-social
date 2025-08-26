import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('Test registration - received data:', body)
    
    // Just return what we received to help debug
    return NextResponse.json({
      received: body,
      message: "Test endpoint - data received successfully"
    })
  } catch (error) {
    console.error("Test registration error:", error)
    return NextResponse.json(
      { error: "Failed to parse request body" },
      { status: 400 }
    )
  }
}