"use client"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Check, CheckCheck, Download, Play, Pause, Image as ImageIcon, FileText } from "lucide-react"

interface MessageBubbleProps {
  message: {
    id: string
    content: string
    senderId: string
    timestamp: Date
    isRead: boolean
    messageType?: string
    attachmentUrl?: string
    attachmentName?: string
    attachmentType?: string
    attachmentSize?: number
  }
  isMe: boolean
  showAvatar: boolean
  senderInfo?: {
    username: string
    nickname?: string
    profileImage?: string
  }
}

export function MessageBubble({ message, isMe, showAvatar, senderInfo }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [imageError, setImageError] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleAudioPlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleDownload = () => {
    if (message.attachmentUrl) {
      const link = document.createElement('a')
      link.href = message.attachmentUrl
      link.download = message.attachmentName || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const renderAttachment = () => {
    if (!message.attachmentUrl) return null

    switch (message.messageType) {
      case 'image':
        return (
          <div className="mt-2">
            {!imageError ? (
              <img
                src={message.attachmentUrl}
                alt={message.attachmentName || 'Image'}
                className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onError={() => setImageError(true)}
                onClick={() => window.open(message.attachmentUrl, '_blank')}
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg max-w-xs">
                <ImageIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-white">{message.attachmentName}</p>
                  <p className="text-xs text-gray-400">Image • {formatFileSize(message.attachmentSize || 0)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-gray-400 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )

      case 'audio':
        return (
          <div className="mt-2">
            <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg max-w-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAudioPlay}
                className="text-blue-400 hover:text-blue-300"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {message.attachmentName || 'Voice Message'}
                </p>
                <p className="text-xs text-gray-400">
                  Audio • {formatFileSize(message.attachmentSize || 0)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-gray-400 hover:text-white"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <audio
              ref={audioRef}
              src={message.attachmentUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )

      case 'file':
      default:
        return (
          <div className="mt-2">
            <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg max-w-xs">
              <FileText className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{message.attachmentName}</p>
                <p className="text-xs text-gray-400">
                  File • {formatFileSize(message.attachmentSize || 0)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-gray-400 hover:text-white"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`flex items-end gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-8 h-8 flex-shrink-0">
          {showAvatar && senderInfo && (
            <Avatar className="w-8 h-8">
              <AvatarImage src={senderInfo.profileImage} alt={senderInfo.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                {(senderInfo.nickname || senderInfo.username)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      
      <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
        <div
          className={`px-4 py-2 rounded-2xl break-words ${
            isMe
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-gray-800 text-white rounded-bl-md shadow-sm border border-gray-700'
          }`}
        >
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}
          {renderAttachment()}
        </div>
        
        <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-400">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            <div className="text-gray-400">
              {message.isRead ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}