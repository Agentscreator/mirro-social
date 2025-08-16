"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Upload, Play, Pause, Volume2, VolumeX, Scissors, Palette, Users, Sparkles, Music, Filter, LightbulbIcon as Brightness, Contrast, Droplets, CloudyIcon as Blur, X, Check } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface VideoCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreatePost: (data: {
    video: File
    description: string
    isInvite: boolean
    inviteLimit?: number
    sound?: string
    filters: {
      brightness: number
      contrast: number
      saturation: number
      blur: number
    }
  }) => Promise<void>
}

const PRESET_SOUNDS = [
  { id: "trending1", name: "Trending Beat #1", duration: "0:30", category: "Trending" },
  { id: "trending2", name: "Viral Sound", duration: "0:15", category: "Trending" },
  { id: "chill1", name: "Chill Vibes", duration: "1:00", category: "Chill" },
  { id: "upbeat1", name: "Upbeat Energy", duration: "0:45", category: "Upbeat" },
  { id: "acoustic1", name: "Acoustic Guitar", duration: "0:30", category: "Acoustic" },
  { id: "electronic1", name: "Electronic Drop", duration: "0:20", category: "Electronic" },
]

const FILTER_PRESETS = [
  { name: "Original", filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0 } },
  { name: "Vibrant", filters: { brightness: 110, contrast: 120, saturation: 130, blur: 0 } },
  { name: "Vintage", filters: { brightness: 95, contrast: 110, saturation: 80, blur: 0 } },
  { name: "Soft", filters: { brightness: 105, contrast: 90, saturation: 95, blur: 1 } },
  { name: "Dramatic", filters: { brightness: 90, contrast: 140, saturation: 110, blur: 0 } },
  { name: "Cool", filters: { brightness: 100, contrast: 105, saturation: 85, blur: 0 } },
]

export function VideoCreationDialog({ open, onOpenChange, onCreatePost }: VideoCreationDialogProps) {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [isInviteMode, setIsInviteMode] = useState(true)
  const [inviteLimit, setInviteLimit] = useState(999999) // Unlimited participants
  const [videoDescription, setVideoDescription] = useState("")
  const [selectedSound, setSelectedSound] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<"upload" | "edit" | "sound" | "details">("upload")
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [videoFilters, setVideoFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  })
  const [isCreating, setIsCreating] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Error",
        description: "Please select a video file.",
        variant: "destructive",
      })
      return
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast({
        title: "Error",
        description: "Video file too large. Maximum size is 100MB.",
        variant: "destructive",
      })
      return
    }

    setSelectedVideo(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setVideoPreview(reader.result as string)
      setCurrentStep("edit")
    }
    reader.readAsDataURL(file)
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const applyFilterPreset = (preset: typeof FILTER_PRESETS[0]) => {
    setVideoFilters(preset.filters)
  }

  const handleCreate = async () => {
    if (!selectedVideo) return

    try {
      setIsCreating(true)
      await onCreatePost({
        video: selectedVideo,
        description: videoDescription,
        isInvite: isInviteMode,
        inviteLimit: isInviteMode ? inviteLimit : undefined,
        sound: selectedSound || undefined,
        filters: videoFilters
      })
      
      // Reset form
      setSelectedVideo(null)
      setVideoPreview(null)
      setIsInviteMode(true)
      setInviteLimit(999999)
      setVideoDescription("")
      setSelectedSound(null)
      setCurrentStep("upload")
      setVideoFilters({ brightness: 100, contrast: 100, saturation: 100, blur: 0 })
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const getVideoStyle = () => ({
    filter: `brightness(${videoFilters.brightness}%) contrast(${videoFilters.contrast}%) saturate(${videoFilters.saturation}%) blur(${videoFilters.blur}px)`
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] h-[100vh] max-w-none max-h-none p-0 bg-black border-none rounded-none sm:w-[95vw] sm:h-[95vh] sm:max-w-4xl sm:rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Video Post</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            {["upload", "edit", "sound", "details"].map((step, index) => (
              <div
                key={step}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentStep === step ? "bg-blue-500" : 
                  ["upload", "edit", "sound", "details"].indexOf(currentStep) > index ? "bg-white/50" : "bg-white/20"
                )}
              />
            ))}
          </div>

          <Button
            onClick={() => {
              if (currentStep === "upload") return
              if (currentStep === "edit") setCurrentStep("sound")
              if (currentStep === "sound") setCurrentStep("details")
              if (currentStep === "details") handleCreate()
            }}
            disabled={!selectedVideo || (currentStep === "details" && isCreating)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </div>
            ) : currentStep === "details" ? "Share" : "Next"}
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {currentStep === "upload" && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Select Video to Upload</h2>
              <p className="text-white/70 mb-8 max-w-md">
                Choose a video from your device to create an amazing post with editing tools and sounds
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-3 text-lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Choose Video
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
              <p className="text-white/50 text-sm mt-4">Max file size: 100MB</p>
            </div>
          )}

          {/* Edit Step */}
          {currentStep === "edit" && videoPreview && (
            <div className="h-full flex flex-col sm:flex-row">
              {/* Video Preview */}
              <div className="flex-1 relative bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoPreview}
                  className="max-h-full max-w-full object-contain"
                  style={getVideoStyle()}
                  loop
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Video Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="bg-black/50 text-white hover:bg-black/70 rounded-full"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="bg-black/50 text-white hover:bg-black/70 rounded-full"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {/* Editing Tools */}
              <div className="w-full sm:w-80 bg-gray-900 p-4 overflow-y-auto">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Video Filters
                </h3>

                {/* Filter Presets */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {FILTER_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => applyFilterPreset(preset)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>

                {/* Manual Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Brightness className="h-4 w-4" />
                      Brightness: {videoFilters.brightness}%
                    </Label>
                    <Slider
                      value={[videoFilters.brightness]}
                      onValueChange={([value]) => setVideoFilters(prev => ({ ...prev, brightness: value }))}
                      min={50}
                      max={150}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Contrast className="h-4 w-4" />
                      Contrast: {videoFilters.contrast}%
                    </Label>
                    <Slider
                      value={[videoFilters.contrast]}
                      onValueChange={([value]) => setVideoFilters(prev => ({ ...prev, contrast: value }))}
                      min={50}
                      max={200}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Droplets className="h-4 w-4" />
                      Saturation: {videoFilters.saturation}%
                    </Label>
                    <Slider
                      value={[videoFilters.saturation]}
                      onValueChange={([value]) => setVideoFilters(prev => ({ ...prev, saturation: value }))}
                      min={0}
                      max={200}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Blur className="h-4 w-4" />
                      Blur: {videoFilters.blur}px
                    </Label>
                    <Slider
                      value={[videoFilters.blur]}
                      onValueChange={([value]) => setVideoFilters(prev => ({ ...prev, blur: value }))}
                      min={0}
                      max={10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sound Step */}
          {currentStep === "sound" && (
            <div className="h-full flex flex-col sm:flex-row">
              {/* Video Preview */}
              <div className="flex-1 relative bg-black flex items-center justify-center">
                <video
                  src={videoPreview!}
                  className="max-h-full max-w-full object-contain"
                  style={getVideoStyle()}
                  loop
                  autoPlay
                  muted={!selectedSound}
                />
              </div>

              {/* Sound Selection */}
              <div className="w-full sm:w-80 bg-gray-900 p-4 overflow-y-auto">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Add Sound
                </h3>

                <div className="space-y-3">
                  <Button
                    variant={!selectedSound ? "default" : "outline"}
                    onClick={() => setSelectedSound(null)}
                    className="w-full justify-start text-left"
                  >
                    <VolumeX className="h-4 w-4 mr-2" />
                    Original Audio
                  </Button>

                  {PRESET_SOUNDS.map((sound) => (
                    <Button
                      key={sound.id}
                      variant={selectedSound === sound.id ? "default" : "outline"}
                      onClick={() => setSelectedSound(sound.id)}
                      className="w-full justify-start text-left"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{sound.name}</div>
                            <div className="text-xs text-gray-400">{sound.category}</div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{sound.duration}</span>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="mt-6 p-3 bg-blue-600/20 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">Pro Tip</span>
                  </div>
                  <p className="text-xs text-blue-300">
                    Trending sounds can help your video reach more people!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Details Step */}
          {currentStep === "details" && (
            <div className="h-full flex flex-col sm:flex-row">
              {/* Video Preview */}
              <div className="flex-1 relative bg-black flex items-center justify-center">
                <video
                  src={videoPreview!}
                  className="max-h-full max-w-full object-contain"
                  style={getVideoStyle()}
                  loop
                  autoPlay
                  muted={!selectedSound}
                />
              </div>

              {/* Details Form */}
              <div className="w-full sm:w-80 bg-gray-900 p-4 overflow-y-auto">
                <h3 className="text-white font-semibold mb-4">Post Details</h3>

                <div className="space-y-4">
                  {/* Invite Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="text-white font-medium">Create Invite</div>
                        <div className="text-xs text-gray-400">Let others join your video</div>
                      </div>
                    </div>
                    <Switch
                      checked={isInviteMode}
                      onCheckedChange={setIsInviteMode}
                    />
                  </div>

                  {/* Invite Limit removed - unlimited participants allowed */}

                  {/* Description */}
                  <div>
                    <Label className="text-white mb-2 block">
                      {isInviteMode ? "Provide a description for your invitation" : "Description"}
                    </Label>
                    <Textarea
                      value={videoDescription}
                      onChange={(e) => setVideoDescription(e.target.value.slice(0, 500))}
                      placeholder={isInviteMode ? "Describe what you're inviting people to do..." : "What's this video about?"}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 resize-none"
                      rows={4}
                    />
                    <div className="text-xs text-gray-400 mt-1 text-right">
                      {videoDescription.length}/500
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Summary</h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      <div>Type: {isInviteMode ? "Video Invite" : "Regular Post"}</div>
                      {isInviteMode && <div>Participants: Unlimited</div>}
                      <div>Sound: {selectedSound ? PRESET_SOUNDS.find(s => s.id === selectedSound)?.name : "Original"}</div>
                      <div>Filters: Applied</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
