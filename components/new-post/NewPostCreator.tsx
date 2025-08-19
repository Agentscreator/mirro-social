"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2, Video, Image as ImageIcon, Camera, Calendar, Clock, MapPin } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { TikTokVideoCreator } from "@/components/tiktok-video-creator/TikTokVideoCreator"

interface NewPostCreatorProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: (post: any) => void
}

export function NewPostCreator({ isOpen, onClose, onPostCreated }: NewPostCreatorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Event-related state
  const [isEvent, setIsEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [eventEndTime, setEventEndTime] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [maxParticipants, setMaxParticipants] = useState(50)

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image or video file",
          variant: "destructive",
        })
        return
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  // Handle camera recording completion
  const handleVideoRecorded = (videoBlob: Blob, thumbnail: string) => {
    // Convert blob to file
    const file = new File([videoBlob], 'recorded-video.webm', { type: 'video/webm' })
    setSelectedFile(file)
    setPreviewUrl(thumbnail)
    setShowCamera(false)
    
    toast({
      title: "Video recorded!",
      description: "Your video is ready to post",
    })
  }

  // Handle camera cancel
  const handleCameraCancel = () => {
    setShowCamera(false)
  }

  // Create post
  const handleCreatePost = async () => {
    if (!caption.trim() && !selectedFile) {
      toast({
        title: "Content required",
        description: "Please add some text or upload a file",
        variant: "destructive",
      })
      return
    }

    // Validate event fields if creating an event
    if (isEvent) {
      if (!eventTitle.trim()) {
        toast({
          title: "Event title required",
          description: "Please enter a title for your event",
          variant: "destructive",
        })
        return
      }

      if (!eventDate || !eventTime) {
        toast({
          title: "Event time required",
          description: "Please select a date and time for your event",
          variant: "destructive",
        })
        return
      }

      // Check if event is in the future
      const eventDateTime = new Date(`${eventDate}T${eventTime}`)
      if (eventDateTime <= new Date()) {
        toast({
          title: "Invalid event time",
          description: "Event must be scheduled for a future time",
          variant: "destructive",
        })
        return
      }
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('content', caption.trim())
      
      if (selectedFile) {
        formData.append('media', selectedFile)
      }

      // Add event data if creating an event
      if (isEvent) {
        formData.append('isEvent', 'true')
        formData.append('eventTitle', eventTitle.trim())
        formData.append('eventDescription', eventDescription.trim())
        formData.append('eventDate', eventDate)
        formData.append('eventTime', eventTime)
        if (eventEndTime) formData.append('eventEndTime', eventEndTime)
        if (eventLocation.trim()) formData.append('eventLocation', eventLocation.trim())
        formData.append('maxParticipants', maxParticipants.toString())
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Success!",
          description: "Your post has been created",
        })
        
        // Clear form
        setCaption("")
        setSelectedFile(null)
        setPreviewUrl(null)
        
        // Notify parent and close
        onPostCreated?.(result.post)
        onClose()
        
        // Refresh feed
        window.dispatchEvent(new CustomEvent('feedRefresh'))
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create post",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Close and cleanup
  const handleClose = () => {
    setCaption("")
    setSelectedFile(null)
    setPreviewUrl(null)
    setIsUploading(false)
    setShowCamera(false)
    
    // Reset event fields
    setIsEvent(false)
    setEventTitle("")
    setEventDescription("")
    setEventDate("")
    setEventTime("")
    setEventEndTime("")
    setEventLocation("")
    setMaxParticipants(50)
    
    onClose()
  }

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full max-w-lg mx-auto bg-gray-900 text-white border-gray-700 p-0">
          <DialogTitle className="sr-only">Create New Post</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create Post</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Media Preview */}
          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden bg-black">
              {selectedFile?.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  className="w-full h-48 object-cover"
                  controls
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={removeFile}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Caption Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              What's on your mind?
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your thoughts..."
              className="min-h-[100px] bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              maxLength={2000}
            />
            <div className="text-xs text-gray-400 text-right">
              {caption.length}/2000
            </div>
          </div>

          {/* Event Toggle */}
          <div className="flex items-center space-x-2 p-4 bg-gray-800 rounded-lg">
            <Switch
              id="event-mode"
              checked={isEvent}
              onCheckedChange={setIsEvent}
            />
            <Label htmlFor="event-mode" className="text-white font-medium">
              <Calendar className="w-4 h-4 inline mr-2" />
              Create Live Event
            </Label>
          </div>

          {/* Event Details (shown when isEvent is true) */}
          {isEvent && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Event Details
                </h3>
              </div>
              
              {/* Auto-activation info */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div className="text-sm text-blue-100">
                    <p className="font-medium mb-1">Automatic Event Activation</p>
                    <p className="text-blue-200">Your event will automatically appear in the Live Events tab when the scheduled time is reached. People can join and participate once it goes live!</p>
                  </div>
                </div>
              </div>

              {/* Event Title */}
              <div className="space-y-2">
                <Label htmlFor="event-title" className="text-sm font-medium text-white">
                  Event Title *
                </Label>
                <Input
                  id="event-title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="What's your event about?"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={200}
                />
              </div>

              {/* Event Description */}
              <div className="space-y-2">
                <Label htmlFor="event-description" className="text-sm font-medium text-white">
                  Event Description
                </Label>
                <Textarea
                  id="event-description"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Tell people more about your event..."
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={500}
                  rows={3}
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date" className="text-sm font-medium text-white">
                    Date *
                  </Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time" className="text-sm font-medium text-white">
                    Start Time *
                  </Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* End Time (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="event-end-time" className="text-sm font-medium text-white">
                  End Time (Optional)
                </Label>
                <Input
                  id="event-end-time"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="event-location" className="text-sm font-medium text-white">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location (Optional)
                </Label>
                <Input
                  id="event-location"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Where is your event?"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={200}
                />
              </div>

              {/* Max Participants */}
              <div className="space-y-2">
                <Label htmlFor="max-participants" className="text-sm font-medium text-white">
                  Max Participants
                </Label>
                <Input
                  id="max-participants"
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="1000"
                  className="bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {!selectedFile && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-gray-600 text-white hover:bg-gray-800"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Photo or Video
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  className="w-full border-gray-600 text-white hover:bg-gray-800"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Record with Camera
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-600 text-white hover:bg-gray-800"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={isUploading || (!caption.trim() && !selectedFile)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Share Post"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Camera Recording Interface */}
    {showCamera && (
      <TikTokVideoCreator
        onVideoCreated={handleVideoRecorded}
        onCancel={handleCameraCancel}
      />
    )}
    </>
  )
}