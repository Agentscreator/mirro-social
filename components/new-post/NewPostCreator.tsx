"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Upload, X, Loader2, Video, Image as ImageIcon } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface NewPostCreatorProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: (post: any) => void
}

export function NewPostCreator({ isOpen, onClose, onPostCreated }: NewPostCreatorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image or video file",
          variant: "destructive",
        })
        return
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  // Create post
  const handleCreatePost = async () => {
    if (!caption.trim() && !selectedFile) {
      toast({
        title: "Content required",
        description: "Please add some text or upload a file",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('content', caption.trim())
      
      if (selectedFile) {
        formData.append('media', selectedFile)
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Success!",
          description: "Your post has been created",
        })
        
        // Clear form
        setCaption("")
        setSelectedFile(null)
        setPreviewUrl(null)
        
        // Notify parent and close
        onPostCreated?.(result.post)
        onClose()
        
        // Refresh feed
        window.dispatchEvent(new CustomEvent('feedRefresh'))
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create post",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Close and cleanup
  const handleClose = () => {
    setCaption("")
    setSelectedFile(null)
    setPreviewUrl(null)
    setIsUploading(false)
    onClose()
  }

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg mx-auto bg-gray-900 text-white border-gray-700 p-0">
        <DialogTitle className="sr-only">Create New Post</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create Post</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Media Preview */}
          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden bg-black">
              {selectedFile?.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  className="w-full h-48 object-cover"
                  controls
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={removeFile}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Caption Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              What's on your mind?
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your thoughts..."
              className="min-h-[100px] bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              maxLength={2000}
            />
            <div className="text-xs text-gray-400 text-right">
              {caption.length}/2000
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {!selectedFile && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-gray-600 text-white hover:bg-gray-800"
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Photo or Video
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-600 text-white hover:bg-gray-800"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={isUploading || (!caption.trim() && !selectedFile)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Share Post"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}