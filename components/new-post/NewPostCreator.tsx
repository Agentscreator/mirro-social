"use client"

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Video, 
  Upload, 
  Camera, 
  Pause, 
  Play, 
  Square, 
  RotateCcw, 
  Download,
  Sparkles,
  Palette,
  Layers,
  Timer,
  Volume2,
  VolumeX,
  Settings,
  Check,
  X,
  Loader2
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface NewPostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: any) => void;
}

type PostType = 'video-record' | 'video-upload' | 'image-upload';
type VideoDuration = 15 | 30 | 60 | 180; // seconds
type VideoFilter = 'none' | 'vintage' | 'dramatic' | 'bright' | 'warm' | 'cool' | 'noir';
type VideoEffect = 'none' | 'greenscreen' | 'overlay' | 'blur-background' | 'split-screen';

export function NewPostCreator({ isOpen, onClose, onPostCreated }: NewPostCreatorProps) {
  const [postType, setPostType] = useState<PostType | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState<VideoDuration>(60);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Video effects and filters
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>('none');
  const [selectedEffect, setSelectedEffect] = useState<VideoEffect>('none');
  const [showEffects, setShowEffects] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [backgroundBlur, setBackgroundBlur] = useState(5);
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video filters CSS
  const videoFilters = {
    none: 'none',
    vintage: 'sepia(0.5) contrast(1.2) brightness(0.9)',
    dramatic: 'contrast(1.5) saturate(1.3) brightness(0.8)',
    bright: 'brightness(1.2) contrast(1.1) saturate(1.2)',
    warm: 'sepia(0.3) saturate(1.4) hue-rotate(15deg)',
    cool: 'saturate(1.2) hue-rotate(-15deg) brightness(1.1)',
    noir: 'grayscale(1) contrast(1.5) brightness(0.9)'
  };

  // Request camera permission and setup stream
  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          facingMode: "user"
        },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Prevent echo
      }
      setHasPermission(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasPermission(false);
    }
  };

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordedTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 100);
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [maxDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordedTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 100);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    setIsPaused(!isPaused);
  }, [isPaused, maxDuration, stopRecording]);

  // Reset recording
  const resetRecording = () => {
    stopRecording();
    setRecordedTime(0);
    setPreviewUrl(null);
    recordedChunksRef.current = [];
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Apply green screen effect
  const applyGreenScreenEffect = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const processFrame = () => {
      if (!ctx || !video) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      if (selectedEffect === 'greenscreen') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Green screen processing (simplified)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Detect green color (adjust threshold as needed)
          if (g > 100 && r < 100 && b < 100) {
            data[i + 3] = 0; // Make transparent
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      if (isRecording && !isPaused) {
        requestAnimationFrame(processFrame);
      }
    };
    
    if (selectedEffect === 'greenscreen') {
      processFrame();
    }
  }, [selectedEffect, isRecording, isPaused]);

  // Create post
  const handleCreatePost = async () => {
    if (!caption.trim() && !previewUrl) return;
    
    setIsUploading(true);
    try {
      // In a real app, you would upload the video/image to storage
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('type', postType || 'video-record');
      formData.append('filter', selectedFilter);
      formData.append('effect', selectedEffect);
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        formData.append('video', blob, 'recorded-video.webm');
      }
      
      // Mock API call
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const newPost = await response.json();
        onPostCreated?.(newPost);
        handleClose();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Close and cleanup
  const handleClose = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset states
    setPostType(null);
    setCaption("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setRecordedTime(0);
    setIsRecording(false);
    setIsPaused(false);
    setSelectedFilter('none');
    setSelectedEffect('none');
    setShowEffects(false);
    
    onClose();
  };

  // Initialize camera when recording video
  useEffect(() => {
    if (postType === 'video-record' && isOpen) {
      setupCamera();
    }
    
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [postType, isOpen]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto h-[90vh] bg-black text-white border-gray-800">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <DialogTitle className="text-white text-center">
            {postType ? 'Create Post' : 'New Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {!postType ? (
            // Post type selection
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Choose post type</h3>
              
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  className="h-16 border-gray-700 hover:bg-gray-800"
                  onClick={() => setPostType('video-record')}
                >
                  <div className="flex items-center gap-3">
                    <Camera className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-medium">Record Video</div>
                      <div className="text-sm text-gray-400">Create with camera</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 border-gray-700 hover:bg-gray-800"
                  onClick={() => setPostType('video-upload')}
                >
                  <div className="flex items-center gap-3">
                    <Video className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-medium">Upload Video</div>
                      <div className="text-sm text-gray-400">Choose existing video</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-16 border-gray-700 hover:bg-gray-800"
                  onClick={() => setPostType('image-upload')}
                >
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-medium">Upload Image</div>
                      <div className="text-sm text-gray-400">Share a photo</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          ) : postType === 'video-record' ? (
            // Video recording interface
            <div className="space-y-4">
              {/* Camera preview */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[9/16]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ filter: videoFilters[selectedFilter] }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ display: selectedEffect !== 'none' ? 'block' : 'none' }}
                />
                
                {/* Timer overlay */}
                <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
                  <span className="text-white text-sm font-mono">
                    {formatTime(recordedTime)} / {formatTime(maxDuration)}
                  </span>
                </div>
                
                {/* Duration selector */}
                <div className="absolute top-4 right-4 flex gap-1">
                  {[15, 30, 60, 180].map((duration) => (
                    <Button
                      key={duration}
                      size="sm"
                      variant={maxDuration === duration ? "default" : "outline"}
                      className="text-xs h-6 px-2"
                      onClick={() => setMaxDuration(duration as VideoDuration)}
                      disabled={isRecording}
                    >
                      {duration}s
                    </Button>
                  ))}
                </div>
                
                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                  </div>
                )}
              </div>
              
              {/* Effects panel toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEffects(!showEffects)}
                className="w-full border-gray-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Effects & Filters
              </Button>
              
              {/* Effects panel */}
              {showEffects && (
                <Card className="bg-gray-900 border-gray-700">
                  <CardContent className="p-4 space-y-4">
                    {/* Filters */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Filters</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.keys(videoFilters).map((filter) => (
                          <Button
                            key={filter}
                            size="sm"
                            variant={selectedFilter === filter ? "default" : "outline"}
                            className="text-xs h-8"
                            onClick={() => setSelectedFilter(filter as VideoFilter)}
                          >
                            {filter}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Effects */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Effects</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'none', label: 'None' },
                          { key: 'greenscreen', label: 'Green Screen' },
                          { key: 'overlay', label: 'Overlay' },
                          { key: 'blur-background', label: 'Blur BG' }
                        ].map((effect) => (
                          <Button
                            key={effect.key}
                            size="sm"
                            variant={selectedEffect === effect.key ? "default" : "outline"}
                            className="text-xs h-8"
                            onClick={() => setSelectedEffect(effect.key as VideoEffect)}
                          >
                            {effect.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Effect controls */}
                    {selectedEffect === 'overlay' && (
                      <div>
                        <label className="text-sm">Opacity</label>
                        <Slider
                          value={[overlayOpacity]}
                          onValueChange={(value) => setOverlayOpacity(value[0])}
                          max={1}
                          min={0}
                          step={0.1}
                          className="mt-2"
                        />
                      </div>
                    )}
                    
                    {selectedEffect === 'blur-background' && (
                      <div>
                        <label className="text-sm">Blur Amount</label>
                        <Slider
                          value={[backgroundBlur]}
                          onValueChange={(value) => setBackgroundBlur(value[0])}
                          max={20}
                          min={0}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Recording controls */}
              <div className="flex justify-center gap-4">
                {!isRecording && !previewUrl && (
                  <Button
                    size="lg"
                    onClick={startRecording}
                    disabled={!hasPermission}
                    className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16"
                  >
                    <Camera className="w-6 h-6" />
                  </Button>
                )}
                
                {isRecording && (
                  <>
                    <Button
                      size="lg"
                      onClick={togglePause}
                      className="bg-yellow-600 hover:bg-yellow-700 rounded-full w-12 h-12"
                    >
                      {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </Button>
                    
                    <Button
                      size="lg"
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 rounded-full w-12 h-12"
                    >
                      <Square className="w-5 h-5" />
                    </Button>
                  </>
                )}
                
                {previewUrl && (
                  <Button
                    size="lg"
                    onClick={resetRecording}
                    className="bg-gray-600 hover:bg-gray-700 rounded-full w-12 h-12"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                )}
              </div>
              
              {/* Preview video */}
              {previewUrl && (
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[9/16]">
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                    style={{ filter: videoFilters[selectedFilter] }}
                  />
                </div>
              )}
            </div>
          ) : (
            // File upload interface
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={postType === 'video-upload' ? 'video/*' : 'image/*'}
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">
                    Click to upload {postType === 'video-upload' ? 'video' : 'image'}
                  </p>
                </div>
              ) : (
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  {postType === 'video-upload' ? (
                    <video
                      src={previewUrl || undefined}
                      controls
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <img
                      src={previewUrl || undefined}
                      alt="Upload preview"
                      className="w-full aspect-square object-cover"
                    />
                  )}
                  
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Caption input (shown for all post types when file/video is ready) */}
          {(previewUrl || selectedFile) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Caption</label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="bg-gray-900 border-gray-700 text-white resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-gray-700"
          >
            Cancel
          </Button>
          
          {(previewUrl || selectedFile) && (
            <Button
              onClick={handleCreatePost}
              disabled={isUploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}