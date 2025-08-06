"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Edit,
  Send,
  Heart,
  MessageCircle,
  Share2,
  Users,
  UserPlus,
  Camera,
  Check,
  Eye,
  Plus,
  Trash2,
  X,
  Play,
  Reply,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pause,
} from "lucide-react"
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
import { HamburgerMenu } from "@/components/hamburger-menu"

const STORY_DURATION = 5000 // 5 seconds per story

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

interface Story {
  id: number
  userId: string
  content?: string
  image?: string | null
  video?: string | null
  createdAt: string
  expiresAt: string
  views: number
  isViewed?: boolean
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
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

  // Stories states
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [isCreateStoryDialogOpen, setIsCreateStoryDialogOpen] = useState(false)
  const [isStoryViewOpen, setIsStoryViewOpen] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [currentUserStories, setCurrentUserStories] = useState<Story[]>([])
  const [storyProgress, setStoryProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [storyContent, setStoryContent] = useState("")
  const [storyMedia, setStoryMedia] = useState<File | null>(null)
  const [storyMediaPreview, setStoryMediaPreview] = useState<string | null>(null)
  const [storyMediaType, setStoryMediaType] = useState<"image" | "video" | null>(null)

  const storyTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Post creation states
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null)
  const [postContent, setPostContent] = useState("")
  const [isMediaTypeDialogOpen, setIsMediaTypeDialogOpen] = useState(false)

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

  // Stories functions
  const fetchStories = useCallback(async () => {
    try {
      setStoriesLoading(true)
      const response = await fetch("/api/stories")
      if (response.ok) {
        const data = await response.json()
        setStories(data.stories || [])
      }
    } catch (error) {
      console.error("Error fetching stories:", error)
    } finally {
      setStoriesLoading(false)
    }
  }, [])

  const handleStoryMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Error",
        description: "Please select an image or video file.",
        variant: "destructive",
      })
      return
    }

    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: `File too large. Max size: ${file.type.startsWith("video/") ? "50MB for videos" : "10MB for images"}`,
        variant: "destructive",
      })
      return
    }

    setStoryMedia(file)
    setStoryMediaType(file.type.startsWith("video/") ? "video" : "image")

    const reader = new FileReader()
    reader.onloadend = () => {
      setStoryMediaPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setIsCreateStoryDialogOpen(true)
  }

  const handleCreateStory = async () => {
    if (!storyMedia && !storyContent.trim()) return

    try {
      const formData = new FormData()
      if (storyContent.trim()) {
        formData.append("content", storyContent.trim())
      }
      if (storyMedia) {
        formData.append("media", storyMedia)
      }

      const response = await fetch("/api/stories", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const newStory = await response.json()
        setStories((prev) => [newStory, ...prev])

        // Reset form
        setStoryMedia(null)
        setStoryMediaPreview(null)
        setStoryMediaType(null)
        setStoryContent("")
        setIsCreateStoryDialogOpen(false)

        toast({
          title: "Success",
          description: "Story created successfully!",
        })
      } else {
        throw new Error("Failed to create story")
      }
    } catch (error) {
      console.error("Error creating story:", error)
      toast({
        title: "Error",
        description: "Failed to create story. Please try again.",
        variant: "destructive",
      })
    }
  }

  const startStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current)
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
    }

    setStoryProgress(0)
    let progress = 0

    progressTimerRef.current = setInterval(() => {
      if (!isPaused) {
        progress += 100 / (STORY_DURATION / 100)
        setStoryProgress(progress)

        if (progress >= 100) {
          nextStory()
        }
      }
    }, 100)
  }, [isPaused])

  const nextStory = useCallback(() => {
    if (currentStoryIndex < currentUserStories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1)
    } else {
      // Find next user with stories
      const currentUserId = currentUserStories[0]?.userId
      const currentUserIndex = stories.findIndex((story) => story.userId === currentUserId)
      const nextUserStory = stories.find((story, index) => index > currentUserIndex && story.userId !== currentUserId)

      if (nextUserStory) {
        const nextUserStories = stories.filter((story) => story.userId === nextUserStory.userId)
        setCurrentUserStories(nextUserStories)
        setCurrentStoryIndex(0)
      } else {
        setIsStoryViewOpen(false)
      }
    }
  }, [currentStoryIndex, currentUserStories, stories])

  const prevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1)
    } else {
      // Find previous user with stories
      const currentUserId = currentUserStories[0]?.userId
      const currentUserIndex = stories.findIndex((story) => story.userId === currentUserId)
      const prevUserStory = [...stories]
        .reverse()
        .find((story, index) => stories.length - 1 - index < currentUserIndex && story.userId !== currentUserId)

      if (prevUserStory) {
        const prevUserStories = stories.filter((story) => story.userId === prevUserStory.userId)
        setCurrentUserStories(prevUserStories)
        setCurrentStoryIndex(prevUserStories.length - 1)
      }
    }
  }, [currentStoryIndex, currentUserStories, stories])

  const handleStoryClick = (story: Story) => {
    const userStories = stories.filter((s) => s.userId === story.userId)
    setCurrentUserStories(userStories)
    setCurrentStoryIndex(userStories.findIndex((s) => s.id === story.id))
    setIsStoryViewOpen(true)
    setIsPaused(false)
  }

  const handleStoryTap = (event: React.MouseEvent, side: "left" | "right") => {
    event.preventDefault()
    if (side === "left") {
      prevStory()
    } else {
      nextStory()
    }
  }

  // Group stories by user
  const groupedStories = stories.reduce(
    (acc, story) => {
      const userId = story.userId
      if (!acc[userId]) {
        acc[userId] = []
      }
      acc[userId].push(story)
      return acc
    },
    {} as Record<string, Story[]>,
  )

  // Get unique users with stories
  const usersWithStories = Object.keys(groupedStories).map((userId) => {
    const userStories = groupedStories[userId]
    const latestStory = userStories[0] // Assuming stories are sorted by creation date
    return {
      userId,
      user: latestStory.user,
      stories: userStories,
      hasUnviewed: userStories.some((story) => !story.isViewed),
    }
  })

  useEffect(() => {
    if (isStoryViewOpen && currentUserStories.length > 0) {
      startStoryTimer()
    }

    return () => {
      if (storyTimerRef.current) {
        clearTimeout(storyTimerRef.current)
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
    }
  }, [isStoryViewOpen, currentStoryIndex, currentUserStories, startStoryTimer])

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
            if (cacheAge < 5 * 60 * 1000) {
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

        // Fetch posts and stories
        await Promise.all([fetchPosts(targetUserId), fetchStories()])

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
  }, [userId, session, isOwnProfile, fetchPosts, fetchStories])

  // Media handling for post creation
  const handleMediaTypeSelect = (type: "image" | "video") => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = type === "image" ? "image/*" : "video/*"
    input.onchange = (event) => {
      const syntheticEvent = {
        target: event.target,
        currentTarget: event.target,
      } as React.ChangeEvent<HTMLInputElement>
      handleMediaSelect(syntheticEvent)
    }
    input.click()
    setIsMediaTypeDialogOpen(false)
  }

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
    setIsCreatePostDialogOpen(true)
  }

  const handleCreatePost = async () => {
    if (!selectedMedia && !postContent.trim()) return

    try {
      const formData = new FormData()
      formData.append("content", postContent.trim())
      if (selectedMedia) {
        formData.append("media", selectedMedia)
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const newPostData = await response.json()
        sessionStorage.removeItem(cacheKey)
        const updatedPosts = [newPostData, ...posts]
        setPosts(updatedPosts)
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedPosts,
            timestamp: Date.now(),
          }),
        )

        // Reset form
        setSelectedMedia(null)
        setMediaPreview(null)
        setMediaType(null)
        setPostContent("")
        setIsCreatePostDialogOpen(false)

        toast({
          title: "Success",
          description: "Post created successfully!",
        })
      } else {
        throw new Error("Failed to create post")
      }
    } catch (error: any) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePostClick = async (post: Post) => {
    setSelectedPost(post)
    setIsPostViewOpen(true)
    await fetchComments(post.id)
  }

  const handleLikePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      })

      if (response.ok) {
        const updatedPost = await response.json()
        const updatedPosts = posts.map((post) =>
          post.id === postId ? { ...post, likes: updatedPost.likes, isLiked: updatedPost.isLiked } : post,
        )
        setPosts(updatedPosts)

        // Update selected post if it's the same
        if (selectedPost?.id === postId) {
          setSelectedPost((prev) => (prev ? { ...prev, likes: updatedPost.likes, isLiked: updatedPost.isLiked } : null))
        }

        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: updatedPosts,
            timestamp: Date.now(),
          }),
        )
      } else {
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
        variant: "destructive",
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
        const errorData = await response.json()
        console.error("Delete error response:", errorData)
        throw new Error(errorData.error || "Failed to delete post")
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
        router.push(`/messages/${user.id}`)
      } else {
        router.push(`/messages/${user.id}`)
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
        className={cn("space-y-2 sm:space-y-3", depth > 0 && "ml-4 sm:ml-8 border-l-2 border-gray-100 pl-2 sm:pl-4")}
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
                  <span className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                    {comment.user?.nickname || comment.user?.username}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-800 leading-relaxed break-words">{comment.content}</p>
                {/* Reply button */}
                <div className="flex items-center gap-2 mt-1">
                  {depth < maxDepth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="h-5 w-auto sm:h-6 px-1 sm:px-2 text-xs text-gray-600 hover:text-blue-600"
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
                      className="h-5 w-auto sm:h-6 px-1 sm:px-2 text-xs text-gray-600 hover:text-blue-600"
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
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
                  className="min-h-[50px] sm:min-h-[60px] rounded-lg border-blue-200 resize-none text-xs sm:text-sm text-gray-900 placeholder:text-gray-500"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent("")
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1"
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
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-600">User not found</h2>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Stories Row */}
      <div className="mb-6">
        <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {/* Add Story Button (for own profile) */}
          {isOwnProfile && (
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*,video/*"
                  input.onchange = (event) => {
                    const syntheticEvent = {
                      target: event.target,
                      currentTarget: event.target,
                    } as React.ChangeEvent<HTMLInputElement>
                    handleStoryMediaSelect(syntheticEvent)
                  }
                  input.click()
                }}
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center hover:from-blue-500 hover:to-blue-700 transition-all shadow-lg"
              >
                <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </button>
              <span className="text-xs text-gray-600 text-center">Your Story</span>
            </div>
          )}

          {/* Stories from users */}
          {usersWithStories.map((userWithStories) => (
            <div key={userWithStories.userId} className="flex flex-col items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleStoryClick(userWithStories.stories[0])}
                className={cn(
                  "relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 transition-all",
                  userWithStories.hasUnviewed
                    ? "bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500"
                    : "bg-gray-300",
                )}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                  <Image
                    src={userWithStories.user.profileImage || "/placeholder.svg?height=80&width=80"}
                    alt={userWithStories.user.username}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </button>
              <span className="text-xs text-gray-600 text-center max-w-[4rem] truncate">
                {userWithStories.user.nickname || userWithStories.user.username}
              </span>
            </div>
          ))}

          {/* Loading indicator */}
          {storiesLoading && (
            <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl sm:rounded-3xl"></div>
        <div className="relative p-4 sm:p-6 lg:p-8">
          {/* Add Hamburger Menu */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8">
            <HamburgerMenu />
          </div>

          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
            <div className="flex flex-col items-center mb-4 sm:mb-0 sm:flex-shrink-0">
              <div className="relative group">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 p-1 shadow-xl">
                  <div className="h-full w-full overflow-hidden rounded-full bg-white">
                    <Image
                      src={user.profileImage || user.image || "/placeholder.svg?height=150&width=150"}
                      alt={user.username}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
                    />
                  </div>
                </div>
                {isOwnProfile && (
                  <label
                    className={cn(
                      "absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg cursor-pointer flex items-center justify-center transition-all",
                      profileImageUploading && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {profileImageUploading ? (
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
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
                <div className="mt-2 sm:mt-3">
                  <span className="text-lg sm:text-xl font-medium text-gray-900">{user.nickname}</span>
                </div>
              )}
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col items-center sm:items-start">
                <div className="mb-3 sm:mb-4">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{user.username}</h1>
                  <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <button
                      onClick={handleViewFollowers}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{user.followers || 0}</span>
                      <span>followers</span>
                    </button>
                    <button
                      onClick={handleViewFollowing}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{user.following || 0}</span>
                      <span>following</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{user.visitors || 0}</span>
                      <span>views</span>
                    </div>
                  </div>
                </div>

                {!isOwnProfile && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleFollowToggle}
                      className={cn(
                        "flex-1 sm:flex-none rounded-full px-4 sm:px-6 text-sm font-medium",
                        isFollowing
                          ? "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"
                          : "bg-blue-600 hover:bg-blue-700 text-white",
                      )}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="h-4 w-4 mr-1 sm:mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-full border-blue-200 hover:bg-blue-50 text-blue-600 px-4 sm:px-6 text-sm bg-transparent"
                      onClick={handleMessage}
                    >
                      <MessageCircle className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Message</span>
                      <span className="sm:hidden">Chat</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="mt-4 sm:mt-6">
            {isEditingAbout ? (
              <div className="space-y-3">
                <Textarea
                  value={editedAbout}
                  onChange={(e) => setEditedAbout(e.target.value)}
                  className="min-h-[80px] sm:min-h-[100px] rounded-xl sm:rounded-2xl border-blue-200 bg-white/80 backdrop-blur-sm resize-none text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:text-gray-900"
                  placeholder="Tell us about yourself..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingAbout(false)}
                    className="rounded-full px-4 text-sm text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-800"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAbout}
                    className="rounded-full px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm border border-blue-100 p-4 sm:p-6 shadow-sm">
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                    {user.about || "No bio available"}
                  </p>
                </div>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-blue-100 h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => setIsEditingAbout(true)}
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Followers Dialog */}
      <Dialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen}>
        <DialogContent className="w-[90vw] max-w-[400px] max-h-[80vh] overflow-hidden rounded-2xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-600 text-center">Followers</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <div className="space-y-2 py-2">
              {followers.length > 0 ? (
                followers.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 rounded-lg cursor-pointer transition-colors"
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
                      <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {follower.nickname || follower.username}
                      </div>
                      {follower.nickname && (
                        <div className="text-xs sm:text-sm text-gray-500 truncate">@{follower.username}</div>
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
                <div className="text-center py-12 text-gray-500">
                  <div className="text-sm sm:text-base">No followers yet</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={isFollowingDialogOpen} onOpenChange={setIsFollowingDialogOpen}>
        <DialogContent className="w-[90vw] max-w-[400px] max-h-[80vh] overflow-hidden rounded-2xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-600 text-center">Following</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] px-1">
            <div className="space-y-2 py-2">
              {following.length > 0 ? (
                following.map((followedUser) => (
                  <div
                    key={followedUser.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 rounded-lg cursor-pointer transition-colors"
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
                      <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {followedUser.nickname || followedUser.username}
                      </div>
                      {followedUser.nickname && (
                        <div className="text-xs sm:text-sm text-gray-500 truncate">@{followedUser.username}</div>
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
                <div className="text-center py-12 text-gray-500">
                  <div className="text-sm sm:text-base">Not following anyone yet</div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Posts Section */}
      <div className="w-full">

        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-blue-600">
              {isOwnProfile ? "Your Posts" : `${user.username}'s Posts`}
            </h2>
            {isOwnProfile && (
              <Button
                onClick={() => setIsMediaTypeDialogOpen(true)}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Post</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>

          {/* Posts Grid */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-blue-50 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                  onClick={() => handlePostClick(post)}
                >
                  {post.video ? (
                    <div className="relative w-full h-full">
                      <video src={post.video} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ) : post.image ? (
                    <Image src={post.image || "/placeholder.svg"} alt="Post" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center p-2">
                      <p className="text-xs text-blue-800 text-center line-clamp-4">{post.content}</p>
                    </div>
                  )}
                  {isOwnProfile && (
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePost(post.id)
                        }}
                        className="h-6 w-6 rounded-full bg-red-500/80 hover:bg-red-600 text-white"
                        title="Delete post"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-gray-500">
                <div className="text-sm sm:text-base">
                  {isOwnProfile ? "You haven't posted anything yet." : "No posts to show."}
                </div>
                {isOwnProfile && (
                  <p className="text-xs sm:text-sm mt-2 text-gray-400">Share your first post to get started!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Story Creation Dialog */}
      <Dialog open={isCreateStoryDialogOpen} onOpenChange={setIsCreateStoryDialogOpen}>
        <DialogContent className="mx-2 sm:mx-auto sm:max-w-[500px] w-[calc(100%-1rem)] sm:w-[95vw] rounded-2xl max-h-[95vh] overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white">
            <Button
              variant="ghost"
              onClick={() => {
                setStoryMedia(null)
                setStoryMediaPreview(null)
                setStoryMediaType(null)
                setStoryContent("")
                setIsCreateStoryDialogOpen(false)
              }}
              className="text-gray-600 hover:bg-gray-100 rounded-full px-3 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <h2 className="text-base sm:text-lg font-semibold">Your Story</h2>
            <Button
              onClick={handleCreateStory}
              disabled={!storyMedia && !storyContent.trim()}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 disabled:opacity-50 text-sm sm:text-base"
            >
              Share
            </Button>
          </div>

          <div className="max-h-[calc(95vh-60px)] overflow-y-auto">
            {/* Media Preview */}
            {storyMediaPreview && (
              <div className="relative bg-black">
                <div className="aspect-[9/16] flex items-center justify-center">
                  {storyMediaType === "video" ? (
                    <video
                      src={storyMediaPreview}
                      className="max-h-full max-w-full object-contain"
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <Image
                      src={storyMediaPreview || "/placeholder.svg"}
                      alt="Story preview"
                      width={500}
                      height={889}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                {/* Text overlay */}
                {storyContent && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 max-w-[80%]">
                      <p className="text-white text-center text-lg font-medium">{storyContent}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text Input */}
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full flex-shrink-0">
                  <Image
                    src={session?.user?.image || "/placeholder.svg?height=40&width=40"}
                    alt="Your avatar"
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="flex-1 space-y-2 sm:space-y-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{session?.user?.name || "You"}</p>
                    <Textarea
                      value={storyContent}
                      onChange={(e) => setStoryContent(e.target.value.slice(0, 500))}
                      className="mt-2 min-h-[80px] sm:min-h-[100px] rounded-lg border-gray-200 resize-none text-sm sm:text-base placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400 text-gray-900"
                      placeholder="Add text to your story..."
                    />
                    <div className="text-xs text-gray-500 mt-1">{storyContent.length}/500 characters</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Dialog */}
      <Dialog open={isStoryViewOpen} onOpenChange={setIsStoryViewOpen}>
        <DialogContent className="max-w-none w-screen h-screen p-0 bg-black border-none rounded-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Story Viewer</DialogTitle>
          </DialogHeader>
          {currentUserStories.length > 0 && currentUserStories[currentStoryIndex] && (
            <div className="relative w-full h-full flex flex-col">
              {/* Progress bars */}
              <div className="absolute top-4 left-4 right-4 z-50 flex gap-1">
                {currentUserStories.map((_, index) => (
                  <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{
                        width:
                          index < currentStoryIndex ? "100%" : index === currentStoryIndex ? `${storyProgress}%` : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* User info */}
              <div className="absolute top-12 left-4 right-4 z-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full">
                    <Image
                      src={
                        currentUserStories[currentStoryIndex].user.profileImage || "/placeholder.svg?height=40&width=40"
                      }
                      alt={currentUserStories[currentStoryIndex].user.username}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {currentUserStories[currentStoryIndex].user.nickname ||
                        currentUserStories[currentStoryIndex].user.username}
                    </p>
                    <p className="text-white/70 text-xs">
                      {formatDate(currentUserStories[currentStoryIndex].createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPaused(!isPaused)}
                    className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none"
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsStoryViewOpen(false)}
                    className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Story content */}
              <div className="flex-1 relative flex items-center justify-center">
                {/* Navigation areas */}
                <button
                  className="absolute left-0 top-0 w-1/3 h-full z-40 flex items-center justify-start pl-4"
                  onClick={(e) => handleStoryTap(e, "left")}
                >
                  <ChevronLeft className="h-8 w-8 text-white/50" />
                </button>
                <button
                  className="absolute right-0 top-0 w-1/3 h-full z-40 flex items-center justify-end pr-4"
                  onClick={(e) => handleStoryTap(e, "right")}
                >
                  <ChevronRight className="h-8 w-8 text-white/50" />
                </button>

                {/* Story media/content */}
                {currentUserStories[currentStoryIndex].video ? (
                  <video
                    src={currentUserStories[currentStoryIndex].video!}
                    className="max-h-full max-w-full object-contain"
                    autoPlay
                    muted
                    playsInline
                  />
                ) : currentUserStories[currentStoryIndex].image ? (
                  <Image
                    src={currentUserStories[currentStoryIndex].image! || "/placeholder.svg"}
                    alt="Story content"
                    width={400}
                    height={711}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 max-w-md mx-4">
                    <p className="text-white text-xl font-medium text-center leading-relaxed">
                      {currentUserStories[currentStoryIndex].content}
                    </p>
                  </div>
                )}

                {/* Text overlay for media stories */}
                {(currentUserStories[currentStoryIndex].image || currentUserStories[currentStoryIndex].video) &&
                  currentUserStories[currentStoryIndex].content && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 max-w-[80%]">
                        <p className="text-white text-center text-lg font-medium">
                          {currentUserStories[currentStoryIndex].content}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Single Media Button Dialog */}
      <Dialog open={isMediaTypeDialogOpen} onOpenChange={setIsMediaTypeDialogOpen}>
        <DialogContent className="mx-4 sm:mx-auto sm:max-w-[400px] w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-blue-600">Create New Post</DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-600">
              Select an image or video to share
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8 sm:py-12">
            <Button
              onClick={() => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*,video/*"
                input.onchange = (event) => {
                  const syntheticEvent = {
                    target: event.target,
                    currentTarget: event.target,
                  } as React.ChangeEvent<HTMLInputElement>
                  handleMediaSelect(syntheticEvent)
                }
                input.click()
                setIsMediaTypeDialogOpen(false)
              }}
              className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all group active:scale-95 p-0 overflow-hidden shadow-xl hover:shadow-2xl"
            >
              <div className="relative h-full w-full flex items-center justify-center">
                <Image
                  src="/images/media-button.png"
                  alt="Select media"
                  width={80}
                  height={80}
                  className="opacity-90 group-hover:opacity-100 transition-opacity sm:w-20 sm:h-20"
                />
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsMediaTypeDialogOpen(false)}
              className="w-full rounded-full text-sm sm:text-base py-2 sm:py-3"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Post Dialog */}
      <Dialog open={isCreatePostDialogOpen} onOpenChange={setIsCreatePostDialogOpen}>
        <DialogContent className="mx-2 sm:mx-auto sm:max-w-[500px] w-[calc(100%-1rem)] sm:w-[95vw] rounded-2xl max-h-[95vh] overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white">
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedMedia(null)
                setMediaPreview(null)
                setMediaType(null)
                setPostContent("")
                setIsCreatePostDialogOpen(false)
              }}
              className="text-gray-600 hover:bg-gray-100 rounded-full px-3 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <h2 className="text-base sm:text-lg font-semibold">New Post</h2>
            <Button
              onClick={handleCreatePost}
              disabled={!selectedMedia}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 disabled:opacity-50 text-sm sm:text-base"
            >
              Share
            </Button>
          </div>

          <div className="max-h-[calc(95vh-60px)] overflow-y-auto">
            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative bg-black">
                <div className="aspect-square sm:aspect-video flex items-center justify-center">
                  {mediaType === "video" ? (
                    <video
                      src={mediaPreview}
                      className="max-h-full max-w-full object-contain"
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <Image
                      src={mediaPreview || "/placeholder.svg"}
                      alt="Media preview"
                      width={500}
                      height={500}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                {/* Media controls overlay */}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = mediaType === "video" ? "video/*" : "image/*"
                      input.onchange = (event) => {
                        const syntheticEvent = {
                          target: event.target,
                          currentTarget: event.target,
                        } as React.ChangeEvent<HTMLInputElement>
                        handleMediaSelect(syntheticEvent)
                      }
                      input.click()
                    }}
                    className="rounded-full bg-black/60 hover:bg-black/80 text-white border-none backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10 p-0"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Caption Section */}
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="relative h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full flex-shrink-0">
                  <Image
                    src={session?.user?.image || "/placeholder.svg?height=40&width=40"}
                    alt="Your avatar"
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="flex-1 space-y-2 sm:space-y-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{session?.user?.name || "You"}</p>
                    <Textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value.slice(0, 2200))}
                      className="mt-2 min-h-[80px] sm:min-h-[100px] rounded-lg border-gray-200 resize-none text-sm sm:text-base placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400 text-gray-900"
                      placeholder="Write a caption..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="w-full sm:w-96 bg-white flex flex-col h-[60vh] sm:h-full">
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
                    <p className="text-gray-800 text-sm sm:text-base leading-relaxed">{selectedPost.content}</p>
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
                <div className="p-3 sm:p-4 border-t flex-shrink-0 bg-white safe-area-inset-bottom">
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
                        className="min-h-[50px] sm:min-h-[60px] rounded-lg border-blue-200 resize-none text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
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
