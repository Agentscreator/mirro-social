"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2, Play, Pause, Volume2, VolumeX, ArrowLeft, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SharedPost {
  id: number
  content: string
  image?: string
  video?: string
  duration?: number
  createdAt: string
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
  likes: number
  comments: number
}

export default function SharedPostPage() {
  const params = useParams()
  const router = useRouter()
  const shareToken = params.shareToken as string
  
  const [post, setPost] = useState<SharedPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    const fetchSharedPost = async () => {
      try {
        const response = await fetch(`/api/posts/shared/${shareToken}`)
        
        if (response.ok) {
          const data = await response.json()
          setPost(data.post)
        } else if (response.status === 404) {
          setError("This post could not be found or the link has expired.")
        } else {
          setError("Failed to load the shared post.")
        }
      } catch (err) {
        console.error("Error fetching shared post:", err)
        setError("Failed to load the shared post.")
      } finally {
        setLoading(false)
      }
    }

    if (shareToken) {
      fetchSharedPost()
    }
  }, [shareToken])

  const handleVideoClick = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause()
      } else {
        videoRef.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMuteToggle = () => {
    if (videoRef) {
      videoRef.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleSignUp = () => {
    router.push('/auth/signup')
  }

  const handleSignIn = () => {
    router.push('/auth/signin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white/70 text-sm">Loading shared post...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white px-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
            <ExternalLink className="w-8 h-8 text-white/60" />
          </div>
          <h2 className="text-xl font-bold mb-3">Post Not Found</h2>
          <p className="text-white/70 text-sm mb-6 leading-relaxed">
            {error || "This post could not be found or the link has expired."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 rounded-full px-6 py-2"
              onClick={() => router.push('/')}
            >
              Go Home
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-2"
              onClick={handleSignUp}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-white font-semibold">Shared Post</div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative h-screen flex items-center justify-center">
        {/* Video/Image Content */}
        <div className="relative w-full max-w-md h-full bg-black overflow-hidden">
          {post.video ? (
            <div className="relative h-full">
              <video
                ref={setVideoRef}
                src={post.video}
                className="w-full h-full object-cover"
                loop
                muted={isMuted}
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={handleVideoClick}
              />
              
              {/* Video Controls */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {!isPlaying && (
                  <div className="bg-black/50 rounded-full p-4 pointer-events-auto" onClick={handleVideoClick}>
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMuteToggle}
                className="absolute top-20 right-4 bg-black/50 text-white rounded-full backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </div>
          ) : post.image ? (
            <img
              src={post.image}
              alt="Shared post"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900">
              <p className="text-white/70">No media available</p>
            </div>
          )}
        </div>

        {/* Post Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pb-8">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12 border-2 border-white/20">
              <AvatarImage src={post.user.profileImage} alt={post.user.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {(post.user.nickname || post.user.username)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                {post.user.nickname || post.user.username}
              </h3>
              <p className="text-white/70 text-sm">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Post Content */}
          {post.content && (
            <p className="text-white mb-4 leading-relaxed">
              {post.content}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-white/70" />
              <span className="text-white/70 text-sm">{post.likes}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white/70" />
              <span className="text-white/70 text-sm">{post.comments}</span>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <h4 className="font-semibold text-white mb-2">Join the conversation</h4>
            <p className="text-white/80 text-sm mb-4">
              Sign up to like, comment, and share posts like this one.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-white border-white/30 hover:bg-white/10 rounded-full"
                onClick={handleSignIn}
              >
                Sign In
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                onClick={handleSignUp}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}