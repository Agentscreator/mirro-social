"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Edit, Send, Heart, MessageCircle, Share2, Users, UserPlus, Camera, Check, Eye, Plus, Trash2, X, Play, Reply, ChevronDown, ChevronUp, Loader2, Video } from 'lucide-react'
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
}

interface ProfileUser {
  id: string
  username: string
  nickname?: string
  metro_area?: string
  followers?: number
  following?: number
  visitors?: number
  profileImage?: string
  about?: string
  image?: string
}

interface FollowUser {
  id: string
  username: string
  nickname?: string
  profileImage?: string
  image?: string
}

interface Comment {
  id: number
  content: string
  createdAt: string
  userId: string
  parentCommentId?: number | null
  user: {
    username: string
    nickname?: string
    profileImage?: string
  }
  replies?: Comment[]
}

export default function ProfilePage() {
  const params = useParams()
  const { data: session } = useSession()
  const router = useRouter()
  const userId = params?.userId as string
  const isOwnProfile = !userId || userId === session?.user?.id

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [editedAbout, setEditedAbout] = useState("")
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false)
  const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  // Post creation states
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)
  const [postContent, setPostContent] = useState("")



  // Post viewing states
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isPostViewOpen, setIsPostViewOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentsLoading, setCommentsLoading] = useState(false)

  // Reply states
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())

  // Post editing states
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editingPostContent, setEditingPostContent] = useState("")
  const [editingPostMedia, setEditingPostMedia] = useState<string | null>(null)
  const [editingPostMediaType, setEditingPostMediaType] = useState<"image" | "video" | null>(null)
  const [newEditMedia, setNewEditMedia] = useState<File | null>(null)
  const [removeEditMedia, setRemoveEditMedia] = useState(false)
  const [isEditPostDialogOpen, setIsEditPostDialogOpen] = useState(false)

  const cacheKey = `posts-${userId || session?.user?.id}`

  const fetchPosts = useCallback(
    async (targetUserId: string, forceRefresh = false) => {
      try {
        setPostsLoading(true)
        console.log("=== FRONTEND FETCH POSTS DEBUG START ===")
        console.log("Target user ID:", targetUserId)
        console.log("Force refresh:", forceRefresh)

        if (!forceRefresh) {
          const cachedPosts = sessionStorage.getItem(cacheKey)
          if (cachedPosts) {
            const parsed = JSON.parse(cachedPosts)
            const cacheAge = Date.now() - parsed.timestamp
            if (cacheAge < 30 * 1000) { // Reduced cache time to 30 seconds for better post visibility
              setPosts(parsed.data)
              console.log("✅ Posts loaded from cache:", parsed.data.length)
              setPostsLoading(false)
              return
            }
          }
        }

        const apiUrl = `/api/posts?userId=${targetUserId}&t=${Date.now()}`
        const postsResponse = await fetch(apiUrl)
        if (postsResponse.ok) {
          const postsData = await postsResponse.json()
          const newPosts = postsData.posts || []
          setPosts(newPosts)

          const cacheData = {
            data: newPosts,
            timestamp: Date.now(),
          }
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
          console.log("✅ Successfully fetched posts:", newPosts.length)
        } else {
          throw new Error("Failed to fetch posts")
        }
      } catch (error: any) {
        console.error("❌ Error fetching posts:", error)
        toast({
          title: "Error",
          description: "Failed to load posts. Please try again.",
          variant: "destructive",
        })
      } finally {
        setPostsLoading(false)
      }
    },
    [cacheKey],
  )

  const fetchFollowers = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/users/${targetUserId}/followers`)
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers || [])
      }
    } catch (error) {
      console.error("❌ Error fetching followers:", error)
    }
  }

  const fetchFollowing = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/users/${targetUserId}/following`)
      if (response.ok) {
        const data = await response.json()
        setFollowing(data.following || [])
      }
    } catch (error) {
      console.error("❌ Error fetching following:", error)
    }
  }

  // Helper function to organize comments into nested structure
  const organizeComments = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>()
    const topLevelComments: Comment[] = []

    // First pass: create map of all comments
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: organize into hierarchy
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parentCommentId) {
        // This is a reply
        const parentComment = commentMap.get(comment.parentCommentId)
        if (parentComment) {
          parentComment.replies!.push(commentWithReplies)
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentWithReplies)
      }
    })

    return topLevelComments
  }

  const fetchComments = async (postId: number) => {
    try {
      setCommentsLoading(true)
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data = await response.json()
        const organizedComments = organizeComments(data.comments || [])
        setComments(organizedComments)
      } else {
        setComments([])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const targetUserId = userId || session?.user?.id
        if (!targetUserId) return

        // Fetch profile
        const response = await fetch(`/api/users/profile/${targetUserId}`)
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setEditedAbout(data.user.about || "")
        }

        // Fetch posts
        await fetchPosts(targetUserId)

        // Fetch follow status if not own profile
        if (!isOwnProfile) {
          const followResponse = await fetch(`/api/users/${targetUserId}/follow-status`)
          if (followResponse.ok) {
            const followData = await followResponse.json()
            setIsFollowing(followData.isFollowing)
          }

          // Record visit
          await fetch(`/api/users/${targetUserId}/visit`, { method: "POST" })
        }
      } catch (error: any) {
        console.error("❌ Error fetching profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchProfile()
    }
  }, [userId, session, isOwnProfile, fetchPosts])

  // Media handling for post creation

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Error",
        description: "Please select an image or video file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size
    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: `File too large. Max size: ${file.type.startsWith("video/") ? "50MB for videos" : "10MB for images"}`,
        variant: "destructive",
      })
      return
    }

    setSelectedMedia(file)
    setMediaType(file.type.startsWith("video/") ? "video" : "image")

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setMediaPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }



  // Removed simple post creation handler - using video creation only

  // Removed media selection handler - using video creation only

  const handlePostClick = async (post: Post) => {
    setSelectedPost(post)
    setIsPostViewOpen(true)
    await fetchComments(post.id)
  }

  const handleLikePost = async (postId: number) => {
    try {
      // Find the current post to determine if it's liked
      const currentPost = posts.find(p => p.id === postId);
      const isCurrentlyLiked = currentPost?.isLiked || false;

      console.log(`${isCurrentlyLiked ? 'Unliking' : 'Liking'} post ${postId}`);

      const response = await fetch(`/api/posts/${postId}/like`, {
        method: isCurrentlyLiked ? "DELETE" : "POST",
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log("Like response status:", response.status);

      if (response.ok) {
        const updatedPost = await response.json()
        console.log("✅ Like successful:", updatedPost);

        const updatedPosts = posts.map((post) =>
          post.id === postId ? {
            ...post,
            likes: updatedPost.likes !== undefined ? updatedPost.likes : post.likes,
            isLiked: updatedPost.isLiked !== undefined ? updatedPost.isLiked : !post.isLiked
          } : post,
        )
        setPosts(updatedPosts)

        // Update selected post if it's the same
        if (selectedPost?.id === postId) {
          setSelectedPost((prev) => (prev ? {
            ...prev,
            likes: updatedPost.likes !== undefined ? updatedPost.likes : prev.likes,
            isLiked: updatedPost.isLiked !== undefined ? updatedPost.isLiked : !prev.isLiked
          } : null))
        }

        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedPosts,
            timestamp: Date.now(),
          }),
        )
      } else {
        const errorText = await response.text();
        console.error("Like failed:", response.status, errorText);
        throw new Error("Failed to like post")
      }
    } catch (error) {
      console.error("Error liking post:", error)
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSubmitComment = async (parentCommentId?: number) => {
    const content = parentCommentId ? replyContent : newComment
    if (!content.trim() || !selectedPost) return

    try {
      const response = await fetch(`/api/posts/${selectedPost.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          parentCommentId: parentCommentId || null,
        }),
      })

      if (response.ok) {
        const newCommentData = await response.json()
        // Refresh comments to get updated nested structure
        await fetchComments(selectedPost.id)

        // Reset form
        if (parentCommentId) {
          setReplyContent("")
          setReplyingTo(null)
        } else {
          setNewComment("")
        }

        // Update comment count
        const updatedPosts = posts.map((post) =>
          post.id === selectedPost.id ? { ...post, comments: post.comments + 1 } : post,
        )
        setPosts(updatedPosts)

        if (selectedPost) {
          setSelectedPost({ ...selectedPost, comments: selectedPost.comments + 1 })
        }

        toast({
          title: "Success",
          description: parentCommentId ? "Reply added successfully!" : "Comment added successfully!",
        })
      } else {
        throw new Error("Failed to add comment")
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      const response = await fetch(`/api/posts/${selectedPost?.id}/comments?commentId=${commentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh comments to get updated nested structure
        await fetchComments(selectedPost!.id)
        const updatedPosts = posts.map((post) =>
          post.id === selectedPost?.id ? { ...post, comments: Math.max(0, post.comments - 1) } : post,
        )
        setPosts(updatedPosts)

        if (selectedPost) {
          setSelectedPost({ ...selectedPost, comments: Math.max(0, selectedPost.comments - 1) })
        }

        toast({
          title: "Success",
          description: "Comment deleted successfully!",
        })
      } else {
        throw new Error("Failed to delete comment")
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
      })
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return
    }

    try {
      console.log("=== FRONTEND DELETE POST DEBUG ===")
      console.log("Deleting post ID:", postId)

      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      })

      console.log("Delete response status:", response.status)

      if (response.ok) {
        const updatedPosts = posts.filter((post) => post.id !== postId)
        setPosts(updatedPosts)
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedPosts,
            timestamp: Date.now(),
          }),
        )

        // Close post view if it's the deleted post
        if (selectedPost?.id === postId) {
          setIsPostViewOpen(false)
          setSelectedPost(null)
        }

        toast({
          title: "Success",
          description: "Post deleted successfully!",
        })
      } else {
        const errorText = await response.text()
        console.error("Delete post failed:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || `Failed to delete post: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete post. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSharePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/share`, {
        method: "POST",
      })

      if (response.ok) {
        const shareData = await response.json()
        // Create the public share URL
        const shareUrl = `${window.location.origin}/post/${postId}`

        // Try native sharing first on mobile
        if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          try {
            await navigator.share({
              title: shareData.title || "Check out this post",
              text: shareData.text || "Shared from the app",
              url: shareUrl,
            })
            return
          } catch (shareError) {
            console.log("Native share failed, falling back to clipboard")
          }
        }

        // Fallback to clipboard
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareUrl)
          toast({
            title: "Link Copied!",
            description: "Post link has been copied to your clipboard. Anyone can view this post!",
          })
        } else {
          // Fallback for older browsers
          const textArea = document.createElement("textarea")
          textArea.value = shareUrl
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          try {
            document.execCommand("copy")
            toast({
              title: "Link Copied!",
              description: "Post link has been copied to your clipboard. Anyone can view this post!",
            })
          } catch (err) {
            toast({
              title: "Share",
              description: `Copy this link: ${shareUrl}`,
            })
          }
          document.body.removeChild(textArea)
        }
      } else {
        throw new Error("Failed to share post")
      }
    } catch (error) {
      console.error("Error sharing post:", error)
      toast({
        title: "Error",
        description: "Failed to share post. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select a valid image file.",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB.",
        variant: "destructive",
      })
      return
    }

    try {
      setProfileImageUploading(true)
      const formData = new FormData()
      formData.append("profileImage", file)

      const response = await fetch("/api/users/profile-image", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUser((prev) =>
          prev
            ? {
              ...prev,
              profileImage: data.imageUrl,
              image: data.imageUrl,
            }
            : null,
        )

        toast({
          title: "Success",
          description: "Profile picture updated successfully!",
        })
      } else {
        throw new Error("Failed to upload image")
      }
    } catch (error: any) {
      console.error("Error uploading profile image:", error)
      toast({
        title: "Error",
        description: "Failed to upload profile picture. Please try again.",
      })
    } finally {
      setProfileImageUploading(false)
      event.target.value = ""
    }
  }

  const handleSaveAbout = async () => {
    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          about: editedAbout,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser((prev) => (prev ? { ...prev, about: data.user?.about || editedAbout } : null))
        setIsEditingAbout(false)

        toast({
          title: "Success",
          description: "About section updated successfully!",
        })
      } else {
        throw new Error("Failed to update about section")
      }
    } catch (error) {
      console.error("Error updating about:", error)
      toast({
        title: "Error",
        description: "Failed to update about section. Please try again.",
      })
    }
  }

  const handleFollowToggle = async () => {
    if (!user || isOwnProfile) return

    try {
      const response = await fetch(`/api/users/${user.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        setUser((prev) =>
          prev
            ? {
              ...prev,
              followers: (prev.followers || 0) + (isFollowing ? -1 : 1),
            }
            : null,
        )

        toast({
          title: "Success",
          description: isFollowing ? "Unfollowed successfully!" : "Following successfully!",
        })
      } else {
        throw new Error("Failed to toggle follow status")
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
      })
    }
  }

  const handleMessage = async () => {
    if (!user || isOwnProfile) return

    try {
      const response = await fetch("/api/stream/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: user.id }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/inbox/${user.id}`)
      } else {
        router.push(`/inbox/${user.id}`)
      }
    } catch (error) {
      console.error("Error creating channel:", error)
      router.push(`/messages/${user.id}`)
    }
  }

  const handleViewFollowers = async () => {
    const targetUserId = userId || session?.user?.id
    if (targetUserId) {
      await fetchFollowers(targetUserId)
      setIsFollowersDialogOpen(true)
    }
  }

  const handleViewFollowing = async () => {
    const targetUserId = userId || session?.user?.id
    if (targetUserId) {
      await fetchFollowing(targetUserId)
      setIsFollowingDialogOpen(true)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const toggleCommentExpansion = (commentId: number) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  const renderComment = (comment: Comment, depth = 0) => {
    const isExpanded = expandedComments.has(comment.id)
    const hasReplies = comment.replies && comment.replies.length > 0
    const maxDepth = 3 // Limit nesting depth

    return (
      <div
        key={comment.id}
        className={cn("space-y-2 sm:space-y-3", depth > 0 && "ml-4 sm:ml-8 border-l-2 border-gray-700 pl-2 sm:pl-4")}
      >
        <div className="flex gap-2 sm:gap-3 group">
          <div className="relative h-6 w-6 sm:h-8 sm:w-8 overflow-hidden rounded-full flex-shrink-0">
            <Image
              src={comment.user?.profileImage || "/placeholder.svg?height=32&width=32"}
              alt={comment.user?.username || "User"}
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs sm:text-sm text-white truncate">
                    {comment.user?.nickname || comment.user?.username}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed break-words">{comment.content}</p>
                {/* Reply button */}
                <div className="flex items-center gap-2 mt-1">
                  {depth < maxDepth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="h-5 w-auto sm:h-6 px-1 sm:px-2 text-xs text-gray-400 hover:text-blue-400"
                    >
                      <Reply className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                  {hasReplies && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCommentExpansion(comment.id)}
                      className="h-5 w-auto sm:h-6 px-1 sm:px-2 text-xs text-gray-400 hover:text-blue-400"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                          Hide {comment.replies!.length}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                          {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {comment.userId === session?.user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full hover:bg-red-900/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Delete comment"
                >
                  <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              )}
            </div>
            {/* Reply input */}
            {replyingTo === comment.id && (
              <div className="mt-2 sm:mt-3 space-y-2">
                <Textarea
                  placeholder={`Reply to ${comment.user?.nickname || comment.user?.username}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[50px] sm:min-h-[60px] rounded-lg border-gray-600 bg-gray-800 resize-none text-xs sm:text-sm text-white placeholder:text-gray-400"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent("")
                    }}
                    className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSubmitComment(comment.id)}
                    disabled={!replyContent.trim()}
                    size="sm"
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 text-xs"
                  >
                    <Send className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Nested replies */}
        {hasReplies && isExpanded && (
          <div className="space-y-2 sm:space-y-3">
            {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-gray-600" />
        </div>
        <h2 className="text-xl font-light text-gray-300 mb-2">User not found</h2>
        <p className="text-sm text-gray-500">This profile doesn't exist or has been removed</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Profile Header */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-950/90 to-black rounded-3xl border border-gray-800/50"></div>
        <div className="relative p-6 sm:p-8 lg:p-10">

          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
            <div className="flex flex-col items-center mb-6 sm:mb-0 sm:flex-shrink-0">
              <div className="relative group">
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36 overflow-hidden rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 p-0.5 shadow-2xl ring-2 ring-gray-700/50">
                  <div className="h-full w-full overflow-hidden rounded-full bg-gray-800">
                    <Image
                      src={user.profileImage || user.image || "/placeholder.svg?height=150&width=150"}
                      alt={user.username}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px"
                    />
                  </div>
                </div>
                {isOwnProfile && (
                  <label
                    className={cn(
                      "absolute bottom-1 right-1 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl cursor-pointer flex items-center justify-center transition-all ring-2 ring-gray-950",
                      profileImageUploading && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {profileImageUploading ? (
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                      disabled={profileImageUploading}
                    />
                  </label>
                )}
              </div>
              {user.nickname && (
                <div className="mt-3 sm:mt-4">
                  <span className="text-xl sm:text-2xl font-light text-white">{user.nickname}</span>
                </div>
              )}
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col items-center sm:items-start">
                <div className="mb-4 sm:mb-6">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-white mb-3">{user.username}</h1>
                  <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-6 text-sm sm:text-base text-gray-300">
                    <button
                      onClick={handleViewFollowers}
                      className="flex items-center gap-2 hover:text-blue-400 transition-colors group"
                    >
                      <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">{user.followers || 0}</span>
                      <span className="hidden sm:inline">followers</span>
                    </button>
                    <button
                      onClick={handleViewFollowing}
                      className="flex items-center gap-2 hover:text-blue-400 transition-colors group"
                    >
                      <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">{user.following || 0}</span>
                      <span className="hidden sm:inline">following</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">{user.visitors || 0}</span>
                      <span className="hidden sm:inline">views</span>
                    </div>
                  </div>
                </div>

                {!isOwnProfile && (
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Button
                      onClick={handleFollowToggle}
                      className={cn(
                        "flex-1 sm:flex-none h-12 rounded-xl px-6 sm:px-8 text-sm font-medium transition-all",
                        isFollowing
                          ? "bg-gray-800/50 border border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl",
                      )}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none h-12 rounded-xl border border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-white px-6 sm:px-8 text-sm bg-gray-900/50 backdrop-blur-sm transition-all"
                      onClick={handleMessage}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Message</span>
                      <span className="sm:hidden">Chat</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="mt-6 sm:mt-8">
            {isEditingAbout ? (
              <div className="space-y-4">
                <Textarea
                  value={editedAbout}
                  onChange={(e) => setEditedAbout(e.target.value)}
                  className="min-h-[100px] sm:min-h-[120px] rounded-2xl border border-gray-600 bg-gray-800/50 backdrop-blur-sm resize-none text-base text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="Tell us about yourself..."
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingAbout(false)}
                    className="h-10 rounded-xl px-5 text-sm text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAbout}
                    className="h-10 rounded-xl px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="rounded-2xl bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
                  <p className="text-gray-300 leading-relaxed text-base sm:text-lg">
                    {user.about || "No bio available"}
                  </p>
                </div>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 opacity-60 group-hover:opacity-100 transition-all rounded-xl hover:bg-gray-700/50 h-9 w-9 sm:h-10 sm:w-10"
                    onClick={() => setIsEditingAbout(true)}
                  >
                    <Edit className="h-4 w-4 text-white" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Followers Dialog */}
      <Dialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen}>
        <DialogContent className="w-[90vw] max-w-[400px] max-h-[80vh] overflow-hidden rounded-2xl mx-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Followers</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <div className="space-y-2 py-2">
              {followers.length > 0 ? (
                followers.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-800 active:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      setIsFollowersDialogOpen(false)
                      router.push(`/profile/${follower.id}`)
                    }}
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-full flex-shrink-0">
                      <Image
                        src={follower.profileImage || follower.image || "/placeholder.svg?height=48&width=48"}
                        alt={follower.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm sm:text-base truncate">
                        {follower.nickname || follower.username}
                      </div>
                      {follower.nickname && (
                        <div className="text-xs sm:text-sm text-gray-400 truncate">@{follower.username}</div>
                      )}
                    </div>
                    <div className="text-gray-400 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-sm sm:text-base">No followers yet</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={isFollowingDialogOpen} onOpenChange={setIsFollowingDialogOpen}>
        <DialogContent className="w-[90vw] max-w-[400px] max-h-[80vh] overflow-hidden rounded-2xl mx-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Following</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <div className="space-y-2 py-2">
              {following.length > 0 ? (
                following.map((followedUser) => (
                  <div
                    key={followedUser.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-800 active:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      setIsFollowingDialogOpen(false)
                      router.push(`/profile/${followedUser.id}`)
                    }}
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-full flex-shrink-0">
                      <Image
                        src={followedUser.profileImage || followedUser.image || "/placeholder.svg?height=48&width=48"}
                        alt={followedUser.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm sm:text-base truncate">
                        {followedUser.nickname || followedUser.username}
                      </div>
                      {followedUser.nickname && (
                        <div className="text-xs sm:text-sm text-gray-400 truncate">@{followedUser.username}</div>
                      )}
                    </div>
                    <div className="text-gray-400 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-sm sm:text-base">Not following anyone yet</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Posts Section */}
      <div className="w-full">
        <div className="space-y-6 sm:space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-light text-white">
              {isOwnProfile ? "Your Posts" : `${user.username}'s Posts`}
            </h2>
            <div className="text-sm text-gray-400">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </div>
          </div>

          {/* Posts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200 relative group shadow-lg"
                  onClick={() => handlePostClick(post)}
                >
                  {post.video ? (
                    <div className="relative w-full h-full">
                      <video src={post.video} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Play className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : post.image ? (
                    <Image src={post.image || "/placeholder.svg"} alt="Post" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600/80 to-purple-600/80 flex items-center justify-center p-3">
                      <p className="text-xs text-white text-center line-clamp-4 font-medium">{post.content}</p>
                    </div>
                  )}
                  {isOwnProfile && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePost(post.id)
                        }}
                        className="h-7 w-7 rounded-full bg-red-500/90 hover:bg-red-600 text-white backdrop-blur-sm"
                        title="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 sm:col-span-3 text-center py-16 text-gray-500">
                <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-gray-600" />
                </div>
                <div className="text-base sm:text-lg font-light mb-2">
                  {isOwnProfile ? "No posts yet" : "No posts to show"}
                </div>
                {isOwnProfile && (
                  <p className="text-sm text-gray-400">Share your first post to get started!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>




      {/* Post View Dialog */}
      <Dialog open={isPostViewOpen} onOpenChange={setIsPostViewOpen}>
        <DialogContent className="max-w-4xl w-[100vw] sm:w-[95vw] h-[100vh] sm:h-[90vh] p-0 bg-black border-none sm:rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="flex flex-col sm:flex-row h-full relative">
              {/* Close button - top right */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPostViewOpen(false)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 text-white border-none backdrop-blur-sm"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Media Section - Fixed height on mobile */}
              <div className="flex-1 relative overflow-hidden h-[50vh] sm:h-full max-h-[50vh] sm:max-h-none">
                {/* Blurred background */}
                {(selectedPost.image || selectedPost.video) && (
                  <div className="absolute inset-0">
                    {selectedPost.video ? (
                      <video
                        src={selectedPost.video}
                        className="w-full h-full object-cover blur-xl scale-110 opacity-30"
                        muted
                      />
                    ) : (
                      <Image
                        src={selectedPost.image || "/placeholder.svg"}
                        alt="Blurred background"
                        fill
                        className="object-cover blur-xl scale-110 opacity-30"
                      />
                    )}
                  </div>
                )}

                {/* Main content */}
                <div className="relative z-10 flex items-center justify-center h-full p-2 sm:p-4">
                  {selectedPost.video ? (
                    <video
                      src={selectedPost.video}
                      className="max-h-full max-w-full object-contain rounded-lg"
                      controls
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : selectedPost.image ? (
                    <Image
                      src={selectedPost.image || "/placeholder.svg"}
                      alt="Post content"
                      width={800}
                      height={600}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-4 sm:p-8 max-w-md mx-4">
                      <p className="text-white text-lg sm:text-xl font-medium text-center leading-relaxed">
                        {selectedPost.content}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments Section - Optimized for mobile */}
              <div className="w-full sm:w-96 bg-gray-900 flex flex-col h-[60vh] sm:h-full">
                {/* Header - Compact on mobile */}
                <div className="p-3 sm:p-4 border-b flex items-center gap-3 flex-shrink-0">
                  <div className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full">
                    <Image
                      src={user.profileImage || user.image || "/placeholder.svg?height=40&width=40"}
                      alt={user.username}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{user.nickname || user.username}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{formatDate(selectedPost.createdAt)}</p>
                  </div>
                </div>

                {/* Content - Compact on mobile */}
                {(selectedPost.image || selectedPost.video) && selectedPost.content && (
                  <div className="p-3 sm:p-4 border-b flex-shrink-0 max-h-20 sm:max-h-none overflow-y-auto">
                    <p className="text-white text-sm sm:text-base leading-relaxed" style={{ color: 'white' }}>{selectedPost.content}</p>
                  </div>
                )}

                {/* Actions - More compact on mobile */}
                <div className="p-3 sm:p-4 border-b flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikePost(selectedPost.id)}
                      className={cn(
                        "flex items-center gap-1 sm:gap-2 rounded-full transition-colors px-2 sm:px-3 py-1 sm:py-2 min-w-0",
                        selectedPost.isLiked
                          ? "text-red-600 hover:bg-red-50"
                          : "text-gray-700 hover:bg-red-50 hover:text-red-600",
                      )}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-current",
                          selectedPost.isLiked && "fill-current",
                        )}
                      />
                      <span className="font-medium text-xs sm:text-sm text-current">{selectedPost.likes}</span>
                    </Button>
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-600">
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="font-medium text-xs sm:text-sm">{selectedPost.comments}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSharePost(selectedPost.id)}
                      className="rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors p-1.5 sm:p-2"
                      title="Share post"
                    >
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-current" />
                    </Button>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePost(selectedPost.id)}
                        className="rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600 p-1.5 sm:p-2"
                        title="Delete post"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-current" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Comments - Scrollable area with proper mobile height */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
                  {commentsLoading ? (
                    <div className="flex justify-center py-6 sm:py-8">
                      <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => renderComment(comment))
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      <MessageCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
                      <p className="text-sm sm:text-base">No comments yet</p>
                      <p className="text-xs sm:text-sm text-gray-400">Be the first to comment!</p>
                    </div>
                  )}
                </div>

                {/* Comment Input - Fixed at bottom with better mobile UX */}
                <div className="p-3 sm:p-4 border-t border-gray-700 flex-shrink-0 bg-gray-900 safe-area-inset-bottom">
                  <div className="flex gap-2 sm:gap-3">
                    <div className="relative h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-full flex-shrink-0">
                      <Image
                        src={session?.user?.image || "/placeholder.svg?height=32&width=32"}
                        alt="Your avatar"
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                    <div className="flex-1 space-y-2 sm:space-y-3">
                      <Textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[50px] sm:min-h-[60px] rounded-lg border-gray-600 bg-gray-800 resize-none text-sm sm:text-base text-white placeholder:text-gray-400"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleSubmitComment()}
                          disabled={!newComment.trim()}
                          size="sm"
                          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 text-xs sm:text-sm"
                        >
                          <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
