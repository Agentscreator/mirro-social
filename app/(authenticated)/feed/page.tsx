"use client"

import { useState, useEffect, useRef } from "react"
import VideoFeedItem from "@/components/VideoFeedItem"
import { UpcomingEvents } from "@/components/upcoming-events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ChevronUp, ChevronDown, Loader2, Heart, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"

interface Post {
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
}

export default function FeedPage() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [activeTab, setActiveTab] = useState("explore")
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { data: session } = useSession()

  // Feed data states
  const [explorePosts, setExplorePosts] = useState<Post[]>([])
  const [followingPosts, setFollowingPosts] = useState<Post[]>([])
  const [discoverPosts, setDiscoverPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  // Get current posts based on active tab
  const getCurrentPosts = () => {
    switch (activeTab) {
      case "following":
        return followingPosts
      case "discover":
        return discoverPosts
      default:
        return explorePosts
    }
  }

  // Fetch feed posts
  const fetchPosts = async (feedType: string = "explore") => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      params.append('type', feedType)
      params.append('limit', '10')

      const response = await fetch(`/api/feed?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      })
      return { posts: [], hasMore: false }
    }
  }

  // Load initial posts
  useEffect(() => {
    const loadContent = async () => {
      if (!session?.user?.id) return

      setLoading(true)
      setCurrentVideoIndex(0)

      const data = await fetchPosts(activeTab)

      if (activeTab === "explore") {
        setExplorePosts(data.posts || [])
      } else if (activeTab === "following") {
        setFollowingPosts(data.posts || [])
      } else if (activeTab === "discover") {
        setDiscoverPosts(data.posts || [])
      }

      setHasMore(data.hasMore || false)
      setLoading(false)
    }

    loadContent()
  }, [session?.user?.id, searchQuery, activeTab])

  const currentPosts = getCurrentPosts()

  // Navigation functions
  const goToNextVideo = () => {
    if (currentVideoIndex < currentPosts.length - 1) {
      const nextIndex = currentVideoIndex + 1
      setCurrentVideoIndex(nextIndex)
      const container = containerRef.current
      if (container) {
        container.scrollTo({
          top: nextIndex * window.innerHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  const goToPreviousVideo = () => {
    if (currentVideoIndex > 0) {
      const prevIndex = currentVideoIndex - 1
      setCurrentVideoIndex(prevIndex)
      const container = containerRef.current
      if (container) {
        container.scrollTo({
          top: prevIndex * window.innerHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  // Handle scroll for video navigation
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, clientHeight } = container
      const videoIndex = Math.round(scrollTop / clientHeight)

      if (videoIndex !== currentVideoIndex) {
        setCurrentVideoIndex(videoIndex)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [currentPosts.length, currentVideoIndex])

  // Show loading if no session
  if (!session) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white/70 text-sm">Connecting...</p>
        </div>
      </div>
    )
  }

  // Show loading for initial load
  if (loading && currentPosts.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 px-8">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-white/20"></div>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-medium mb-2">Loading your feed</p>
            <p className="text-white/60 text-sm">Discovering amazing content...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 md:relative md:h-screen bg-black text-white overflow-hidden z-10 feed-container feed-page">

      {/* Feed Tabs */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent">
        <div className="px-4 pt-8 pb-4">
          {showSearchBar ? (
            /* Search Bar */
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                <Input
                  placeholder="Search..."
                  className="pl-10 pr-10 py-2 bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-full backdrop-blur-sm focus:bg-white/20 transition-all text-sm w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus={true}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white rounded-full w-6 h-6"
                  onClick={() => {
                    setShowSearchBar(false)
                    setSearchQuery("")
                  }}
                >
                  ✕
                </Button>
              </div>
              <Button
                variant="ghost"
                className="ml-4 text-white/70 hover:text-white text-sm"
                onClick={() => {
                  setShowSearchBar(false)
                  setSearchQuery("")
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            /* Normal tabs with search icon */
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="grid w-full grid-cols-3 bg-transparent backdrop-blur-sm">
                  <TabsTrigger
                    value="explore"
                    className="text-white/70 data-[state=active]:text-white text-sm font-normal data-[state=active]:font-medium transition-all duration-200 bg-transparent data-[state=active]:bg-transparent relative pb-3"
                  >
                    For You
                    {activeTab === "explore" && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="following"
                    className="text-white/70 data-[state=active]:text-white text-sm font-normal data-[state=active]:font-medium transition-all duration-200 bg-transparent data-[state=active]:bg-transparent relative pb-3"
                  >
                    Following
                    {activeTab === "following" && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="discover"
                    className="text-white/70 data-[state=active]:text-white text-sm font-normal data-[state=active]:font-medium transition-all duration-200 bg-transparent data-[state=active]:bg-transparent relative pb-3"
                  >
                    Discover
                    {activeTab === "discover" && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full" />
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search Icon */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 rounded-full w-10 h-10 ml-4"
                onClick={() => setShowSearchBar(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <Tabs value={activeTab} className="h-full">

        {/* Explore/For You Tab */}
        <TabsContent value="explore" className="h-full mt-0">
          {currentPosts.length === 0 && !loading ? (
            <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
              <div className="text-center text-white px-8 max-w-sm">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white/60" />
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-3">No posts yet</h2>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Your feed is empty right now. Check back later for new content from the community!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Navigation Controls */}
              <div className="hidden md:flex fixed right-4 xl:right-12 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                  onClick={goToPreviousVideo}
                  disabled={currentVideoIndex === 0}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                  onClick={goToNextVideo}
                  disabled={currentVideoIndex >= currentPosts.length - 1}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>


              {/* Video Feed */}
              <div
                ref={containerRef}
                className="h-full overflow-y-scroll snap-y snap-mandatory absolute inset-0 pt-24"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingBottom: 'env(safe-area-inset-bottom)'
                }}
              >
                <div className="w-full md:flex md:justify-center">
                  <div className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] md:max-w-md">
                    {currentPosts.map((post, index) => (
                      <div key={post.id} className="h-screen w-full snap-start snap-always relative">
                        <VideoFeedItem
                          post={post}
                          showInviteButton={true}
                          isActive={index === currentVideoIndex}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Following Tab */}
        <TabsContent value="following" className="h-full mt-0">
          {currentPosts.length === 0 && !loading ? (
            <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
              <div className="text-center text-white px-8 max-w-sm">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <UserPlus className="w-8 h-8 text-white/60" />
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-3">No posts from following</h2>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Follow some users to see their content here!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Navigation Controls */}
              <div className="hidden md:flex fixed right-4 xl:right-12 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                  onClick={goToPreviousVideo}
                  disabled={currentVideoIndex === 0}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                  onClick={goToNextVideo}
                  disabled={currentVideoIndex >= currentPosts.length - 1}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>

              {/* Video Feed */}
              <div
                ref={containerRef}
                className="h-full overflow-y-scroll snap-y snap-mandatory absolute inset-0 pt-24"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingBottom: 'env(safe-area-inset-bottom)'
                }}
              >
                <div className="w-full md:flex md:justify-center">
                  <div className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] md:max-w-md">
                    {currentPosts.map((post, index) => (
                      <div key={post.id} className="h-screen w-full snap-start snap-always relative">
                        <VideoFeedItem
                          post={post}
                          showInviteButton={true}
                          isActive={index === currentVideoIndex}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="h-full mt-0">
          {currentPosts.length === 0 && !loading ? (
            <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
              <div className="text-center text-white px-8 max-w-sm">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <Search className="w-8 h-8 text-white/60" />
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-3">Discover New Content</h2>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  Explore trending content and discover new creators!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Navigation Controls */}
              <div className="hidden md:flex fixed right-4 xl:right-12 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                  onClick={goToPreviousVideo}
                  disabled={currentVideoIndex === 0}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                  onClick={goToNextVideo}
                  disabled={currentVideoIndex >= currentPosts.length - 1}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>

              {/* Video Feed */}
              <div
                ref={containerRef}
                className="h-full overflow-y-scroll snap-y snap-mandatory absolute inset-0 pt-24"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingBottom: 'env(safe-area-inset-bottom)'
                }}
              >
                <div className="w-full md:flex md:justify-center">
                  <div className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] md:max-w-md">
                    {currentPosts.map((post, index) => (
                      <div key={post.id} className="h-screen w-full snap-start snap-always relative">
                        <VideoFeedItem
                          post={post}
                          showInviteButton={true}
                          isActive={index === currentVideoIndex}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}