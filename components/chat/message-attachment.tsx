"use client"

import { useState } from "react"
import { X, Download, Eye, FileText, ImageIcon, Film, Music, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StreamAttachment } from '@/types/stream-chat'

interface MessageAttachmentProps {
  attachment: StreamAttachment
}

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Determine attachment type
  const isImage = attachment.type?.startsWith("image/") || attachment.image_url
  const isVideo = attachment.type?.startsWith("video/")
  const isAudio = attachment.type?.startsWith("audio/")
  const isPdf = attachment.type === "application/pdf" || attachment.mime_type === "application/pdf"

  // Get file name from URL if not provided
  const fileName = attachment.title || attachment.asset_url?.split("/").pop() || "File"

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Get appropriate icon based on file type
  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-5 w-5 text-sky-500" />
    if (isVideo) return <Film className="h-5 w-5 text-sky-500" />
    if (isAudio) return <Music className="h-5 w-5 text-sky-500" />
    if (isPdf) return <FileText className="h-5 w-5 text-sky-500" />
    return <File className="h-5 w-5 text-sky-500" />
  }

  // Handle file download
  const handleDownload = () => {
    const url = attachment.asset_url || attachment.image_url
    if (!url) return

    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Get image URL with fallback
  const getImageUrl = () => {
    return attachment.image_url || attachment.asset_url
  }

  return (
    <div className="mt-2 max-w-xs">
      {/* Image preview */}
      {isImage && !imageError && (
        <div className="relative group">
          <img
            src={getImageUrl() || "/placeholder.svg"}
            alt={attachment.title || "Image attachment"}
            className="max-h-48 w-full rounded-lg object-cover cursor-pointer border border-sky-100"
            onClick={() => setIsPreviewOpen(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/80 backdrop-blur-sm hover:bg-white"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
          </div>
        </div>
      )}

      {/* Video preview */}
      {isVideo && (
        <div className="relative group">
          <video
            src={attachment.asset_url}
            className="max-h-48 w-full rounded-lg object-cover border border-sky-100"
            controls
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Audio preview */}
      {isAudio && (
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white rounded-md shadow-sm">{getFileIcon()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sky-900 truncate">{fileName}</p>
              <p className="text-xs text-sky-600">{formatFileSize(attachment.file_size)}</p>
            </div>
          </div>
          <audio src={attachment.asset_url} controls className="w-full" preload="metadata">
            Your browser does not support the audio tag.
          </audio>
        </div>
      )}

      {/* File preview for non-media files or failed images */}
      {(!isImage && !isVideo && !isAudio) || imageError ? (
        <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-white rounded-md shadow-sm">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sky-900 truncate">{fileName}</p>
            <p className="text-xs text-sky-600">{formatFileSize(attachment.file_size)}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-sky-500 hover:text-sky-600 hover:bg-sky-100 p-1 h-auto"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* Full-screen image preview */}
      {isPreviewOpen && isImage && !imageError && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={getImageUrl() || "/placeholder.svg"}
              alt={attachment.title || "Image attachment"}
              className="max-h-[90vh] max-w-full object-contain"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                setIsPreviewOpen(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation()
                handleDownload()
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
