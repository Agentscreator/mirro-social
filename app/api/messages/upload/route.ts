import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    console.log("=== MESSAGE UPLOAD API START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ Unauthorized: No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ Session valid, user ID:", session.user.id)

    const formData = await request.formData()
    const file = formData.get("file") as File
    
    console.log("📁 File received:", {
      name: file?.name,
      type: file?.type,
      size: file?.size
    })
    
    if (!file) {
      console.log("❌ No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.log("❌ File too large:", file.size, "bytes")
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac',
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      console.log("❌ File type not allowed:", file.type)
      return NextResponse.json({ 
        error: `File type '${file.type}' not allowed. Supported types: images, audio, video, PDF, text, and Office documents.` 
      }, { status: 400 })
    }

    console.log("✅ File validation passed")

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'bin'
    const filename = `${timestamp}-${randomString}.${extension}`
    const pathname = `messages/${filename}`

    console.log("📝 Generated filename:", filename)
    console.log("📁 Blob pathname:", pathname)

    // Upload to Vercel Blob
    console.log("💾 Uploading to Vercel Blob...")
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: file.type,
    })
    
    console.log("✅ File uploaded successfully to blob storage")
    console.log("🔗 Blob URL:", blob.url)
    
    const response = {
      url: blob.url,
      name: file.name,
      type: file.type,
      size: file.size,
      success: true
    }

    console.log("✅ Upload successful:", response)
    console.log("=== MESSAGE UPLOAD API END ===")
    
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Error uploading file:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack")
    console.log("=== MESSAGE UPLOAD API END (ERROR) ===")
    return NextResponse.json({ 
      error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}