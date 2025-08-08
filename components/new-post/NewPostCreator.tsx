"use client"

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Upload, 
  Camera, 
  Pause, 
  Play, 
  Square, 
  RotateCcw, 
  Check,
  X,
  Loader2,
  Users,
  Music,
  Sparkles,
  Palette,
  Layers,
  Volume2,
  VolumeX,
  Timer,
  FlipHorizontal,
  Zap,
  Image as ImageIcon,
  Mic,
  MicOff,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface NewPostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: any) => void;
}

type CreationStep = 'upload' | 'edit' | 'effects' | 'audio' | 'details';
type VideoFilter = 'none' | 'vintage' | 'dramatic' | 'bright' | 'warm' | 'cool' | 'noir' | 'bw' | 'sepia' | 'vibrant';
type VideoEffect = 'none' | 'greenscreen' | 'blur-bg' | 'split-screen' | 'overlay' | 'zoom' | 'shake';
type AudioTrack = {
  id: string;
  name: string;
  artist: string;
  duration: number;
  url: string;
  thumbnail?: string;
};

export function NewPostCreator({ isOpen, onClose, onPostCreated }: NewPostCreatorProps) {
  // Main state
  const [currentStep, setCurrentStep] = useState<CreationStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [maxDuration, setMaxDuration] = useState(60);
  const [isMuted, setIsMuted] = useState(false);
  
  // Effects and filters
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>('none');
  const [selectedEffect, setSelectedEffect] = useState<VideoEffect>('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  
  // Audio
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [audioVolume, setAudioVolume] = useState(50);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(100);
  
  // Auto-accept group (all posts are invites now)
  const [autoAcceptInvites, setAutoAcceptInvites] = useState(false);
  const [groupName, setGroupName] = useState("");
  
  // Invite limit (all posts are invites)
  const [inviteLimit, setInviteLimit] = useState(10);
  const [isUnlimitedInvites, setIsUnlimitedInvites] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample audio tracks (in real app, these would come from an API)
  const audioTracks: AudioTrack[] = [
    { id: '1', name: 'Original Audio', artist: 'Your Video', duration: 30, url: '' },
    { id: '2', name: 'Chill Vibes', artist: 'Lo-Fi Beats', duration: 180, url: '/audio/chill.mp3' },
    { id: '3', name: 'Upbeat Energy', artist: 'Pop Mix', duration: 120, url: '/audio/upbeat.mp3' },
    { id: '4', name: 'Trending Sound', artist: 'Viral Audio', duration: 15, url: '/audio/trending.mp3' },
  ];

  // Video filters
  const videoFilters = {
    none: 'none',
    vintage: 'sepia(0.5) contrast(1.2) brightness(0.9)',
    dramatic: 'contrast(1.5) saturate(1.3) brightness(0.8)',
    bright: 'brightness(1.2) contrast(1.1) saturate(1.2)',
    warm: 'sepia(0.3) saturate(1.4) hue-rotate(15deg)',
    cool: 'saturate(1.2) hue-rotate(-15deg) brightness(1.1)',
    noir: 'grayscale(1) contrast(1.5) brightness(0.9)',
    bw: 'grayscale(1)',
    sepia: 'sepia(1)',
    vibrant: 'saturate(2) contrast(1.2)'
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCurrentStep('edit');
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Create post
  const handleCreatePost = async () => {
    if (!selectedFile && !previewUrl) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('content', caption);
      
      if (selectedFile) {
        formData.append('media', selectedFile);
      } else if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        formData.append('media', blob, 'recorded-video.webm');
      }

      // All posts are invites now, add invite data
      formData.append('isInvite', 'true');
      formData.append('inviteLimit', isUnlimitedInvites ? '-1' : inviteLimit.toString());
      
      // Add auto-accept group data
      if (autoAcceptInvites && groupName.trim()) {
        formData.append('autoAcceptInvites', 'true');
        formData.append('groupName', groupName.trim());
      }
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const newPost = await response.json();
        onPostCreated?.(newPost);
        handleClose();
      } else {
        throw new Error(`Failed to create post: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Close and cleanup
  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset all states
    setCurrentStep('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setSelectedFilter('none');
    setSelectedEffect('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setSelectedAudio(null);
    setAutoAcceptInvites(false);
    setGroupName("");
    setInviteLimit(10);
    setIsUnlimitedInvites(false);
    setIsRecording(false);
    setIsPaused(false);
    setRecordedTime(0);
    
    onClose();
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-8 shadow-2xl">
        <Upload className="w-12 h-12 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-3">Select Video to Upload</h2>
      <p className="text-gray-400 text-center mb-8 leading-relaxed">
        Choose a video from your device to create an<br />
        amazing post with editing tools and sounds
      </p>
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
      >
        Choose Video
      </Button>
      
      <p className="text-gray-500 text-sm mt-4">Max file size: 100MB</p>
    </div>
  );

  // Render edit step
  const renderEditStep = () => (
    <div className="flex flex-col h-full">
      {/* Video Preview */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {previewUrl && (
          <video
            src={previewUrl}
            className="w-full h-full object-cover"
            style={{
              filter: `${videoFilters[selectedFilter]} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
            }}
            controls
            muted={isMuted}
          />
        )}
        
        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentStep('upload')}
            className="bg-black/50 text-white rounded-full backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="bg-black/50 text-white rounded-full backdrop-blur-sm"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Bottom Tools */}
      <div className="bg-gray-900 p-4 space-y-4 flex-shrink-0 max-h-80 overflow-y-auto">
        {/* Tool Tabs */}
        <div className="flex justify-center gap-1 bg-gray-800 rounded-full p-1">
          <Button
            variant={currentStep === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentStep('edit')}
            className="rounded-full px-6"
          >
            <Palette className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant={currentStep === 'effects' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentStep('effects')}
            className="rounded-full px-6"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Effects
          </Button>
          <Button
            variant={currentStep === 'audio' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentStep('audio')}
            className="rounded-full px-6"
          >
            <Music className="w-4 h-4 mr-2" />
            Audio
          </Button>
        </div>
        
        {/* Filter Options */}
        {currentStep === 'edit' && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {Object.keys(videoFilters).map((filter) => (
                <Button
                  key={filter}
                  variant={selectedFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter(filter as VideoFilter)}
                  className="text-xs h-8 capitalize"
                >
                  {filter}
                </Button>
              ))}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Brightness</span>
                <span className="text-sm text-gray-400">{brightness}%</span>
              </div>
              <Slider
                value={[brightness]}
                onValueChange={(value) => setBrightness(value[0])}
                max={200}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Contrast</span>
                <span className="text-sm text-gray-400">{contrast}%</span>
              </div>
              <Slider
                value={[contrast]}
                onValueChange={(value) => setContrast(value[0])}
                max={200}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Saturation</span>
                <span className="text-sm text-gray-400">{saturation}%</span>
              </div>
              <Slider
                value={[saturation]}
                onValueChange={(value) => setSaturation(value[0])}
                max={200}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        )}
        
        {/* Effects Options */}
        {currentStep === 'effects' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'none', label: 'None', icon: X },
                { key: 'greenscreen', label: 'Green Screen', icon: Layers },
                { key: 'blur-bg', label: 'Blur Background', icon: ImageIcon },
                { key: 'split-screen', label: 'Split Screen', icon: FlipHorizontal },
              ].map((effect) => (
                <Button
                  key={effect.key}
                  variant={selectedEffect === effect.key ? 'default' : 'outline'}
                  onClick={() => setSelectedEffect(effect.key as VideoEffect)}
                  className="h-16 flex flex-col items-center gap-1"
                >
                  <effect.icon className="w-5 h-5" />
                  <span className="text-xs">{effect.label}</span>
                </Button>
              ))}
            </div>
            
            {selectedEffect !== 'none' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Effect Intensity</span>
                  <span className="text-sm text-gray-400">{blur}px</span>
                </div>
                <Slider
                  value={[blur]}
                  onValueChange={(value) => setBlur(value[0])}
                  max={20}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
        
        {/* Audio Options */}
        {currentStep === 'audio' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {audioTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => setSelectedAudio(track)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAudio?.id === track.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{track.name}</p>
                        <p className="text-gray-400 text-xs">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-gray-400 text-xs">{formatTime(track.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedAudio && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Audio Volume</span>
                  <span className="text-sm text-gray-400">{audioVolume}%</span>
                </div>
                <Slider
                  value={[audioVolume]}
                  onValueChange={(value) => setAudioVolume(value[0])}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Original Audio</span>
                  <span className="text-sm text-gray-400">{originalAudioVolume}%</span>
                </div>
                <Slider
                  value={[originalAudioVolume]}
                  onValueChange={(value) => setOriginalAudioVolume(value[0])}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
        
        {/* Next Button */}
        <Button
          onClick={() => setCurrentStep('details')}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-full font-semibold"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render details step
  const renderDetailsStep = () => (
    <div className="flex flex-col h-full">
      {/* Video Preview */}
      <div className="h-48 md:h-64 relative bg-black overflow-hidden flex-shrink-0">
        {previewUrl && (
          <video
            src={previewUrl}
            className="w-full h-full object-cover"
            style={{
              filter: `${videoFilters[selectedFilter]} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
            }}
            muted
            loop
            autoPlay
          />
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentStep('edit')}
          className="absolute top-4 left-4 bg-black/50 text-white rounded-full backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Details Form */}
      <div className="flex-1 bg-gray-900 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <label className="text-white font-medium">Describe your invitation</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What are you inviting people to do? Be creative and engaging..."
            className="bg-gray-800 border-gray-700 text-white resize-none min-h-[100px] rounded-xl"
            rows={4}
          />
          <p className="text-gray-400 text-xs">{caption.length}/2200</p>
        </div>

        {/* Invite Limit */}
        <div className="space-y-4 p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Participant Limit</p>
                <p className="text-gray-400 text-sm">Set how many people can join</p>
              </div>
            </div>
            <Switch
              checked={isUnlimitedInvites}
              onCheckedChange={setIsUnlimitedInvites}
            />
          </div>
          
          {!isUnlimitedInvites ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Maximum participants</span>
                <span className="text-sm text-gray-400">{inviteLimit}</span>
              </div>
              <Slider
                value={[inviteLimit]}
                onValueChange={(value) => setInviteLimit(value[0])}
                max={100}
                min={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>2</span>
                <span>100</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-400 text-sm font-medium">Unlimited participants</p>
              <p className="text-green-300/70 text-xs">Anyone can join your invitation</p>
            </div>
          )}
        </div>

        {/* Auto-Accept Group */}
        <div className="space-y-4 p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Auto-Accept to Group</p>
                <p className="text-gray-400 text-sm">Create instant group chats</p>
              </div>
            </div>
            <Switch
              checked={autoAcceptInvites}
              onCheckedChange={setAutoAcceptInvites}
            />
          </div>
          
          {autoAcceptInvites && (
            <div className="space-y-2">
              <Input
                placeholder="Group name (e.g., 'Beach Volleyball Squad')"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white rounded-lg"
                required
              />
              <p className="text-gray-400 text-xs">
                People who accept your invite will automatically join this group chat
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Post Button */}
      <div className="p-4 md:p-6 bg-gray-900 border-t border-gray-800 flex-shrink-0">
        <Button
          onClick={handleCreatePost}
          disabled={isUploading || !caption.trim() || (autoAcceptInvites && !groupName.trim())}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white py-3 md:py-4 rounded-full font-bold text-base md:text-lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
              Creating Invitation...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Share Invitation
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto h-[100vh] md:h-[90vh] bg-black text-white border-none p-0 flex flex-col md:rounded-3xl">
        {/* Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 z-50 flex bg-black/80 backdrop-blur-sm md:rounded-t-3xl">
          {['upload', 'edit', 'details'].map((step, index) => (
            <div
              key={step}
              className={`flex-1 h-1 ${
                currentStep === step || 
                (['upload', 'edit', 'effects', 'audio'].indexOf(currentStep) > index)
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
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
          {(currentStep === 'edit' || currentStep === 'effects' || currentStep === 'audio') && renderEditStep()}
          {currentStep === 'details' && renderDetailsStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}