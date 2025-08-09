"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MessageCircle, Share2, ArrowLeft, Play, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"

interface Post {
  id: number
  content: string
  createdAt: string
  image: string | null
  video: string | null
  likes: number
  comments: number
  isLiked?: boolean
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
    image?: string
  }
}

export default function PublicPostPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const postId = params?.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/posts/${postId}/public`)
        
        if (response.ok) {
          const data = await response.json()
          setPost(data.post)
        } else if (response.status === 404) {
          setError("Post not found")
        } else {
          setError("Failed to load post")
        }
      } catch (error) {
        console.error("Error fetching post:", error)
        setError("Failed to load post")
      } finally {
        setLoading(false)
      }
    }

    if (postId) {
      fetchPost()
    }
  }, [postId])

  const handleLike = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive",
      })
      return
    }

    if (!post) return

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: post.isLiked ? "DELETE" : "POST",
      })

      if (response.ok) {
        const updatedPost = await response.json()
        setPost(prev => prev ? {
          ...prev,
          likes: updatedPost.likes,
          isLiked: updatedPost.isLiked
        } : null)
      }
    } catch (error) {
      console.error("Error liking post:", error)
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (!post) return

    const shareUrl = window.location.href

    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `Check out this post by ${post.user.nickname || post.user.username}`,
          text: post.content,
          url: shareUrl,
        })
        return
      } catch (shareError) {
        console.log("Native share failed, falling back to clipboard")
      }
    }

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link Copied!",
        description: "Post link has been copied to your clipboard",
      })
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand("copy")
        toast({
          title: "Link Copied!",
          description: "Post link has been copied to your clipboard",
        })
      } catch (err) {
        toast({
          title: "Share",
          description: `Copy this link: ${shareUrl}`,
        })
      }
      document.body.removeChild(textArea)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
          <p className="text-white/70 text-sm">Loading post...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white px-8 max-w-sm">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-white/60" />
          </div>
          <h2 className="text-xl font-bold mb-3">{error || "Post not found"}</h2>
          <p className="text-white/70 text-sm mb-6">
            This post may have been deleted or is not available.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full px-6 py-2"
          >
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-white font-semibold text-lg">Post</h1>
        </div>
      </div>

      {/* Post Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative h-12 w-12 overflow-hidden rounded-full">
                <Image
                  src={post.user.profileImage || post.user.image || "/placeholder.svg?height=48&width=48"}
                  alt={post.user.username}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {post.user.nickname || post.user.username}
                </h3>
                <p className="text-sm text-gray-400">@{post.user.username}</p>
              </div>
            </div>

            {/* Post Content */}
            {post.content && (
              <p className="text-white mb-4 leading-relaxed">{post.content}</p>
            )}

            {/* Media */}
            {post.video && (
              <div className="relative mb-4 rounded-lg overflow-hidden bg-black">
                <video
                  src={post.video}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full max-h-96 object-contain"
                  poster={post.image || undefined}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {post.image && !post.video && (
              <div className="relative mb-4 rounded-lg overflow-hidden">
                <Image
                  src={post.image}
                  alt="Post image"
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Post Meta */}
            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <span>{formatDate(post.createdAt)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors ${
                  post.isLiked ? "text-red-500" : "text-gray-400"
                }`}
              >
                <Heart className={`h-5 w-5 ${post.isLiked ? "fill-current" : ""}`} />
                <span>{post.likes}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-gray-400 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{post.comments}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-400 hover:bg-green-500/10 hover:text-green-500 transition-colors"
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </Button>
            </div>

            {/* Sign in prompt for non-authenticated users */}
            {!session && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-sm font-medium mb-2">
                  Join the conversation!
                </p>
                <p className="text-blue-300/70 text-sm mb-3">
                  Sign in to like, comment, and share posts.
                </p>
                <Button
                  onClick={() => router.push("/auth/signin")}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full px-4 py-2 text-sm"
                >
                  Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}