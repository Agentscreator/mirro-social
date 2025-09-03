"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Search, MessageCircle, User, ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserCard } from "@/components/user-card"
import { TypingAnimation } from "@/components/typing-animation"
import type { RecommendedUser } from "@/src/lib/recommendationService"
import { fetchRecommendations, generateExplanation } from "@/src/lib/apiServices"
import type { RecommendedUser as ApiRecommendedUser } from "@/src/lib/apiServices"
import { useRouter } from "next/navigation"
import { debounce } from "lodash"
import { useStreamContext } from "@/components/providers/StreamProvider"
import { toast } from "@/hooks/use-toast"

// Define search user type
interface SearchUser {
  id: string
  username: string
  nickname?: string
  image?: string
  profileImage?: string
}

// Extended RecommendedUser type to include profileImage
interface ExtendedRecommendedUser extends RecommendedUser {
  profileImage?: string
}

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<ExtendedRecommendedUser[]>([])
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [explanationLoading, setExplanationLoading] = useState<number>(-1)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [messagingUser, setMessagingUser] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [thoughts, setThoughts] = useState<Array<{id: string, title: string, content: string, createdAt: string}>>([])
  const [newThought, setNewThought] = useState("")
  const router = useRouter()
  const { client: streamClient, isReady } = useStreamContext()

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Helper functions for thoughts management
  const loadThoughts = async () => {
    try {
      const response = await fetch('/api/thoughts', {
        method: 'GET',
        credentials: 'include',
      })
      if (response.ok) {
        const thoughtsData = await response.json()
        setThoughts(thoughtsData)
      }
    } catch (error) {
      console.error('Error loading thoughts:', error)
    }
  }

  const addThought = async () => {
    if (newThought.trim() && newThought.length <= 1000) {
      const totalCharacters = thoughts.map(t => t.content).join("").length + newThought.length
      if (totalCharacters <= 8000) {
        try {
          const response = await fetch('/api/thoughts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              title: `Thought ${thoughts.length + 1}`,
              content: newThought.trim()
            })
          })
          
          if (response.ok) {
            const newThoughtData = await response.json()
            setThoughts([newThoughtData, ...thoughts])
            setNewThought("")
          }
        } catch (error) {
          console.error('Error saving thought:', error)
        }
      }
    }
  }

  const removeThought = async (thoughtId: string) => {
    try {
      const response = await fetch(`/api/thoughts/${thoughtId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      if (response.ok) {
        setThoughts(thoughts.filter(t => t.id !== thoughtId))
      }
    } catch (error) {
      console.error('Error deleting thought:', error)
    }
  }

  const getTotalCharacters = () => {
    return thoughts.map(t => t.content).join("").length
  }

  // Helper function to get the best available image URL
  const getBestImageUrl = (user: { image?: string | null; profileImage?: string | null }): string | null => {
    if (user.profileImage && user.profileImage.trim() && !user.profileImage.includes("placeholder")) {
      return user.profileImage
    }
    if (user.image && user.image.trim() && !user.image.includes("placeholder")) {
      return user.image
    }
    return null
  }

  // Helper function to convert API user to local user type
  const convertApiUserToLocalUser = (apiUser: ApiRecommendedUser): ExtendedRecommendedUser => {
    console.log("Converting API user:", apiUser)
    const bestImageUrl = getBestImageUrl(apiUser as any)
    return {
      id: apiUser.id,
      username: apiUser.username,
      image: bestImageUrl || "",
      profileImage: (apiUser as any).profileImage,
      reason: apiUser.reason,
      tags: apiUser.tags ?? [],
      score: (apiUser as any).score ?? 0,
    }
  }

  // Search users function
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    setSearchLoading(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`, {
        method: "GET",
        credentials: "include",
      })
      if (response.ok) {
        const { users } = await response.json()
        console.log("Search results:", users)
        const processedUsers = users.map((user: any) => ({
          ...user,
          image: getBestImageUrl(user) || "",
        }))
        setSearchResults(processedUsers)
        setShowSearchResults(true)
      } else {
        console.warn("Search returned status", response.status)
        setSearchResults([])
        setShowSearchResults(false)
      }
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => searchUsers(query), 300),
    [],
  )

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      debouncedSearch(value)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  // Handle search input focus/blur
  const handleSearchFocus = () => {
    if (searchQuery.trim() && searchResults.length > 0) {
      setShowSearchResults(true)
    }
  }

  const handleSearchBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget && relatedTarget.closest("[data-search-dropdown]")) {
      return
    }
    setTimeout(() => setShowSearchResults(false), 200)
  }

  // Navigate to user profile
  const handleViewProfile = (userId: string) => {
    setShowSearchResults(false)
    router.push(`/profile/${userId}`)
  }

  // Start conversation with user
  const handleMessage = async (userId: string) => {
    if (!streamClient || !isReady) {
      toast({
        title: "Error",
        description: "Chat is not ready. Please wait a moment and try again.",
        variant: "destructive",
      })
      return
    }
    setMessagingUser(userId)
    setShowSearchResults(false)
    try {
      const response = await fetch("/api/stream/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: userId }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create channel")
      }
      router.push(`/inbox/${userId}`)
    } catch (error) {
      console.error("Error creating channel:", error)
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setMessagingUser(null)
    }
  }

  // Navigation functions
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = async () => {
    if (currentIndex < shuffledUsers.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (hasMore && !loadingMore) {
      // Load more users when reaching the end
      await loadMore()
      if (currentIndex < users.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
  }

  // Load more recommendations
  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    try {
      setLoadingMore(true)
      const { users: newUsers, hasMore: moreAvailable, nextPage } = await fetchRecommendations(currentPage, 5)
      const usersWithReasons = [...users]
      const existingUserIds = new Set(users.map((user) => user.id))

      for (const newUser of newUsers) {
        if (existingUserIds.has(newUser.id)) {
          continue
        }

        let userId = -1
        if (typeof newUser.id === "string") {
          const parsed = Number.parseInt(newUser.id, 10)
          if (!isNaN(parsed)) {
            userId = parsed
          }
        } else if (typeof newUser.id === "number") {
          userId = newUser.id
        }

        if (userId > 0) {
          setExplanationLoading(userId)
        }

        const explanation = await generateExplanation(newUser)
        const convertedUser = convertApiUserToLocalUser(newUser)
        convertedUser.reason = explanation
        usersWithReasons.push(convertedUser)
        existingUserIds.add(newUser.id)
        setExplanationLoading(-1)
      }

      setUsers(usersWithReasons)
      setHasMore(moreAvailable)
      setCurrentPage(nextPage ?? currentPage)
    } catch (error) {
      console.error("Failed to load more recommendations:", error)
    } finally {
      setLoadingMore(false)
      setExplanationLoading(-1)
    }
  }

  // Initial load of recommendations and thoughts
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        
        // Load recommendations
        const { users: recommendedUsers, hasMore: moreAvailable, nextPage } = await fetchRecommendations(1, 5)
        const usersWithReasons: ExtendedRecommendedUser[] = []

        for (const user of recommendedUsers) {
          const convertedUser = convertApiUserToLocalUser(user)
          convertedUser.reason = await generateExplanation(user)
          usersWithReasons.push(convertedUser)
        }

        setUsers(usersWithReasons)
        setHasMore(moreAvailable)
        setCurrentPage(nextPage ?? 1)
        setExplanationLoading(-1)
        
        // Load thoughts
        await loadThoughts()
      } catch (error) {
        console.error("Failed to load initial data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Filter users based on search query and prioritize by tier (users with embeddings first)
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  
  // Sort users by tier (lower tier number = higher priority) and then by score
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // First sort by tier (if available)
    const aTier = (a as any).tier || 3
    const bTier = (b as any).tier || 3
    
    if (aTier !== bTier) {
      return aTier - bTier // Lower tier number comes first
    }
    
    // If same tier, sort by score (higher score first)
    return (b.score || 0) - (a.score || 0)
  })
  
  // Add some randomization within tiers to prevent the same user always appearing first
  const shuffledUsers = [...sortedUsers]
  if (shuffledUsers.length > 1) {
    // Group by tier and shuffle within each tier
    const tierGroups: { [key: number]: typeof shuffledUsers } = {}
    shuffledUsers.forEach(user => {
      const tier = (user as any).tier || 3
      if (!tierGroups[tier]) tierGroups[tier] = []
      tierGroups[tier].push(user)
    })
    
    // Shuffle within each tier
    Object.values(tierGroups).forEach(tierUsers => {
      if (tierUsers.length > 1) {
        for (let i = Math.min(3, tierUsers.length - 1); i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tierUsers[i], tierUsers[j]] = [tierUsers[j], tierUsers[i]];
        }
      }
    })
    
    // Reconstruct the array with shuffled tiers
    shuffledUsers.length = 0
    Object.keys(tierGroups).sort((a, b) => Number(a) - Number(b)).forEach(tier => {
      shuffledUsers.push(...tierGroups[Number(tier)])
    })
  }

  // Save and restore current index position
  useEffect(() => {
    const savedIndex = localStorage.getItem('discover-current-index')
    if (savedIndex && shuffledUsers.length > 0) {
      const index = parseInt(savedIndex, 10)
      if (index >= 0 && index < shuffledUsers.length) {
        setCurrentIndex(index)
      }
    }
  }, [shuffledUsers.length])

  useEffect(() => {
    localStorage.setItem('discover-current-index', currentIndex.toString())
  }, [currentIndex])

  // Swipe gesture handling
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null) // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      // Swipe left - go to next user
      goToNext()
    } else if (isRightSwipe) {
      // Swipe right - go to previous user
      goToPrevious()
    }
  }

  // Get current user to display
  const currentUser = shuffledUsers[currentIndex]

  // ThoughtsUploadArea Component
  const ThoughtsUploadArea = () => {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium text-white mb-1">Tell us about yourself</h3>
          <p className="text-sm text-gray-400">Help us find better matches</p>
        </div>

        {/* Character count */}
        <div className="text-center mb-4">
          <span className={`text-xs ${getTotalCharacters() > 7500 ? 'text-red-400' : 'text-gray-500'}`}>
            {getTotalCharacters()}/8000 characters
          </span>
        </div>

        {/* Existing thoughts */}
        {thoughts.length > 0 && (
          <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
            {thoughts.map((thought) => (
              <div key={thought.id} className="relative bg-gray-800 rounded-lg p-3 group">
                <p className="text-sm text-gray-200 pr-6">{thought.content}</p>
                <button
                  onClick={() => removeThought(thought.id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New thought input */}
        <div className="space-y-3">
          <textarea
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            placeholder="What kind of person would you like to meet?"
            className="w-full h-20 p-3 rounded-lg border border-gray-600 bg-gray-800 resize-none text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            maxLength={1000}
          />
          
          <Button
            onClick={addThought}
            disabled={
              !newThought.trim() || 
              newThought.length > 1000 || 
              getTotalCharacters() + newThought.length > 8000
            }
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Thought
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <TypingAnimation />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Main Content */}
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-light text-white">Discover</h1>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search users..."
            className="pl-12 h-12 rounded-xl border-gray-700 bg-gray-900/50 backdrop-blur-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
              data-search-dropdown
            >
              {searchLoading ? (
                <div className="p-6 text-center">
                  <TypingAnimation />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((user) => {
                    const imageUrl = getBestImageUrl(user)
                    return (
                      <div
                        key={user.id}
                        className="px-4 py-3 hover:bg-gray-800/80 cursor-pointer rounded-lg mx-1 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative h-8 w-8 overflow-hidden rounded-full">
                              {imageUrl ? (
                                <img
                                  src={imageUrl || "/placeholder.svg"}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.log("Image failed to load:", imageUrl)
                                    e.currentTarget.style.display = "none"
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                    if (fallback) fallback.style.display = "flex"
                                  }}
                                />
                              ) : null}
                              <div
                                className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold"
                                style={{ display: imageUrl ? "none" : "flex" }}
                              >
                                {user.username[0]?.toUpperCase() || "?"}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-white">{user.username}</div>
                              {user.nickname && <div className="text-sm text-gray-300">{user.nickname}</div>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleViewProfile(user.id)
                              }}
                              className="h-8 px-3 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                            >
                              <User className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleMessage(user.id)
                              }}
                              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              disabled={messagingUser === user.id || !isReady}
                            >
                              {messagingUser === user.id ? (
                                <div className="h-3 w-3 mr-1 animate-spin rounded-full border border-white border-t-transparent"></div>
                              ) : (
                                <MessageCircle className="h-3 w-3 mr-1" />
                              )}
                              Message
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400">No users found</div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        {!showSearchResults && (
          <>
            {filteredUsers.length > 0 ? (
              <>
                {/* Desktop Layout */}
                <div className="hidden lg:block">
                  {/* Navigation */}
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <Button
                      onClick={goToPrevious}
                      disabled={currentIndex === 0}
                      variant="ghost"
                      size="lg"
                      className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </Button>

                    <div className="text-lg font-light text-gray-300 min-w-[120px] text-center">
                      {currentIndex + 1} of {shuffledUsers.length}
                    </div>

                    <Button
                      onClick={goToNext}
                      disabled={currentIndex === shuffledUsers.length - 1 && !hasMore}
                      variant="ghost"
                      size="lg"
                      className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                    >
                      {loadingMore ? (
                        <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-white" />
                      )}
                    </Button>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-3 gap-8">
                    {/* User Card */}
                    {currentUser && (
                      <div className="col-span-2">
                        <UserCard
                          key={currentUser.id}
                          user={{
                            id: currentUser.id,
                            username: currentUser.username,
                            image: currentUser.image || "",
                            profileImage: currentUser.profileImage,
                            reason: currentUser.reason || "Calculating why you'd be a good match...",
                            tags: currentUser.tags || [],
                          }}
                          onMessage={() => handleMessage(currentUser.id.toString())}
                          onViewProfile={() => handleViewProfile(currentUser.id.toString())}
                          isMessaging={messagingUser === currentUser.id.toString()}
                          isLarge={true}
                        />
                      </div>
                    )}
                    
                    {/* Thoughts Section */}
                    <div className="col-span-1">
                      <ThoughtsUploadArea />
                    </div>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden space-y-6">
                  {/* Navigation */}
                  <div className="flex items-center justify-center gap-6">
                    <Button
                      onClick={goToPrevious}
                      disabled={currentIndex === 0}
                      variant="ghost"
                      size="lg"
                      className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-gray-400">{currentIndex + 1} of {shuffledUsers.length}</p>
                      <p className="text-xs text-gray-500">Swipe to explore</p>
                    </div>

                    <Button
                      onClick={goToNext}
                      disabled={currentIndex === shuffledUsers.length - 1 && !hasMore}
                      variant="ghost"
                      size="lg"
                      className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                    >
                      {loadingMore ? (
                        <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-white" />
                      )}
                    </Button>
                  </div>

                  {/* User Card */}
                  {currentUser && (
                    <div 
                      className=""
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      <UserCard
                        key={currentUser.id}
                        user={{
                          id: currentUser.id,
                          username: currentUser.username,
                          image: currentUser.image || "",
                          profileImage: currentUser.profileImage,
                          reason: currentUser.reason || "Calculating why you'd be a good match...",
                          tags: currentUser.tags || [],
                        }}
                        onMessage={() => handleMessage(currentUser.id.toString())}
                        onViewProfile={() => handleViewProfile(currentUser.id.toString())}
                        isMessaging={messagingUser === currentUser.id.toString()}
                        isLarge={true}
                      />
                    </div>
                  )}

                  {/* Thoughts Section - Mobile */}
                  <ThoughtsUploadArea />
                </div>

                {explanationLoading !== -1 && (
                  <div className="text-center text-sm text-gray-500 mt-4">Generating connection explanation...</div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-2">No users found</div>
                <p className="text-sm text-gray-500">Try adjusting your search or come back later</p>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
