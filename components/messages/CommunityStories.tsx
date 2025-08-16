"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Camera, Video, X } from "lucide-react"
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

                {/* Add story button */}
                <Button
                  size="sm"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 hover:bg-green-600 p-0"
                  onClick={() => {
                    setSelectedGroup(group)
                    setShowCreateStory(true)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-gray-300 text-center mt-1 max-w-[64px] truncate">
                {group.name}
              </p>
            </div>
          ))}
        </div>
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