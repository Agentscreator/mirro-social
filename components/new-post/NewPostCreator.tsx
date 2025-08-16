"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { 
  Upload, 
  X, 
  Loader2, 
  Video, 
  Users, 
  ArrowLeft, 
  Play,
  Pause,
  RotateCcw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface NewPostCreatorProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: (post: any) => void
}

type CreationStep = 'upload' | 'describe'

export function NewPostCreator({ isOpen, onClose, onPostCreated }: NewPostCreatorProps) {
  // Main state
  const [currentStep, setCurrentStep] = useState<CreationStep>('upload')
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Invite details
  const [inviteDescription, setInviteDescription] = useState("")
  const [inviteTitle, setInviteTitle] = useState("")
  
  // Group settings
  const [createGroup, setCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [participantLimit, setParticipantLimit] = useState(10)
  const [isUnlimited, setIsUnlimited] = useState(false)
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle video upload
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type - video only
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive",
        })
        return
      }

      // Validate file size (100MB max for videos)
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "Video too large",
          description: "Please select a video smaller than 100MB",
          variant: "destructive",
        })
        return
      }

      setSelectedVideo(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setCurrentStep('describe')
    }
  }

  // Video playback controls
  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Create video invite
  const handleCreateInvite = async () => {
    if (!selectedVideo) {
      toast({
        title: "No video selected",
        description: "Please select a video to create your invite",
        variant: "destructive",
      })
      return
    }

    if (!inviteDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what you're inviting people to do",
        variant: "destructive",
      })
      return
    }

    if (createGroup && !groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('content', inviteDescription.trim())
      formData.append('media', selectedVideo)
      formData.append('isInvite', 'true')
      formData.append('inviteLimit', isUnlimited ? '100' : participantLimit.toString())
      
      // Add group creation data
      if (createGroup && groupName.trim()) {
        formData.append('autoAcceptInvites', 'true')
        formData.append('groupName', groupName.trim())
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        
        // If group creation was enabled, create the group
        if (createGroup && groupName.trim() && result.post?.id) {
          try {
            const groupResponse = await fetch(`/api/posts/${result.post.id}/create-group`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                groupName: groupName.trim(),
                maxMembers: isUnlimited ? 100 : participantLimit,
              }),
            })

            if (groupResponse.ok) {
              const groupResult = await groupResponse.json()
              result.group = groupResult.group
              
              toast({
                title: "Invite & Group Created!",
                description: `Your video invite and "${groupName}" group are ready`,
              })
            } else {
              toast({
                title: "Invite Created!",
                description: "Your video invite is live (group creation failed)",
              })
            }
          } catch (groupError) {
            console.error('Group creation error:', groupError)
            toast({
              title: "Invite Created!",
              description: "Your video invite is live (group creation failed)",
            })
          }
        } else {
          toast({
            title: "Video Invite Created!",
            description: "Your invite is now live and ready for responses",
          })
        }
        
        // Clear form and close
        handleClose()
        
        // Notify parent and refresh feed
        onPostCreated?.(result.post)
        window.dispatchEvent(new CustomEvent('feedRefresh'))
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create invite')
      }
    } catch (error) {
      console.error('Error creating invite:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invite",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Close and cleanup
  const handleClose = () => {
    setCurrentStep('upload')
    setSelectedVideo(null)
    setPreviewUrl(null)
    setInviteDescription("")
    setInviteTitle("")
    setCreateGroup(false)
    setGroupName("")
    setParticipantLimit(10)
    setIsUnlimited(false)
    setIsUploading(false)
    setIsPlaying(false)
    onClose()
  }

  // Go back to upload step
  const goBackToUpload = () => {
    setCurrentStep('upload')
    setSelectedVideo(null)
    setPreviewUrl(null)
    setIsPlaying(false)
  }

  // Render upload step
  const renderUploadStep = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />
      
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl">
        <Video className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-3 text-center">Create Video Invite</h2>
      <p className="text-gray-300 text-center mb-8 leading-relaxed max-w-sm">
        Upload a video to invite people to join you for activities, events, or hangouts
      </p>
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
      >
        <Upload className="w-5 h-5 mr-2" />
        Choose Video
      </Button>
      
      <p className="text-gray-400 text-sm mt-4">Max file size: 100MB</p>
    </div>
  )

  // Render describe step
  const renderDescribeStep = () => (
    <div className="flex flex-col h-full">
      {/* Video Preview */}
      <div className="h-64 relative bg-black overflow-hidden flex-shrink-0">
        {previewUrl && (
          <>
            <video
              ref={videoRef}
              src={previewUrl}
              className="w-full h-full object-cover"
              muted
              loop
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Play/Pause Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayback}
                className="bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 w-16 h-16"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
            </div>
          </>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={goBackToUpload}
          className="absolute top-4 left-4 bg-black/50 text-white rounded-full backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Form */}
      <div className="flex-1 bg-gray-900 p-6 space-y-6 overflow-y-auto">
        {/* Invite Description */}
        <div className="space-y-3">
          <label className="text-white font-semibold text-lg">Describe your invite</label>
          <Textarea
            value={inviteDescription}
            onChange={(e) => setInviteDescription(e.target.value)}
            placeholder="What are you inviting people to do? Be specific and exciting!"
            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500 min-h-[100px] text-base"
            maxLength={500}
          />
          <div className="text-xs text-gray-400 text-right">
            {inviteDescription.length}/500
          </div>
        </div>

        {/* Participant Limit */}
        <div className="space-y-4 p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Participant Limit</p>
                <p className="text-gray-400 text-sm">How many people can join?</p>
              </div>
            </div>
            <Switch
              checked={isUnlimited}
              onCheckedChange={setIsUnlimited}
            />
          </div>
          
          {!isUnlimited ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Maximum participants</span>
                <span className="text-sm font-medium text-white">{participantLimit}</span>
              </div>
              <Slider
                value={[participantLimit]}
                onValueChange={(value) => setParticipantLimit(value[0])}
                max={50}
                min={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>2</span>
                <span>50</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-400 text-sm font-medium">Unlimited participants</p>
              <p className="text-green-300/70 text-xs">Anyone can join your invite</p>
            </div>
          )}
        </div>

        {/* Auto-Create Group */}
        <div className="space-y-4 p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Create Group Chat</p>
                <p className="text-gray-400 text-sm">Auto-create group for participants</p>
              </div>
            </div>
            <Switch
              checked={createGroup}
              onCheckedChange={setCreateGroup}
            />
          </div>
          
          {createGroup && (
            <div className="space-y-2">
              <Input
                placeholder="Group name (e.g., 'Beach Volleyball Squad')"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                maxLength={50}
              />
              <p className="text-gray-400 text-xs">
                People who accept your invite will automatically join this group chat
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Button */}
      <div className="p-6 bg-gray-900 border-t border-gray-800 flex-shrink-0">
        <Button
          onClick={handleCreateInvite}
          disabled={isUploading || !inviteDescription.trim() || (createGroup && !groupName.trim())}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 text-white py-4 rounded-full font-bold text-lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating Invite...
            </>
          ) : (
            "Share Video Invite"
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto h-[90vh] bg-black text-white border-none p-0 flex flex-col rounded-3xl overflow-hidden">
        <DialogTitle className="sr-only">
          {currentStep === 'upload' ? 'Upload Video' : 'Describe Invite'}
        </DialogTitle>
        
        {/* Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 z-50 flex bg-black/80 backdrop-blur-sm">
          {['upload', 'describe'].map((step, index) => (
            <div
              key={step}
              className={`flex-1 h-1 ${
                currentStep === step || 
                (['upload'].indexOf(currentStep) > index)
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Step Content */}
        <div className="flex-1 pt-6 overflow-hidden">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'describe' && renderDescribeStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}