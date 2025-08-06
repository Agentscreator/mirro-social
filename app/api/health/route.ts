import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "configured" : "missing"
  })
}