import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/lib/auth"
import { uploadToStorage } from '@/src/lib/storage'

export async function POST(request: NextRequest) {
  let buffer: Buffer | null = null
  
  try {
    console.log("=== MESSAGE UPLOAD API START ===")
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log("❌ Unauthorized: No session or user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ Session valid, user ID:", session.user.id)

    // Check content length before parsing to prevent memory issues
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB limit
      console.error("❌ Request too large:", contentLength)
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 })
    }

    // Parse form data with timeout
    let formData: FormData
    try {
      const parsePromise = request.formData()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Form data parsing timeout')), 60000) // 60s timeout
      )
      formData = await Promise.race([parsePromise, timeoutPromise]) as FormData
    } catch (parseError) {
      console.error("❌ Form data parsing failed:", parseError)
      return NextResponse.json({ error: "Failed to parse upload data" }, { status: 400 })
    }

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

    // Validate file size (25MB max for better iOS compatibility)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSize) {
      console.log("❌ File too large:", file.size, "bytes")
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 })
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

    // Convert file to buffer with memory management
    let bytes: ArrayBuffer
    try {
      bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
      
      // Clear the ArrayBuffer reference to help with garbage collection
      bytes = null as any
    } catch (bufferError) {
      console.error("❌ Buffer conversion failed:", bufferError)
      return NextResponse.json({ error: "Failed to process file" }, { status: 400 })
    }

    console.log("💾 Uploading to Backblaze B2...")
    
    let fileUrl: string
    try {
      fileUrl = await uploadToStorage({
        buffer,
        filename: file.name,
        mimetype: file.type,
        folder: 'messages'
      })
    } catch (uploadError) {
      console.error("❌ Upload to B2 failed:", uploadError)
      return NextResponse.json({ 
        error: uploadError instanceof Error ? uploadError.message : "Upload failed" 
      }, { status: 500 })
    } finally {
      // Clear buffer reference to help with memory management
      buffer = null
    }
    
    console.log("✅ File uploaded successfully to B2 storage")
    console.log("🔗 File URL:", fileUrl)
    
    const response = {
      url: fileUrl,
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
    
    // Clear buffer if it exists
    if (buffer) {
      buffer = null
    }
    
    // Provide more specific error messages for iOS
    let errorMessage = "Upload failed"
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = "Upload timeout - please try a smaller file or check your connection"
      } else if (error.message.includes('memory') || error.message.includes('heap')) {
        errorMessage = "File too large for processing - please try a smaller file"
      } else if (error.message.includes('network')) {
        errorMessage = "Network error - please check your connection and try again"
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}