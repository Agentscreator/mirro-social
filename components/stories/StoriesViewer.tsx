"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight, Eye, Heart, MessageCircle, Send, Play, Pause } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

interface Story {
  id: number
  userId: string
  type: string
  communityId?: string
  content?: string
  image?: string
  video?: string
  createdAt: string
  expiresAt: string
  views: number
  isViewed: boolean
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
  community?: {
    id: string
    name: string
    image?: string
  } | null
}

interface StoriesViewerProps {
  stories: Story[]
  onClose: () => void
  initialStoryIndex?: number
}

export function StoriesViewer({ stories, onClose, initialStoryIndex = 0 }: StoriesViewerProps) {
  const { data: session } = useSession()
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<NodeJS.Timeout>()
  const storyDuration = 5000 // 5 seconds for images, video duration for videos

  const currentStory = stories[currentIndex]

  useEffect(() => {
    if (!currentStory) return

    // Mark story as viewed
    if (!currentStory.isViewed) {
      markStoryAsViewed(currentStory.id)
    }

    // Reset progress
    setProgress(0)
    setIsPlaying(true)

    // Handle video playback
    if (currentStory.video && videoRef.current) {
      videoRef.current.play()
    }

    // Start progress timer
    startProgressTimer()

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current)
      }
    }
  }, [currentIndex, currentStory])

  const startProgressTimer = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current)
    }

    const duration = currentStory.video ? 
      (videoRef.current?.duration || 15) * 1000 : 
      storyDuration

    const interval = 50 // Update every 50ms
    const increment = (interval / duration) * 100

    progressRef.current = setInterval(() => {
      if (isPlaying) {
        setProgress(prev => {
          const newProgress = prev + increment
          if (newProgress >= 100) {
            nextStory()
            return 0
          }
          return newProgress
        })
      }
    }, interval)
  }

  const markStoryAsViewed = async (storyId: number) => {
    try {
      await fetch(`/api/stories/${storyId}/view`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error marking story as viewed:', error)
    }
  }

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onClose()
    }
  }

  const previousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const togglePlayPause = () => {
    if (currentStory.video && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || sendingReply) return

    setSendingReply(true)
    try {
      const response = await fetch('/api/stream/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipientId: currentStory.userId,
          initialMessage: `Replied to your story: ${replyText.trim()}`
        }),
      })

      if (response.ok) {
        toast({
          title: "Reply sent",
          description: "Your reply has been sent as a message",
        })
        setReplyText("")
      } else {
        throw new Error('Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      })
    } finally {
      setSendingReply(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return `${Math.floor(diffInSeconds / 86400)}d`
  }

  if (!currentStory) return null

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full h-[90vh] p-0 bg-black border-none rounded-2xl overflow-hidden">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-50 flex gap-1">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ 
                  width: index < currentIndex ? '100%' : 
                         index === currentIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white">
              <AvatarImage src={currentStory.user.profileImage} />
              <AvatarFallback className="bg-gray-700 text-white">
                {(currentStory.user.nickname || currentStory.user.username)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm">
                {currentStory.user.nickname || currentStory.user.username}
              </p>
              <p className="text-white/70 text-xs">
                {formatTimeAgo(currentStory.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentStory.video && (
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Story content */}
        <div 
          className="relative h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black"
          onClick={togglePlayPause}
        >
          {currentStory.image && (
            <img
              src={currentStory.image}
              alt="Story"
              className="max-h-full max-w-full object-contain"
            />
          )}
          
          {currentStory.video && (
            <video
              ref={videoRef}
              src={currentStory.video}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={nextStory}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          {currentStory.content && (
            <div className="absolute inset-x-4 bottom-24 bg-black/50 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white text-center text-lg leading-relaxed">
                {currentStory.content}
              </p>
            </div>
          )}

          {/* Navigation areas */}
          <button
            className="absolute left-0 top-0 bottom-0 w-1/3 z-30"
            onClick={(e) => {
              e.stopPropagation()
              previousStory()
            }}
          />
          <button
            className="absolute right-0 top-0 bottom-0 w-1/3 z-30"
            onClick={(e) => {
              e.stopPropagation()
              nextStory()
            }}
          />
        </div>

        {/* Story stats and reply */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-4 mb-3 text-white/70">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{currentStory.views}</span>
            </div>
          </div>

          {/* Reply input (only show for other people's stories) */}
          {currentStory.userId !== session?.user?.id && (
            <div className="flex items-center gap-2">
              <Input
                placeholder={`Reply to ${currentStory.user.nickname || currentStory.user.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendReply()
                  }
                }}
              />
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sendingReply}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={previousStory}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-40 h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        {currentIndex < stories.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={nextStory}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-40 h-10 w-10 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}