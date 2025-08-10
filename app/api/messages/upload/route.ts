import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
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
      return NextResponse.json({ 
        error: `File type '${file.type}' not allowed. Supported types: images, audio, video, PDF, text, and Office documents.` 
      }, { status: 400 })
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'messages')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`
    const filepath = join(uploadDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return file info
    const fileUrl = `/uploads/messages/${filename}`
    
    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      success: true
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}