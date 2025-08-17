"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Camera, Video, X, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface CommunityStory {
  id: number
  content?: string
  image?: string
  video?: string
  createdAt: string
  expiresAt: string
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
  viewCount: number
  hasViewed: boolean
}

interface Community {
  id: number
  name: string
  image?: string
  memberCount: number
  stories?: CommunityStory[]
}

interface CommunityStoriesProps {
  groups: Community[]
  onRefresh: () => void
}

export function CommunityStories({ groups, onRefresh }: CommunityStoriesProps) {
  const { data: session } = useSession()
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Community | null>(null)
  const [storyContent, setStoryContent] = useState("")
  const [storyMedia, setStoryMedia] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showGroupSelection, setShowGroupSelection] = useState(false)
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Auto-hide group selection after inactivity
  useEffect(() => {
    if (showGroupSelection) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set timeout to hide after 5 seconds of inactivity
      timeoutRef.current = setTimeout(() => {
        setShowGroupSelection(false)
      }, 5000)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [showGroupSelection, lastInteractionTime])

  // Track page visibility to refresh when returning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible again - refresh data
        onRefresh()
      } else {
        // Page hidden - reset interaction time
        setLastInteractionTime(Date.now())
        setShowGroupSelection(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [onRefresh])

  const handleInteraction = () => {
    setLastInteractionTime(Date.now())
  }

  const handleCreateStory = async () => {
    if (!selectedGroup || (!storyContent.trim() && !storyMedia)) {
      toast({
        title: "Error",
        description: "Please add content or media for your story",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      let mediaUrl = null

      // Upload media if provided
      if (storyMedia) {
        const formData = new FormData()
        formData.append('file', storyMedia)

        const uploadResponse = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          mediaUrl = uploadData.url
        } else {
          throw new Error('Failed to upload media')
        }
      }

      // Create story
      const response = await fetch(`/api/groups/${selectedGroup.id}/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: storyContent.trim() || null,
          image: storyMedia?.type.startsWith('image/') ? mediaUrl : null,
          video: storyMedia?.type.startsWith('video/') ? mediaUrl : null,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Story created successfully!",
        })
        setShowCreateStory(false)
        setStoryContent("")
        setStoryMedia(null)
        setSelectedGroup(null)
        onRefresh()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create story')
      }
    } catch (error) {
      console.error('Error creating story:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create story",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({
          title: "Error",
          description: "Please select an image or video file",
          variant: "destructive",
        })
        return
      }

      // Validate file size (10MB for images, 50MB for videos)
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: `File too large (max ${file.type.startsWith('video/') ? '50MB for videos' : '10MB for images'})`,
          variant: "destructive",
        })
        return
      }

      setStoryMedia(file)
    }
  }

  if (groups.length === 0) return null

  return (
    <>
      {/* Community Stories Row */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Community Stories</h3>
          
          {/* Subtle Add to Stories Button */}
          <Button
            size="sm"
            variant="ghost"
            className={`text-xs px-3 py-1 h-7 rounded-full transition-all duration-200 ${
              showGroupSelection 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
            onClick={() => {
              setShowGroupSelection(!showGroupSelection)
              handleInteraction()
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Story
            {showGroupSelection ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {groups.map((group) => (
            <div key={group.id} className="flex-shrink-0">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-blue-500">
                  <AvatarImage src={group.image} alt={group.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {group.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Story indicator */}
                {(group.stories?.length || 0) > 0 && (
                  <div className="absolute -top-1 -right-1 h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{group.stories?.length || 0}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-300 text-center mt-1 max-w-[64px] truncate">
                {group.name}
              </p>
            </div>
          ))}
        </div>

        {/* Expandable Group Selection */}
        {showGroupSelection && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-gray-400 mb-3">Select a community to add your story:</p>
            <div className="grid grid-cols-2 gap-2">
              {groups.map((group) => (
                <Button
                  key={group.id}
                  variant="ghost"
                  className="flex items-center gap-2 p-2 h-auto justify-start text-left hover:bg-gray-700"
                  onClick={() => {
                    setSelectedGroup(group)
                    setShowCreateStory(true)
                    setShowGroupSelection(false)
                    handleInteraction()
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={group.image} alt={group.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {group.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{group.name}</p>
                    <p className="text-xs text-gray-400">{group.memberCount} members</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Story Dialog */}
      <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-center">
              Add to {selectedGroup?.name} Story
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Media Preview */}
            {storyMedia && (
              <div className="relative">
                {storyMedia.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(storyMedia)}
                    alt="Story preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(storyMedia)}
                    className="w-full h-48 object-cover rounded-lg"
                    controls
                  />
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setStoryMedia(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Content Input */}
            <Textarea
              placeholder="What's happening in your community?"
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              rows={3}
            />

            {/* Media Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => document.getElementById('story-image-input')?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Photo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => document.getElementById('story-video-input')?.click()}
              >
                <Video className="h-4 w-4 mr-2" />
                Video
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateStory(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={handleCreateStory}
                disabled={uploading || (!storyContent.trim() && !storyMedia)}
              >
                {uploading ? "Posting..." : "Post Story"}
              </Button>
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            id="story-image-input"
            type="file"
            accept="image/*"
            onChange={handleMediaSelect}
            className="hidden"
          />
          <input
            id="story-video-input"
            type="file"
            accept="video/*"
            onChange={handleMediaSelect}
            className="hidden"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}