"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Search, MessageCircle, User, ChevronLeft, ChevronRight, Plus, X, Bookmark } from "lucide-react"
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
  const [explanationLoading, setExplanationLoading] = useState<string | null>(null)
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [messagingUser, setMessagingUser] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [thoughts, setThoughts] = useState<Array<{id: string, title: string, content: string, createdAt: string}>>([])
  const [newThought, setNewThought] = useState("")
  const [isTypingThought, setIsTypingThought] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [savedProfiles, setSavedProfiles] = useState<ExtendedRecommendedUser[]>([])
  const [showSavedProfiles, setShowSavedProfiles] = useState(false)
  const [savedProfilesLoading, setSavedProfilesLoading] = useState(false)
  const router = useRouter()
  const { client: streamClient, isReady } = useStreamContext()
  const thoughtInputRef = useRef<HTMLTextAreaElement>(null)
  const thoughtsContainerRef = useRef<HTMLDivElement>(null)

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
          // Preserve focus state
          const wasInputFocused = thoughtInputRef.current === document.activeElement
          
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
            
            // Restore focus if it was previously focused
            if (wasInputFocused && thoughtInputRef.current) {
              setTimeout(() => {
                thoughtInputRef.current?.focus()
              }, 0)
            }
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

  // Handle typing state for pausing recommendations
  const handleThoughtTyping = (value: string) => {
    setNewThought(value)
    
    // Only set typing state if not already typing to prevent unnecessary re-renders
    if (!isTypingThought) {
      setIsTypingThought(true)
    }
    
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    // Set new timeout to mark typing as finished after 3 seconds of inactivity (increased from 2)
    const newTimeout = setTimeout(() => {
      setIsTypingThought(false)
    }, 3000)
    
    setTypingTimeout(newTimeout)
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
    // Don't allow navigation while generating any explanation
    if (isGeneratingExplanation) return
    
    // Left button: go back to previous user if available
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = async () => {
    // Don't allow navigation while generating any explanation
    if (isGeneratingExplanation) return
    
    if (currentIndex < shuffledUsers.length - 1) {
      setCurrentIndex(currentIndex + 1)
      
      // Preload more users when we're getting close to the end (within 2 users)
      if (currentIndex >= shuffledUsers.length - 3 && hasMore && !loadingMore && !isTypingThought) {
        loadMore() // Don't await, run in background
      }
    } else if (hasMore && !loadingMore && !isTypingThought) {
      // Load more users when reaching the end, but not if user is typing
      await loadMore()
      if (currentIndex < shuffledUsers.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
  }

  // Load more recommendations
  const loadMore = async () => {
    if (!hasMore || loadingMore || isTypingThought) return
    try {
      setLoadingMore(true)
      const randomSeed = Math.floor(Math.random() * 1000)
      const { users: newUsers, hasMore: moreAvailable, nextPage } = await fetchRecommendations(currentPage, 3, randomSeed)
      const usersWithReasons = [...users]
      const existingUserIds = new Set(users.map((user) => user.id))

      // First, add all new users immediately with placeholder reasons
      const newConvertedUsers = []
      for (const newUser of newUsers) {
        if (existingUserIds.has(newUser.id)) {
          continue
        }

        const convertedUser = convertApiUserToLocalUser(newUser)
        convertedUser.reason = "Generating match explanation..."
        usersWithReasons.push(convertedUser)
        newConvertedUsers.push({ originalUser: newUser, convertedUser })
        existingUserIds.add(newUser.id)
      }
      
      // Update users immediately so navigation is fast
      setUsers([...usersWithReasons])
      
      // Generate explanations sequentially for better UX
      if (newConvertedUsers.length > 0) {
        setIsGeneratingExplanation(true)
      }
      
      for (const { originalUser, convertedUser } of newConvertedUsers) {
        try {
          setExplanationLoading(convertedUser.id)
          const explanation = await generateExplanation(originalUser)
          // Update the specific user's reason
          setUsers(prevUsers => {
            const updatedUsers = [...prevUsers]
            const userIndex = updatedUsers.findIndex(u => u.id === convertedUser.id)
            if (userIndex !== -1) {
              updatedUsers[userIndex].reason = explanation
            }
            return updatedUsers
          })
        } catch (error) {
          console.error(`Failed to generate explanation for user ${originalUser.id}:`, error)
          setUsers(prevUsers => {
            const updatedUsers = [...prevUsers]
            const userIndex = updatedUsers.findIndex(u => u.id === convertedUser.id)
            if (userIndex !== -1) {
              updatedUsers[userIndex].reason = "Unable to generate match explanation"
            }
            return updatedUsers
          })
        } finally {
          setExplanationLoading(null)
        }
      }
      
      if (newConvertedUsers.length > 0) {
        setIsGeneratingExplanation(false)
      }

      // Users already updated above for faster navigation
      setHasMore(moreAvailable)
      setCurrentPage(nextPage ?? currentPage)
    } catch (error) {
      console.error("Failed to load more recommendations:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Load saved profiles function
  const loadSavedProfiles = async () => {
    try {
      setSavedProfilesLoading(true)
      const response = await fetch('/api/users/saved', {
        method: 'GET',
        credentials: 'include',
      })
      
      if (response.ok) {
        const { savedProfiles: savedProfilesData } = await response.json()
        const convertedSavedProfiles = savedProfilesData.map((user: any) => ({
          ...user,
          image: getBestImageUrl(user) || "",
          tags: [],
          reason: "Saved profile",
        }))
        setSavedProfiles(convertedSavedProfiles)
      }
    } catch (error) {
      console.error('Error loading saved profiles:', error)
    } finally {
      setSavedProfilesLoading(false)
    }
  }

  // Save profile function
  const handleSaveProfile = async (userId: string | number) => {
    try {
      const response = await fetch('/api/users/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ savedUserId: userId.toString() })
      })
      
      if (response.ok) {
        // Reload saved profiles to get the updated list
        await loadSavedProfiles()
        toast({
          title: "Success",
          description: "Profile saved successfully!",
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Unsave profile function
  const handleUnsaveProfile = async (userId: string | number) => {
    try {
      const response = await fetch(`/api/users/saved?savedUserId=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      
      if (response.ok) {
        // Remove from local state
        setSavedProfiles(prev => prev.filter(p => p.id !== userId.toString()))
        toast({
          title: "Success",
          description: "Profile removed from saved list.",
        })
      }
    } catch (error) {
      console.error('Error unsaving profile:', error)
      toast({
        title: "Error",
        description: "Failed to unsave profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Check if a user is saved
  const isUserSaved = (userId: string | number) => {
    return savedProfiles.some(p => p.id === userId.toString())
  }

  // Clear local storage position when component mounts to ensure fresh order
  useEffect(() => {
    localStorage.removeItem('discover-current-index')
    setCurrentIndex(0)
    loadSavedProfiles() // Load saved profiles on mount
  }, [])

  // Initial load of recommendations and thoughts
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        
        // Set a maximum loading time of 800ms
        const maxLoadingTime = setTimeout(() => {
          setLoading(false)
        }, 800)
        
        // Generate a random seed for this session to ensure different order
        const randomSeed = Math.floor(Math.random() * 1000)
        
        // Load recommendations and thoughts in parallel
        const [recommendationsData, _] = await Promise.all([
          fetchRecommendations(1, 3, randomSeed), // Pass random seed for different results
          loadThoughts()
        ])
        
        clearTimeout(maxLoadingTime)
        
        const { users: recommendedUsers, hasMore: moreAvailable, nextPage } = recommendationsData
        
        // Convert users first, set basic data immediately
        const usersWithBasicData = recommendedUsers.map(user => {
          const convertedUser = convertApiUserToLocalUser(user)
          convertedUser.reason = "Generating match explanation..."
          return convertedUser
        })
        
        setUsers(usersWithBasicData)
        setHasMore(moreAvailable)
        setCurrentPage(nextPage ?? 1)
        setLoading(false) // Stop loading here to show users faster
        
        // Generate explanations sequentially after showing users
        if (recommendedUsers.length > 0) {
          setIsGeneratingExplanation(true)
        }
        
        for (let index = 0; index < recommendedUsers.length; index++) {
          const user = recommendedUsers[index]
          const convertedUser = usersWithBasicData[index]
          
          try {
            setExplanationLoading(convertedUser.id)
            const explanation = await generateExplanation(user)
            
            setUsers(prevUsers => {
              const newUsers = [...prevUsers]
              if (newUsers[index]) {
                newUsers[index].reason = explanation
              }
              return newUsers
            })
          } catch (error) {
            console.error(`Failed to generate explanation for user ${user.id}:`, error)
            setUsers(prevUsers => {
              const newUsers = [...prevUsers]
              if (newUsers[index]) {
                newUsers[index].reason = "Unable to generate match explanation"
              }
              return newUsers
            })
          } finally {
            setExplanationLoading(null)
          }
        }
        
        if (recommendedUsers.length > 0) {
          setIsGeneratingExplanation(false)
        }
      } catch (error) {
        console.error("Failed to load initial data:", error)
        setLoading(false)
        setIsGeneratingExplanation(false)
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

  // Don't save/restore position - start fresh each time for randomization
  // (Position saving code removed to ensure fresh experience each visit)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
    }
  }, [typingTimeout])

  // Capacitor keyboard handling
  useEffect(() => {
    const isCapacitor = !!(window as any).Capacitor
    
    if (isCapacitor && (window as any).Capacitor?.Plugins?.Keyboard) {
      const keyboard = (window as any).Capacitor.Plugins.Keyboard
      
      const keyboardWillShow = () => {
        // Add minimal padding to body, don't interfere with scrolling
        document.body.style.paddingBottom = '100px'
        // Ensure body can still be scrolled
        document.body.style.overflowY = 'auto'
      }
      
      const keyboardWillHide = () => {
        // Remove padding when keyboard hides
        document.body.style.paddingBottom = '0px'
        // Restore original overflow
        document.body.style.overflowY = 'auto'
      }
      
      keyboard.addListener('keyboardWillShow', keyboardWillShow)
      keyboard.addListener('keyboardWillHide', keyboardWillHide)
      
      return () => {
        keyboard.removeAllListeners()
        document.body.style.paddingBottom = '0px'
      }
    }
  }, [])

  // Swipe gesture handling
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null) // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    if (isGeneratingExplanation) return // Block swipe during explanation generation
    
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

  // Memoized ThoughtsUploadArea Component to prevent unnecessary re-renders
  const ThoughtsUploadArea = useMemo(() => {
    return (
      <div ref={thoughtsContainerRef} className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium text-white mb-1">Tell us about yourself</h3>
          <p className="text-sm text-gray-400">Help us find better matches</p>
          {isTypingThought && (
            <p className="text-xs text-blue-400 mt-2 font-medium">
              ✓ Recommendations paused while typing
            </p>
          )}
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
            ref={thoughtInputRef}
            value={newThought}
            onChange={(e) => handleThoughtTyping(e.target.value)}
            placeholder="What kind of person would you like to meet?"
            className="w-full h-20 p-3 rounded-lg border border-gray-600 bg-gray-800 resize-none text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            maxLength={1000}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-testid="thought-input"
            onFocus={() => {
              // Add class to ensure scrolling works while typing
              document.body.classList.add('typing-thought')
              
              // Gentle scroll adjustment only if input is not visible
              if (window.innerWidth < 1024) {
                const isCapacitor = !!(window as any).Capacitor
                
                setTimeout(() => {
                  const inputRect = thoughtInputRef.current?.getBoundingClientRect()
                  if (inputRect && inputRect.bottom > window.innerHeight * 0.6) {
                    // Only adjust if the input is mostly hidden by keyboard
                    window.scrollBy({ 
                      top: Math.min(200, inputRect.bottom - window.innerHeight * 0.6),
                      behavior: 'smooth' 
                    })
                  }
                }, isCapacitor ? 100 : 300)
              }
            }}
            onBlur={() => {
              // Remove class when input loses focus
              document.body.classList.remove('typing-thought')
            }}
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
  }, [thoughts, newThought, isTypingThought])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <TypingAnimation speed={100} />
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
          <Button
            onClick={() => setShowSavedProfiles(!showSavedProfiles)}
            variant="outline"
            className="border-gray-600 hover:bg-gray-700 transition-colors"
          >
            <Bookmark className={`h-4 w-4 mr-2 ${showSavedProfiles ? 'text-blue-500' : ''}`} />
            Saved ({savedProfiles.length})
          </Button>
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

        {/* Saved Profiles Section */}
        {showSavedProfiles && (
          <div className="mb-8">
            <h2 className="text-xl font-light text-white mb-4">Your Saved Profiles</h2>
            {savedProfilesLoading ? (
              <div className="flex justify-center items-center py-8">
                <TypingAnimation />
              </div>
            ) : savedProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedProfiles.map((user) => (
                  <UserCard
                    key={user.id}
                    user={{
                      id: user.id,
                      username: user.username,
                      image: user.image || "",
                      profileImage: user.profileImage,
                      reason: user.reason || "Saved profile",
                      tags: user.tags || [],
                    }}
                    onMessage={() => handleMessage(user.id.toString())}
                    onViewProfile={() => handleViewProfile(user.id.toString())}
                    onUnsaveProfile={handleUnsaveProfile}
                    isMessaging={messagingUser === user.id.toString()}
                    isSaved={true}
                    isLarge={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-2">No saved profiles yet</div>
                <p className="text-sm text-gray-500">Save profiles you're interested in to find them easily later</p>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        {!showSearchResults && !showSavedProfiles && (
          <>
            {filteredUsers.length > 0 ? (
              <>
                {/* Desktop Layout */}
                <div className="hidden lg:block">
                  {/* Navigation */}
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <Button
                      onClick={goToPrevious}
                      disabled={currentIndex === 0 || isGeneratingExplanation}
                      variant="ghost"
                      size="lg"
                      className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </Button>

                    <div className="text-lg font-light text-gray-300 min-w-[120px] text-center">
                      {/* Pagination counter removed for 1-by-1 browsing */}
                    </div>

                    <Button
                      onClick={goToNext}
                      disabled={isGeneratingExplanation}
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
                            tags: [],
                          }}
                          onMessage={() => handleMessage(currentUser.id.toString())}
                          onViewProfile={() => handleViewProfile(currentUser.id.toString())}
                          onSaveProfile={handleSaveProfile}
                          onUnsaveProfile={handleUnsaveProfile}
                          isMessaging={messagingUser === currentUser.id.toString()}
                          isSaved={isUserSaved(currentUser.id)}
                          isLarge={true}
                        />
                      </div>
                    )}
                    
                    {/* Thoughts Section */}
                    <div className="col-span-1">
                      {ThoughtsUploadArea}
                    </div>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden space-y-6">
                  {/* Navigation */}
                  <div className="flex items-center justify-center gap-6">
                    <Button
                      onClick={goToPrevious}
                      disabled={currentIndex === 0 || isGeneratingExplanation}
                      variant="ghost"
                      size="lg"
                      className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </Button>

                    <div className="text-center">
                      <p className="text-xs text-gray-500">{isGeneratingExplanation ? "Generating..." : "Swipe to explore"}</p>
                    </div>

                    <Button
                      onClick={goToNext}
                      disabled={isGeneratingExplanation}
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
                          tags: [],
                        }}
                        onMessage={() => handleMessage(currentUser.id.toString())}
                        onViewProfile={() => handleViewProfile(currentUser.id.toString())}
                        onSaveProfile={handleSaveProfile}
                        onUnsaveProfile={handleUnsaveProfile}
                        isMessaging={messagingUser === currentUser.id.toString()}
                        isSaved={isUserSaved(currentUser.id)}
                        isLarge={true}
                      />
                    </div>
                  )}

                  {/* Thoughts Section - Mobile */}
                  {ThoughtsUploadArea}
                </div>

                {explanationLoading === currentUser?.id && (
                  <div className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    Generating connection recommendation...
                  </div>
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
