"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Camera } from "lucide-react"
import { StoriesViewer } from "./StoriesViewer"
import { toast } from "@/hooks/use-toast"

interface Story {
  id: number
  userId: string
  type: string
  communityId?: string
  content?: string
  image?: string
  video?: string
  createdAt: string
  expiresAt: string
  views: number
  isViewed: boolean
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
  community?: {
    id: string
    name: string
    image?: string
  } | null
}

interface UserStories {
  userId: string
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
  stories: Story[]
  hasUnviewed: boolean
}

export function StoriesFeed() {
  const { data: session } = useSession()
  const [userStories, setUserStories] = useState<UserStories[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStories, setSelectedStories] = useState<Story[]>([])
  const [showViewer, setShowViewer] = useState(false)
  const [initialStoryIndex, setInitialStoryIndex] = useState(0)
  const [showCreateStory, setShowCreateStory] = useState(false)

  useEffect(() => {
    fetchStories()
  }, [session?.user?.id])

  const fetchStories = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const response = await fetch('/api/stories')
      if (response.ok) {
        const data = await response.json()
        
        // Group stories by user
        const groupedStories = groupStoriesByUser(data.stories || [])
        setUserStories(groupedStories)
      }
    } catch (error) {
      console.error('Error fetching stories:', error)
      toast({
        title: "Error",
        description: "Failed to load stories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const groupStoriesByUser = (stories: Story[]): UserStories[] => {
    const grouped = stories.reduce((acc, story) => {
      const userId = story.userId
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          user: story.user,
          stories: [],
          hasUnviewed: false
        }
      }
      acc[userId].stories.push(story)
      if (!story.isViewed) {
        acc[userId].hasUnviewed = true
      }
      return acc
    }, {} as Record<string, UserStories>)

    // Convert to array and sort (own stories first, then by most recent)
    const sortedStories = Object.values(grouped).sort((a, b) => {
      // Current user's stories first
      if (a.userId === session?.user?.id) return -1
      if (b.userId === session?.user?.id) return 1
      
      // Then by unviewed stories
      if (a.hasUnviewed && !b.hasUnviewed) return -1
      if (!a.hasUnviewed && b.hasUnviewed) return 1
      
      // Finally by most recent story
      const aLatest = Math.max(...a.stories.map(s => new Date(s.createdAt).getTime()))
      const bLatest = Math.max(...b.stories.map(s => new Date(s.createdAt).getTime()))
      return bLatest - aLatest
    })

    return sortedStories
  }

  const handleStoryClick = (userStory: UserStories, storyIndex = 0) => {
    setSelectedStories(userStory.stories)
    setInitialStoryIndex(storyIndex)
    setShowViewer(true)
  }

  const handleCreateStory = () => {
    // Navigate to story creation or show create story dialog
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await uploadStory(file)
      }
    }
    input.click()
  }

  const uploadStory = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('media', file)
      formData.append('type', 'personal')

      const response = await fetch('/api/stories', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Story uploaded successfully!",
        })
        fetchStories() // Refresh stories
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload story')
      }
    } catch (error) {
      console.error('Error uploading story:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload story",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-4 bg-gray-950">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-gray-800 rounded-full animate-pulse" />
              <div className="w-12 h-3 bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (userStories.length === 0) {
    return (
      <div className="px-6 py-4 bg-gray-950">
        <div className="flex items-center gap-4">
          {/* Your story - create new */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-gray-600">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="bg-gray-700 text-white">
                  {session?.user?.name?.[0]?.toUpperCase() || 'Y'}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={handleCreateStory}
                size="icon"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 border-2 border-gray-950"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <span className="text-xs text-gray-400 text-center">Your story</span>
          </div>
          
          <div className="flex-1 text-center py-4">
            <p className="text-gray-500 text-sm">No stories to show</p>
            <p className="text-gray-600 text-xs mt-1">Follow friends to see their stories</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="px-6 py-4 bg-gray-950 border-b border-gray-800/50">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
          {/* Your story - first if you have stories, otherwise create new */}
          {userStories.find(us => us.userId === session?.user?.id) ? (
            userStories
              .filter(us => us.userId === session?.user?.id)
              .map((userStory) => (
                <div key={userStory.userId} className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => handleStoryClick(userStory)}
                  >
                    <div className={`p-0.5 rounded-full ${userStory.hasUnviewed ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gray-600'}`}>
                      <Avatar className="w-16 h-16 border-2 border-gray-950">
                        <AvatarImage src={userStory.user.profileImage} />
                        <AvatarFallback className="bg-gray-700 text-white">
                          {(userStory.user.nickname || userStory.user.username)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateStory()
                      }}
                      size="icon"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 border-2 border-gray-950"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <span className="text-xs text-gray-300 text-center max-w-[60px] truncate">
                    Your story
                  </span>
                </div>
              ))
          ) : (
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-gray-600">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {session?.user?.name?.[0]?.toUpperCase() || 'Y'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  onClick={handleCreateStory}
                  size="icon"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 border-2 border-gray-950"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <span className="text-xs text-gray-400 text-center">Your story</span>
            </div>
          )}

          {/* Other users' stories */}
          {userStories
            .filter(us => us.userId !== session?.user?.id)
            .map((userStory) => (
              <div key={userStory.userId} className="flex-shrink-0 flex flex-col items-center gap-2">
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => handleStoryClick(userStory)}
                >
                  <div className={`p-0.5 rounded-full ${userStory.hasUnviewed ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gray-600'} group-hover:scale-105 transition-transform`}>
                    <Avatar className="w-16 h-16 border-2 border-gray-950">
                      <AvatarImage src={userStory.user.profileImage} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {(userStory.user.nickname || userStory.user.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {userStory.stories.length > 1 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{userStory.stories.length}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-300 text-center max-w-[60px] truncate">
                  {userStory.user.nickname || userStory.user.username}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Stories Viewer */}
      {showViewer && (
        <StoriesViewer
          stories={selectedStories}
          onClose={() => setShowViewer(false)}
          initialStoryIndex={initialStoryIndex}
        />
      )}
    </>
  )
}