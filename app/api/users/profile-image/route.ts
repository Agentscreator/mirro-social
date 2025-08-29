// app/api/users/profile-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { db } from "@/src/db";
import { usersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { uploadToStorage } from '@/src/lib/storage';

export async function POST(req: NextRequest) {
  let buffer: Buffer | null = null
  
  try {
    console.log("Profile image upload started");
    
    // 1) Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2) Check content length before parsing to prevent memory issues
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      console.error("Request too large:", contentLength)
      return NextResponse.json({ message: "File too large (max 10MB)" }, { status: 413 });
    }

    // 3) Parse form data with timeout
    let formData: FormData
    try {
      const parsePromise = req.formData()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Form data parsing timeout')), 30000)
      )
      formData = await Promise.race([parsePromise, timeoutPromise]) as FormData
    } catch (parseError) {
      console.error("Form data parsing failed:", parseError)
      return NextResponse.json({ message: "Failed to parse upload data" }, { status: 400 });
    }

    console.log("FormData keys:", Array.from(formData.keys()));
    
    const file = formData.get('profileImage') as File;
    
    if (!file) {
      console.log("No file found in formData");
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    console.log("File received:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 5MB for profile images)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large (max 5MB)" }, { status: 400 });
    }

    // Convert file to buffer with memory management
    let bytes: ArrayBuffer
    try {
      bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      
      // Clear the ArrayBuffer reference to help with garbage collection
      bytes = null as any
    } catch (bufferError) {
      console.error("Buffer conversion failed:", bufferError)
      return NextResponse.json({ message: "Failed to process file" }, { status: 400 });
    }

    // 4) Upload to Backblaze B2 storage
    let imageUrl: string
    try {
      imageUrl = await uploadToStorage({
        buffer,
        filename: file.name,
        mimetype: file.type,
        folder: "profile-images",
      });
    } catch (uploadError) {
      console.error("Upload to B2 failed:", uploadError)
      return NextResponse.json({ 
        message: uploadError instanceof Error ? uploadError.message : "Upload failed" 
      }, { status: 500 });
    } finally {
      // Clear buffer reference to help with memory management
      buffer = null
    }

    // 5) Persist to your DB via Drizzle
    try {
      await db
        .update(usersTable)
        .set({ profileImage: imageUrl })
        .where(eq(usersTable.id, userId));
    } catch (dbError) {
      console.error("Database update failed:", dbError)
      return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
    }

    console.log("Profile image uploaded successfully:", imageUrl);

    // 6) Return the new URL
    return NextResponse.json({ imageUrl });

  } catch (error: any) {
    console.error("Profile-image upload error:", error);
    
    // Clear buffer if it exists
    if (buffer) {
      buffer = null
    }
    
    // Provide more specific error messages
    let errorMessage = "Upload failed"
    if (error.message?.includes('timeout')) {
      errorMessage = "Upload timeout - please try again"
    } else if (error.message?.includes('memory') || error.message?.includes('heap')) {
      errorMessage = "File too large for processing"
    } else if (error.message?.includes('network')) {
      errorMessage = "Network error - please check your connection"
    }
    
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}