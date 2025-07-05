"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Search, MessageCircle, User, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserCard } from "@/components/user-card"
import { TypingAnimation } from "@/components/typing-animation"
import { HamburgerMenu } from "@/components/hamburger-menu"
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
  const router = useRouter()
  const { client: streamClient, isReady } = useStreamContext()

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
      router.push(`/messages/${userId}`)
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
    if (currentIndex < filteredUsers.length - 1) {
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

  // Initial load of recommendations
  useEffect(() => {
    async function loadInitialRecommendations() {
      try {
        setLoading(true)
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
      } catch (error) {
        console.error("Failed to load recommendations:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInitialRecommendations()
  }, [])

  // Filter users based on search query
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()))

  // Get current user to display
  const currentUser = filteredUsers[currentIndex]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <TypingAnimation />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Header with Hamburger Menu */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">Discover</h1>
        <HamburgerMenu />
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search for users..."
          className="pl-10 rounded-full border-blue-200 bg-white text-gray-900 placeholder:text-gray-500"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
        />

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-blue-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
            data-search-dropdown
          >
            {searchLoading ? (
              <div className="p-4 text-center">
                <TypingAnimation />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((user) => {
                  const imageUrl = getBestImageUrl(user)
                  return (
                    <div
                      key={user.id}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
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
                            <div className="font-medium text-gray-900">{user.username}</div>
                            {user.nickname && <div className="text-sm text-gray-500">{user.nickname}</div>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleViewProfile(user.id)
                            }}
                            className="rounded-full text-gray-700 hover:text-gray-900 border-gray-300"
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
                            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={messagingUser === user.id || !isReady}
                          >
                            {messagingUser === user.id ? (
                              <div className="h-3 w-3 mr-1 animate-spin rounded-full border-b border-white"></div>
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
              <div className="p-4 text-center text-gray-500">No users found</div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      {!showSearchResults && (
        <>
          {filteredUsers.length > 0 ? (
            <div className="relative">
              <div className="flex items-center justify-center gap-6 mb-8">
                <Button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  variant="outline"
                  size="lg"
                  className="rounded-full w-14 h-14 p-0 border-2 border-gray-800 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:border-gray-300 bg-white shadow-md"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-800" />
                </Button>

                <div className="text-xl font-bold text-gray-800 min-w-[140px] text-center">Discover People</div>

                <Button
                  onClick={goToNext}
                  disabled={currentIndex === filteredUsers.length - 1 && !hasMore}
                  variant="outline"
                  size="lg"
                  className="rounded-full w-14 h-14 p-0 border-2 border-gray-800 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:border-gray-300 bg-white shadow-md"
                >
                  {loadingMore ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-800 border-t-transparent" />
                  ) : (
                    <ChevronRight className="h-6 w-6 text-gray-800" />
                  )}
                </Button>
              </div>

              {/* Current User Card */}
              {currentUser && (
                <div className="max-w-4xl mx-auto">
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

              {explanationLoading !== -1 && (
                <div className="text-center text-sm text-gray-500 mt-4">Generating connection explanation...</div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No matching users found</div>
          )}
        </>
      )}
    </div>
  )
}
