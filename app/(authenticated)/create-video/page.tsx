'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  Upload, 
  Video, 
  Users, 
  MapPin, 
  Play, 
  Pause,
  X,
  Camera,
  Loader2,
  Check
} from 'lucide-react'

interface VideoUploadData {
  file: File | null
  preview: string | null
  duration: number
}

export default function CreateVideoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Video upload state
  const [videoData, setVideoData] = useState<VideoUploadData>({
    file: null,
    preview: null,
    duration: 0
  })
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Form state
  const [description, setDescription] = useState('')
  const [enableInvites, setEnableInvites] = useState(true)
  const [inviteDescription, setInviteDescription] = useState('')
  const [communityName, setCommunityName] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(999999) // Unlimited participants
  const [hasLocation, setHasLocation] = useState(false)
  const [locationName, setLocationName] = useState('')
  
  // UI state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleVideoSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video must be less than 100MB",
        variant: "destructive",
      })
      return
    }

    const preview = URL.createObjectURL(file)
    
    // Get video duration
    const video = document.createElement('video')
    video.src = preview
    video.onloadedmetadata = () => {
      setVideoData({
        file,
        preview,
        duration: Math.round(video.duration)
      })
    }
  }, [])

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const removeVideo = () => {
    if (videoData.preview) {
      URL.revokeObjectURL(videoData.preview)
    }
    setVideoData({ file: null, preview: null, duration: 0 })
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const generateCommunityName = () => {
    if (description.trim()) {
      // Extract first few words from description
      const words = description.trim().split(' ').slice(0, 3)
      const generatedName = words.join(' ') + ' Community'
      setCommunityName(generatedName)
    } else {
      setCommunityName('My Community')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!videoData.file) {
      toast({
        title: "Video required",
        description: "Please select a video to upload",
        variant: "destructive",
      })
      return
    }

    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please add a description for your video",
        variant: "destructive",
      })
      return
    }

    if (enableInvites && !inviteDescription.trim()) {
      toast({
        title: "Invite description required",
        description: "Please describe what you're inviting people to do",
        variant: "destructive",
      })
      return
    }

    if (enableInvites && !communityName.trim()) {
      toast({
        title: "Community name required",
        description: "Please provide a name for your community",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('media', videoData.file)
      formData.append('content', description.trim())
      formData.append('isInvite', enableInvites.toString())
      
      if (enableInvites) {
        formData.append('inviteDescription', inviteDescription.trim())
        formData.append('inviteLimit', maxParticipants.toString())
        formData.append('autoAcceptInvites', 'true') // Always auto-accept for communities
        
        if (communityName.trim()) {
          formData.append('groupName', communityName.trim()) // Keep same field name for API compatibility
        }
      }

      if (hasLocation && locationName.trim()) {
        formData.append('hasPrivateLocation', 'true')
        formData.append('locationName', locationName.trim())
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 200)

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create post')
      }

      const result = await response.json()
      
      toast({
        title: "Video posted successfully!",
        description: enableInvites 
          ? "Your video invite is now live. People can request to join!"
          : "Your video is now live on your feed",
      })

      // Trigger feed refresh
      window.dispatchEvent(new CustomEvent('postCreated'))
      
      // Navigate back to feed
      router.push('/feed')
      
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Create Video</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Video Upload Section */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            {!videoData.preview ? (
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Upload your video</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Select a video file to get started
                  </p>
                  <Button className="bg-white text-black hover:bg-gray-200">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Video
                  </Button>
                </div>
                
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Camera className="h-4 w-4" />
                    <span>Or record with camera</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoData.preview}
                    className="w-full h-full object-cover"
                    loop
                    muted
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  
                  {/* Play/Pause Overlay */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={handleVideoPlay}
                  >
                    <div className="bg-black/50 rounded-full p-3">
                      {isPlaying ? (
                        <Pause className="h-8 w-8 text-white" />
                      ) : (
                        <Play className="h-8 w-8 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={removeVideo}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Duration Badge */}
                  <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                    {videoData.duration}s
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Different Video
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <Label className="text-base font-medium">Description</Label>
            <Textarea
              placeholder="Describe your video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
              maxLength={500}
            />
            <div className="text-right text-sm text-gray-400">
              {description.length}/500
            </div>
          </CardContent>
        </Card>

        {/* Invite Settings */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Invites</Label>
                <p className="text-sm text-gray-400">Let people request to join your activity</p>
              </div>
              <Switch
                checked={enableInvites}
                onCheckedChange={setEnableInvites}
              />
            </div>

            {enableInvites && (
              <div className="space-y-4 pt-4 border-t border-gray-700">
                <div>
                  <Label className="text-sm font-medium">What are you inviting people to do?</Label>
                  <Textarea
                    placeholder="e.g., Join me for a coffee meetup, Come hiking with me, Let's play basketball..."
                    value={inviteDescription}
                    onChange={(e) => setInviteDescription(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white mt-2"
                    maxLength={200}
                  />
                  <div className="text-right text-sm text-gray-400 mt-1">
                    {inviteDescription.length}/200
                  </div>
                </div>

                {/* Max Participants removed - unlimited participants allowed */}

                {/* Community Creation */}
                <div className="space-y-4 pt-4 border-t border-gray-700">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Community Name</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateCommunityName}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Generate
                      </Button>
                    </div>
                    <Input
                      placeholder="Name your community..."
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      People who join will be added to this community chat
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Settings */}
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Add Location</Label>
                <p className="text-sm text-gray-400">Share where this activity will happen</p>
              </div>
              <Switch
                checked={hasLocation}
                onCheckedChange={setHasLocation}
              />
            </div>

            {hasLocation && (
              <div className="pt-4 border-t border-gray-700">
                <Label className="text-sm font-medium">Location Name</Label>
                <div className="relative mt-2">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="e.g., Central Park, Starbucks Downtown..."
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white pl-10"
                    maxLength={100}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="pb-8">
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !videoData.file}
            className="w-full bg-white text-black hover:bg-gray-200 h-12 text-base font-medium"
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading... {Math.round(uploadProgress)}%</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4" />
                <span>Post Video</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
              <div>
                <p className="text-white font-medium">Uploading your video...</p>
                <p className="text-gray-400 text-sm">This may take a moment</p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">{Math.round(uploadProgress)}% complete</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}