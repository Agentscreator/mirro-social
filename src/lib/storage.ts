// src/lib/storage.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Initialize Backblaze B2 client using S3-compatible API
const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: 'us-west-004', // Backblaze B2 region
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  forcePathStyle: true, // Required for Backblaze B2
})

const BUCKET_NAME = process.env.B2_BUCKET_NAME!

export interface UploadOptions {
  buffer: Buffer
  filename: string
  mimetype: string
  folder?: string
}

export async function uploadToB2(options: UploadOptions): Promise<string> {
  const { buffer, filename, mimetype, folder = "uploads" } = options

  // Validate inputs
  if (!buffer || buffer.length === 0) {
    throw new Error('Invalid buffer: Buffer is empty or null')
  }

  if (!filename || filename.trim() === '') {
    throw new Error('Invalid filename: Filename is empty or null')
  }

  if (!mimetype || mimetype.trim() === '') {
    throw new Error('Invalid mimetype: MIME type is empty or null')
  }

  // Generate unique filename
  const timestamp = Date.now()
  const fileExtension = filename.split('.').pop() || 'bin'
  const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`
  const key = `${folder}/${uniqueFilename}`

  // Validate file size (max 100MB to prevent iOS crashes)
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (buffer.length > maxSize) {
    throw new Error(`File too large: ${buffer.length} bytes (max ${maxSize} bytes)`)
  }

  let retryCount = 0
  const maxRetries = 3

  while (retryCount < maxRetries) {
    try {
      console.log("=== B2 UPLOAD DEBUG ===")
      console.log("Uploading to B2:", key)
      console.log("File size:", buffer.length)
      console.log("MIME type:", mimetype)
      console.log("Bucket:", BUCKET_NAME)
      console.log("Retry attempt:", retryCount + 1)

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        // Remove ACL for Backblaze B2 compatibility
        Metadata: {
          'original-filename': filename,
          'upload-timestamp': timestamp.toString(),
        },
      })

      await s3Client.send(command)

      // Construct the public URL
      const publicUrl = `${process.env.B2_ENDPOINT}/${BUCKET_NAME}/${key}`
      
      console.log("B2 upload successful:", publicUrl)
      console.log("=== B2 UPLOAD COMPLETE ===")

      return publicUrl
    } catch (error) {
      retryCount++
      console.error(`B2 upload attempt ${retryCount} failed:`, error)
      
      if (retryCount >= maxRetries) {
        console.error("B2 upload failed after all retries")
        throw new Error(`Failed to upload to B2 after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, retryCount) * 1000 // 2s, 4s, 8s
      console.log(`Waiting ${waitTime}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw new Error('Upload failed: Maximum retries exceeded')
}

export async function deleteFromB2(fileUrl: string): Promise<void> {
  try {
    // Extract the key from the URL
    const url = new URL(fileUrl)
    const key = url.pathname.substring(1).replace(`${BUCKET_NAME}/`, '')

    console.log("Deleting from B2:", key)

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
    console.log("B2 delete successful:", key)
  } catch (error) {
    console.error("B2 delete failed:", error)
    throw new Error(`Failed to delete from B2: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper function for backward compatibility
export async function uploadToStorage(options: UploadOptions): Promise<string> {
  return uploadToB2(options)
}