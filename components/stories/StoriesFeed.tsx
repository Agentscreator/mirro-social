"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Camera, Users } from "lucide-react"
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

interface CommunityStories {
  communityId: string
  community: {
    id: string
    name: string
    image?: string
  }
  stories: Story[]
  hasUnviewed: boolean
}

interface StoriesFeedProps {
  showPersonalOnly?: boolean
}

export function StoriesFeed({ showPersonalOnly = false }: StoriesFeedProps) {
  const { data: session } = useSession()
  const [communityStories, setCommunityStories] = useState<CommunityStories[]>([])
  const [personalStories, setPersonalStories] = useState<Story[]>([])
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
        
        if (showPersonalOnly) {
          // Filter for personal stories only (not community stories)
          const personal = (data.stories || []).filter((story: Story) => 
            story.type === 'personal' || (!story.type && !story.communityId)
          )
          setPersonalStories(personal)
        } else {
          // Group stories by community
          const groupedStories = groupStoriesByCommunity(data.stories || [])
          setCommunityStories(groupedStories)
        }
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

  const groupStoriesByCommunity = (stories: Story[]): CommunityStories[] => {
    // Filter for community stories only
    const communityStories = stories.filter(story => story.type === 'community' && story.community)
    
    const grouped = communityStories.reduce((acc, story) => {
      const communityId = story.communityId!
      if (!acc[communityId]) {
        acc[communityId] = {
          communityId,
          community: story.community!,
          stories: [],
          hasUnviewed: false
        }
      }
      acc[communityId].stories.push(story)
      if (!story.isViewed) {
        acc[communityId].hasUnviewed = true
      }
      return acc
    }, {} as Record<string, CommunityStories>)

    // Convert to array and sort by most recent and unviewed status
    const sortedStories = Object.values(grouped).sort((a, b) => {
      // Unviewed stories first
      if (a.hasUnviewed && !b.hasUnviewed) return -1
      if (!a.hasUnviewed && b.hasUnviewed) return 1
      
      // Then by most recent story
      const aLatest = Math.max(...a.stories.map(s => new Date(s.createdAt).getTime()))
      const bLatest = Math.max(...b.stories.map(s => new Date(s.createdAt).getTime()))
      return bLatest - aLatest
    })

    return sortedStories
  }

  const handleStoryClick = (communityStory: CommunityStories, storyIndex = 0) => {
    setSelectedStories(communityStory.stories)
    setInitialStoryIndex(storyIndex)
    setShowViewer(true)
  }

  const handlePersonalStoryClick = (story: Story) => {
    setSelectedStories([story])
    setInitialStoryIndex(0)
    setShowViewer(true)
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

  if (showPersonalOnly && personalStories.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No personal stories to show</p>
          <p className="text-gray-600 text-xs mt-1">Stories from people you follow will appear here</p>
        </div>
      </div>
    )
  }

  if (!showPersonalOnly && communityStories.length === 0) {
    return (
      <div className="px-6 py-4 bg-gray-950">
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">No group stories to show</p>
            <p className="text-gray-600 text-xs mt-1">Join groups to see their stories</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`${showPersonalOnly ? 'px-0 py-2' : 'px-6 py-4'} bg-gray-950 ${!showPersonalOnly ? 'border-b border-gray-800/50' : ''}`}>
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
          {/* Personal Stories */}
          {showPersonalOnly && personalStories.map((story) => (
            <div key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2">
              <div 
                className="relative cursor-pointer group"
                onClick={() => handlePersonalStoryClick(story)}
              >
                <div className={`p-0.5 rounded-full ${!story.isViewed ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gray-600'} group-hover:scale-105 transition-transform`}>
                  <Avatar className="w-16 h-16 border-2 border-gray-950">
                    <AvatarImage src={story.user.profileImage} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {(story.user.nickname || story.user.username)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs text-gray-300 text-center max-w-[60px] truncate">
                {story.user.nickname || story.user.username}
              </span>
            </div>
          ))}
          
          {/* Community Stories */}
          {!showPersonalOnly && communityStories.map((communityStory) => (
            <div key={communityStory.communityId} className="flex-shrink-0 flex flex-col items-center gap-2">
              <div 
                className="relative cursor-pointer group"
                onClick={() => handleStoryClick(communityStory)}
              >
                <div className={`p-0.5 rounded-full ${communityStory.hasUnviewed ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gray-600'} group-hover:scale-105 transition-transform`}>
                  <Avatar className="w-16 h-16 border-2 border-gray-950">
                    <AvatarImage src={communityStory.community.image} />
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white font-semibold">
                      {communityStory.community.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {communityStory.stories.length > 1 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{communityStory.stories.length}</span>
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 border-2 border-gray-950 rounded-full flex items-center justify-center">
                  <Users className="h-2 w-2 text-white" />
                </div>
              </div>
              <span className="text-xs text-gray-300 text-center max-w-[60px] truncate">
                {communityStory.community.name}
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