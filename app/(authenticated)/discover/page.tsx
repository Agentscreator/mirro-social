"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Sparkles, RefreshCw, Plus, Heart, MessageCircle, Share, Bookmark, TrendingUp, Zap, Stars } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface DiscoverPost {
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
    image?: string
  }
  likes: number
  isLiked: boolean
  comments: number
  views?: number
  isBookmarked?: boolean
}

export default function DiscoverPage() {
  const [posts, setPosts] = useState<DiscoverPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showThoughtsPrompt, setShowThoughtsPrompt] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const observerTarget = useRef<HTMLDivElement>(null)

  // Check if user has thoughts
  const [userHasThoughts, setUserHasThoughts] = useState(true)

  const checkUserThoughts = async () => {
    try {
      const response = await fetch('/api/thoughts', {
        method: 'GET',
        credentials: 'include',
      })
      if (response.ok) {
        const thoughts = await response.json()
        setUserHasThoughts(thoughts.length > 0)
        if (thoughts.length === 0) {
          setShowThoughtsPrompt(true)
        }
      }
    } catch (error) {
      console.error('Error checking thoughts:', error)
    }
  }

  // Fetch discover posts
  const fetchDiscoverPosts = async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      const response = await fetch(`/api/feed?type=discover&limit=20&page=${pageNum}`)
      if (!response.ok) {
        throw new Error('Failed to fetch discover posts')
      }
      
      const data = await response.json()
      
      // Transform posts to match our interface
      const transformedPosts: DiscoverPost[] = (data.posts || []).map((post: any) => ({
        id: post.id,
        content: post.content,
        image: post.image,
        video: post.video,
        duration: post.duration,
        createdAt: post.createdAt,
        user: {
          id: post.user.id,
          username: post.user.username,
          nickname: post.user.nickname,
          profileImage: post.user.profileImage || post.user.image,
          image: post.user.image
        },
        likes: post.likes || Math.floor(Math.random() * 1000), // Demo data
        isLiked: post.isLiked || false,
        comments: post.comments || Math.floor(Math.random() * 100),
        views: Math.floor(Math.random() * 5000) + 100,
        isBookmarked: false
      }))
      
      if (isRefresh) {
        setPosts(transformedPosts)
      } else {
        setPosts(prev => pageNum === 1 ? transformedPosts : [...prev, ...transformedPosts])
      }
      
      setHasMore(data.hasMore || transformedPosts.length === 20)
      return transformedPosts
    } catch (error) {
      console.error('Error fetching discover posts:', error)
      toast({
        title: "Error",
        description: "Failed to load discover posts",
        variant: "destructive",
      })
      return []
    }
  }

  // Load initial posts
  useEffect(() => {
    const loadInitialData = async () => {
      if (!session?.user?.id) return
      
      setLoading(true)
      await Promise.all([
        fetchDiscoverPosts(1),
        checkUserThoughts()
      ])
      setLoading(false)
    }
    
    loadInitialData()
  }, [session?.user?.id])

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    
    setLoadingMore(true)
    const nextPage = page + 1
    await fetchDiscoverPosts(nextPage)
    setPage(nextPage)
    setLoadingMore(false)
  }, [hasMore, loadingMore, page])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [loadMore])

  // Refresh feed
  const handleRefresh = async () => {
    setRefreshing(true)
    setPage(1)
    await fetchDiscoverPosts(1, true)
    setRefreshing(false)
    
    toast({
      title: "Feed refreshed!",
      description: "Discover new amazing content",
    })
  }

  // Handle like/unlike
  const handleLike = async (postId: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ))
    
    // TODO: API call to like/unlike post
  }

  // Handle bookmark
  const handleBookmark = async (postId: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isBookmarked: !post.isBookmarked }
        : post
    ))
  }

  const navigateToNewPost = () => {
    router.push('/create-invite')
  }

  if (!session) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 px-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <div className="w-16 h-16 rounded-full border-4 border-purple-500/30"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
          </motion.div>
          <div className="text-center">
            <p className="text-white text-lg font-medium mb-2">Discovering amazing content</p>
            <p className="text-white/60 text-sm">Finding the perfect posts for you...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-8 w-8 text-purple-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-white">Discover</h1>
                <p className="text-sm text-white/60">Trending content just for you</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                disabled={refreshing}
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              
              {!userHasThoughts && (
                <Button
                  onClick={navigateToNewPost}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Thoughts
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No Thoughts Prompt */}
      <AnimatePresence>
        {showThoughtsPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto px-4 py-6"
          >
            <div className="bg-gradient-to-r from-purple-800/40 to-blue-800/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <Stars className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Share your thoughts to get personalized content
                  </h3>
                  <p className="text-white/70 text-sm">
                    Add your interests and thoughts to see content tailored just for you
                  </p>
                </div>
                <Button
                  onClick={navigateToNewPost}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="h-16 w-16 text-white/40 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">No content yet</h3>
            <p className="text-white/60 mb-6">Be the first to discover amazing content!</p>
            <Button
              onClick={handleRefresh}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full px-8"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Feed
            </Button>
          </div>
        ) : (
          <>
            {/* Masonry Grid Layout */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="break-inside-avoid mb-6"
                >
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
                    {/* Post Media */}
                    {post.image && (
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.content}
                          className="w-full h-full object-cover"
                        />
                        {post.views && (
                          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white">
                            {post.views.toLocaleString()} views
                          </div>
                        )}
                      </div>
                    )}
                    
                    {post.video && (
                      <div className="relative aspect-video overflow-hidden">
                        <video
                          src={post.video}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1"></div>
                          </div>
                        </div>
                        {post.duration && (
                          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-white">
                            {Math.floor(post.duration / 60)}:{(post.duration % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post Content */}
                    <div className="p-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                          {post.user.profileImage || post.user.image ? (
                            <img
                              src={post.user.profileImage || post.user.image}
                              alt={post.user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-xs font-semibold">
                              {post.user.username[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {post.user.nickname || post.user.username}
                          </p>
                          <p className="text-xs text-white/50">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Post Text */}
                      {post.content && (
                        <p className="text-white text-sm mb-4 leading-relaxed">
                          {post.content}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              post.isLiked ? 'text-red-400' : 'text-white/60 hover:text-red-400'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                            {post.likes}
                          </button>
                          
                          <button className="flex items-center gap-1 text-xs text-white/60 hover:text-blue-400 transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            {post.comments}
                          </button>
                          
                          <button className="flex items-center gap-1 text-xs text-white/60 hover:text-green-400 transition-colors">
                            <Share className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleBookmark(post.id)}
                          className={`text-xs transition-colors ${
                            post.isBookmarked ? 'text-yellow-400' : 'text-white/60 hover:text-yellow-400'
                          }`}
                        >
                          <Bookmark className={`h-4 w-4 ${post.isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Loading More Indicator */}
            {hasMore && (
              <div ref={observerTarget} className="text-center py-8">
                {loadingMore && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="h-8 w-8 text-purple-400 mx-auto" />
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Subtle Add Thoughts FAB */}
      <AnimatePresence>
        {userHasThoughts && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={navigateToNewPost}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-xl shadow-purple-500/25 border-2 border-white/20"
            >
              <Plus className="h-6 w-6 text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}