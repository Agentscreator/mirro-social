"use client"

import { useState, useEffect, useRef } from "react"
import VideoFeedItem from "@/components/VideoFeedItem"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ChevronUp, ChevronDown, Loader2, Heart, UserPlus, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"
import { fetchRecommendations, generateExplanation } from "@/src/lib/apiServices"

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
  const { data: session } = useSession()
  const router = useRouter()

  // Feed data states
  const [explorePosts, setExplorePosts] = useState<Post[]>([])
  const [followingPosts, setFollowingPosts] = useState<Post[]>([])
  const [discoverStories, setDiscoverStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [newThought, setNewThought] = useState("")
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  // Get current posts based on active tab
  const getCurrentPosts = () => {
    switch (activeTab) {
      case "following":
        return followingPosts
      case "discover":
        return [] // Discover has its own data structure
      default:
        return explorePosts
    }
  }

  // Simplified fetch discover stories - bypass complex AI APIs for now
  const fetchDiscoverStories = async () => {
    try {
      setDiscoverLoading(true)
      console.log('Starting simplified fetchDiscoverStories...')

      // Use a much shorter timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 3000) // 3 seconds max
      })

      // Try the recommendations API with a very short timeout
      const recommendationsPromise = fetchRecommendations(1, 5) // Smaller page size

      let recommendedUsers: any[] = []
      try {
        const result = await Promise.race([recommendationsPromise, timeoutPromise]) as any
        recommendedUsers = result?.users || []
        console.log('Got recommendations:', recommendedUsers.length)
      } catch (error) {
        console.log('Recommendations API failed, using fallback:', (error as Error).message)
        // Fallback: create some mock users for testing
        recommendedUsers = []
      }

      // If no users from API, show empty state immediately
      if (recommendedUsers.length === 0) {
        console.log('No recommended users found, showing empty state')
        setDiscoverStories([])
        setDiscoverLoading(false)
        return
      }

      // Convert users to stories format with simple narratives (no AI generation)
      const usersWithBasicData = recommendedUsers.map((user: any) => ({
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        narrative: "A kindred spirit whose thoughts might resonate with yours...",
        tags: user.tags || [],
        score: user.score || 0,
        profileImage: user.profileImage || user.image
      }))

      setDiscoverStories(usersWithBasicData)
      setDiscoverLoading(false)
      console.log('Set discover stories complete:', usersWithBasicData.length)

    } catch (error) {
      console.error('Error fetching discover stories:', error)

      // Always ensure loading is stopped
      setDiscoverLoading(false)
      setDiscoverStories([])

      toast({
        title: "Error",
        description: "Failed to load discover stories. Please try again later.",
        variant: "destructive",
      })
    }
  }

  // Load thoughts using original API
  const loadThoughts = async () => {
    try {
      console.log('Loading thoughts...')
      const response = await fetch('/api/thoughts', {
        method: 'GET',
        credentials: 'include',
      })

      console.log(`Thoughts API response status: ${response.status}`)

      if (response.ok) {
        const thoughtsData = await response.json()
        console.log(`Loaded ${thoughtsData.length} thoughts`)
        return thoughtsData
      } else {
        console.error('Thoughts API error:', response.statusText)
        return []
      }
    } catch (error) {
      console.error('Error loading thoughts:', error)
      return []
    }
  }

  // Add thought using original API
  const addThought = async () => {
    if (!newThought.trim() || newThought.length > 1000) return

    try {
      const response = await fetch('/api/thoughts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: `Thought ${Date.now()}`,
          content: newThought.trim()
        })
      })

      if (response.ok) {
        setNewThought("")
        toast({
          title: "Success",
          description: "Your thought has been added to the journal",
        })
        // Refresh stories to include new connections
        fetchDiscoverStories()
      }
    } catch (error) {
      console.error('Error adding thought:', error)
      toast({
        title: "Error",
        description: "Failed to add thought",
        variant: "destructive",
      })
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
      if (!session?.user?.id) {
        console.log('No session user ID, skipping content load')
        return
      }

      console.log(`Loading content for tab: ${activeTab}`)
      setLoading(true)
      setCurrentVideoIndex(0)

      // Clear any existing timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }

      // Set a maximum loading timeout of 15 seconds
      const timeout = setTimeout(() => {
        console.warn('Loading timeout reached, forcing stop')
        setLoading(false)
        setDiscoverLoading(false)
        if (activeTab === "discover") {
          setDiscoverStories([])
          toast({
            title: "Loading Timeout",
            description: "Content is taking too long to load. Please try again.",
            variant: "destructive",
          })
        }
      }, 15000)
      setLoadingTimeout(timeout)

      if (activeTab === "discover") {
        try {
          console.log('Loading discover content...')

          // Simplified approach: always try to fetch recommendations first
          console.log('Fetching recommendations directly')
          await fetchDiscoverStories()
          setLoading(false)

        } catch (error) {
          console.error('Error loading discover content:', error)
          // Ensure loading is stopped on error
          setLoading(false)
          setDiscoverLoading(false)
          setDiscoverStories([])
        } finally {
          // Clear timeout when done
          if (timeout) {
            clearTimeout(timeout)
          }
        }
      } else {
        try {
          const data = await fetchPosts(activeTab)

          if (activeTab === "explore") {
            setExplorePosts(data.posts || [])
          } else if (activeTab === "following") {
            setFollowingPosts(data.posts || [])
          }
        } catch (error) {
          console.error(`Error loading ${activeTab} posts:`, error)
        } finally {
          setLoading(false)
          // Clear timeout when done
          if (timeout) {
            clearTimeout(timeout)
          }
        }
      }
    }

    loadContent()

    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
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

        {/* Discover Tab - Journal Style */}
        <TabsContent value="discover" className="h-full mt-0">
          <div className="h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">

            {/* Add Thoughts Button - Top Right */}
            <div className="fixed top-20 right-4 z-50 flex gap-2">
              <Button
                onClick={() => {
                  const textarea = document.getElementById('thought-input') as HTMLTextAreaElement
                  if (textarea) {
                    textarea.focus()
                    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-full px-4 py-2 text-sm font-medium transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Thought
              </Button>
              <Button
                onClick={async () => {
                  console.log('Testing discover API...')
                  try {
                    const response = await fetch('/api/debug/discover-test')
                    const data = await response.json()
                    console.log('Discover test result:', data)
                    toast({
                      title: "Debug Test",
                      description: `Found ${data.totalUsers || 0} users. Check console for details.`,
                    })
                  } catch (error) {
                    console.error('Debug test failed:', error)
                    toast({
                      title: "Debug Test Failed",
                      description: "Check console for details",
                      variant: "destructive",
                    })
                  }
                }}
                className="bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-500/30 text-white rounded-full px-3 py-2 text-xs font-medium transition-all"
              >
                Debug
              </Button>
            </div>

            {discoverLoading || loading ? (
              <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mx-auto mb-4"></div>
                  <p className="text-white/70 text-sm">Opening journal...</p>
                  <Button
                    variant="ghost"
                    className="mt-4 text-white/60 hover:text-white text-xs"
                    onClick={() => {
                      setLoading(false)
                      setDiscoverLoading(false)
                      setDiscoverStories([])
                    }}
                  >
                    Cancel Loading
                  </Button>
                </div>
              </div>
            ) : discoverStories.length === 0 ? (
              <div className="h-screen flex items-center justify-center px-8">
                <div className="max-w-md text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                    <Search className="w-10 h-10 text-white/40" />
                  </div>
                  <h2 className="text-2xl font-light text-white mb-4">Your Journal Awaits</h2>
                  <p className="text-white/60 text-sm mb-8 leading-relaxed">
                    Share your thoughts and discover meaningful connections through AI-crafted narratives.
                  </p>

                  {/* Thought Input */}
                  <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                    <textarea
                      id="thought-input"
                      value={newThought}
                      onChange={(e) => setNewThought(e.target.value)}
                      placeholder="What's on your mind? Share a thought, dream, or reflection..."
                      className="w-full h-24 bg-transparent border-none outline-none text-white placeholder:text-white/40 resize-none text-sm leading-relaxed"
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-white/40">{newThought.length}/1000</span>
                      <div className="flex gap-3">
                        <Button
                          onClick={addThought}
                          disabled={!newThought.trim()}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-6 py-2 text-sm disabled:opacity-50 transition-all flex-1"
                        >
                          Begin Journey
                        </Button>
                        <Button
                          onClick={fetchDiscoverStories}
                          className="bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-full px-4 py-2 text-sm transition-all"
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full relative">
                {/* Journal Pages */}
                <div className="h-full overflow-hidden">
                  <div
                    className="flex h-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${currentStoryIndex * 100}%)` }}
                  >
                    {discoverStories.map((story, index) => (
                      <div key={story.id} className="w-full h-full flex-shrink-0 relative">
                        {/* Journal Page */}
                        <div className="h-full flex items-center justify-center px-8 py-24">
                          <div className="max-w-md w-full">
                            {/* Page Content */}
                            <div className="bg-black/20 backdrop-blur-sm rounded-3xl border border-white/10 p-8 shadow-2xl">
                              {/* Nickname Header */}
                              <div className="mb-6">
                                <h3 className="text-xl font-light text-white/90 tracking-wide">
                                  {story.nickname || story.username}
                                </h3>
                                <div className="w-12 h-px bg-gradient-to-r from-white/30 to-transparent mt-2"></div>
                              </div>

                              {/* AI Narrative */}
                              <div className="space-y-4">
                                <p className="text-white/80 text-sm leading-relaxed font-light">
                                  {story.narrative || story.reason || "A kindred spirit whose thoughts resonate with yours..."}
                                </p>

                                {story.tags && story.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-6">
                                    {story.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                                      <span
                                        key={tagIndex}
                                        className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60 font-light"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Connect Button */}
                              <div className="mt-8 pt-6 border-t border-white/10">
                                <Button
                                  onClick={() => router.push(`/messages/${story.id}`)}
                                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full py-3 text-sm font-medium transition-all"
                                >
                                  Connect
                                </Button>
                              </div>
                            </div>

                            {/* Page Number */}
                            <div className="text-center mt-6">
                              <span className="text-white/30 text-xs font-light">
                                {index + 1} of {discoverStories.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Thought Page */}
                    <div className="w-full h-full flex-shrink-0 relative">
                      <div className="h-full flex items-center justify-center px-8 py-24">
                        <div className="max-w-md w-full">
                          <div className="bg-black/20 backdrop-blur-sm rounded-3xl border border-white/10 p-8 shadow-2xl">
                            <div className="mb-6">
                              <h3 className="text-xl font-light text-white/90 tracking-wide">
                                New Entry
                              </h3>
                              <div className="w-12 h-px bg-gradient-to-r from-white/30 to-transparent mt-2"></div>
                            </div>

                            <div className="space-y-4">
                              <textarea
                                value={newThought}
                                onChange={(e) => setNewThought(e.target.value)}
                                placeholder="What's on your mind? Share a thought, dream, or reflection..."
                                className="w-full h-32 bg-transparent border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/40 resize-none text-sm leading-relaxed outline-none focus:border-white/30 transition-colors"
                                maxLength={500}
                              />

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white/40">{newThought.length}/500</span>
                                <Button
                                  onClick={addThought}
                                  disabled={!newThought.trim()}
                                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-6 py-2 text-sm disabled:opacity-50 transition-all"
                                >
                                  Add to Journal
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Dots */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {[...discoverStories, { id: 'add-thought' }].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStoryIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${index === currentStoryIndex
                        ? 'bg-white/60 w-6'
                        : 'bg-white/20 hover:bg-white/40'
                        }`}
                    />
                  ))}
                </div>

                {/* Swipe Navigation */}
                <div
                  className="absolute inset-0 z-10"
                  onTouchStart={(e) => {
                    const touch = e.touches[0]
                    setTouchStart(touch.clientX)
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0]
                    setTouchEnd(touch.clientX)
                  }}
                  onTouchEnd={() => {
                    if (!touchStart || !touchEnd) return

                    const distance = touchStart - touchEnd
                    const isLeftSwipe = distance > 50
                    const isRightSwipe = distance < -50

                    if (isLeftSwipe && currentStoryIndex < discoverStories.length) {
                      setCurrentStoryIndex(currentStoryIndex + 1)
                    } else if (isRightSwipe && currentStoryIndex > 0) {
                      setCurrentStoryIndex(currentStoryIndex - 1)
                    }
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}