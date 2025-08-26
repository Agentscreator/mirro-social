'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Camera, 
  CameraOff, 
  RotateCw, 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Download,
  Type,
  Sticker,
  Palette,
  Sparkles,
  Timer,
  Zap,
  ZapOff,
  Music,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { checkAndroidPermissions, requestAndroidPermissions } from '@/src/lib/android-utils';

interface TikTokVideoCreatorProps {
  onVideoCreated: (videoBlob: Blob, thumbnail: string) => void;
  onCancel: () => void;
}

interface FilterOption {
  id: string;
  name: string;
  css: string;
}

interface TimerOption {
  value: number;
  label: string;
}

const filters: FilterOption[] = [
  { id: 'none', name: 'Original', css: '' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.5) contrast(1.2)' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.5) contrast(1.1)' },
  { id: 'cool', name: 'Cool', css: 'hue-rotate(180deg) saturate(1.2)' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.3) saturate(1.3)' },
  { id: 'bw', name: 'B&W', css: 'grayscale(1)' },
  { id: 'dramatic', name: 'Dramatic', css: 'contrast(1.5) brightness(0.9)' },
];

const timerOptions: TimerOption[] = [
  { value: 0, label: 'Off' },
  { value: 3, label: '3s' },
  { value: 10, label: '10s' },
];

export function TikTokVideoCreator({ onVideoCreated, onCancel }: TikTokVideoCreatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(filters[0]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [maxDuration] = useState(60); // 60 seconds max like TikTok
  const [timer, setTimer] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      // Check if we're on a native platform
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        console.log('🚀 Running on native platform, checking Capacitor permissions...');
        
        try {
          // Always request permissions directly on native platforms
          const { Camera } = await import('@capacitor/camera');
          console.log('📱 Capacitor Camera plugin loaded, requesting permissions...');
          
          // First check current permissions
          const currentPerms = await Camera.checkPermissions();
          console.log('Current camera permissions:', currentPerms);
          
          // If already granted, proceed
          if (currentPerms.camera === 'granted') {
            console.log('✅ Camera permission already granted!');
          } else {
            // Request permissions
            console.log('🔑 Requesting camera permissions...');
            const permissions = await Camera.requestPermissions();
            console.log('Camera permission request result:', permissions);
            
            if (permissions.camera === 'denied' || permissions.camera === 'restricted') {
              console.log('❌ Camera permission denied/restricted');
              setPermissionDenied(true);
              return;
            }
            
            if (permissions.camera !== 'granted') {
              console.log('❌ Camera permission not granted, received:', permissions.camera);
              setPermissionDenied(true);
              return;
            }
            
            console.log('✅ Camera permission granted!');
          }
        } catch (permError) {
          console.error('❌ Error with native camera permissions:', permError);
          console.log('Falling back to getUserMedia...');
          
          // For native apps, show a more explicit error message
          if (isNativeApp()) {
            setPermissionDenied(true);
            return;
          }
          // Continue to try getUserMedia as fallback for web
        }
      } else {
        // Web browser permission handling
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert('Camera is not supported in this browser.');
          return;
        }

        // Check current permissions
        if (navigator.permissions) {
          try {
            const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            
            console.log('Camera permission:', cameraPermission.state);
            console.log('Microphone permission:', microphonePermission.state);
            
            if (cameraPermission.state === 'denied') {
              setPermissionDenied(true);
              return;
            }
          } catch (permError) {
            console.log('Permission check not supported, proceeding with getUserMedia');
          }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          facingMode: facingMode
        },
        audio: audioEnabled
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setCameraReady(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionDenied(true);
        } else if (error.name === 'NotFoundError') {
          alert('No camera found on this device.');
        } else if (error.name === 'NotReadableError') {
          alert('Camera is being used by another application.');
        } else {
          alert(`Camera error: ${error.message}`);
        }
      } else {
        alert('Unable to access camera. Please check permissions.');
      }
    }
  }, [facingMode, audioEnabled]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Flip camera
  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Retry camera access
  const retryCamera = useCallback(async () => {
    console.log('🔄 Retrying camera access...');
    setPermissionDenied(false);
    
    // If native platform, request permissions directly
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('🔄 Requesting native camera permissions directly...');
        const { Camera } = await import('@capacitor/camera');
        
        const permissions = await Camera.requestPermissions();
        console.log('Retry permissions result:', permissions);
        
        if (permissions.camera !== 'granted') {
          console.log('❌ Camera permission still denied on retry');
          setPermissionDenied(true);
          return;
        }
        
        console.log('✅ Camera permission granted on retry!');
      } catch (error) {
        console.error('Error requesting permissions on retry:', error);
        setPermissionDenied(true);
        return;
      }
    }
    
    // Proceed with camera initialization
    initCamera();
  }, [initCamera]);

  // Start countdown
  const startCountdown = useCallback(() => {
    if (timer === 0) {
      startRecording();
      return;
    }
    
    setCountdownActive(true);
    setCountdown(timer);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setCountdownActive(false);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timer]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        generateThumbnail(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Recording timer
      const recordingInterval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            clearInterval(recordingInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

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
    }
  }, [isRecording]);

  // Generate thumbnail
  const generateThumbnail = useCallback((videoBlob: Blob) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    
    video.addEventListener('loadeddata', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        onVideoCreated(videoBlob, thumbnail);
      }
    });
  }, [onVideoCreated]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize camera on mount
  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, [initCamera, stopCamera]);

  // Re-initialize camera when settings change
  useEffect(() => {
    if (cameraReady) {
      stopCamera();
      setTimeout(initCamera, 100);
    }
  }, [facingMode, audioEnabled]);

  // Permission denied screen
  if (permissionDenied) {
    const isNative = Capacitor.isNativePlatform();
    
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto">
            <Camera className="w-10 h-10 text-white" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Camera Permission Required</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              To record videos, we need access to your camera.
            </p>
          </div>
          
          {isNative ? (
            <div className="space-y-4 text-sm text-gray-300">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-center">
                  Camera access is required to record videos. Tap "Allow Access" and we'll request permission from your device.
                </p>
              </div>
              
              <div className="text-xs text-gray-400 text-center">
                If you previously denied access, go to:<br/>
                <strong>Settings → Apps → Mirro → Permissions → Camera</strong>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-gray-300 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">1</span>
                </div>
                <span>Tap the camera icon in your browser's address bar</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">2</span>
                </div>
                <span>Select "Allow" for camera access</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">3</span>
                </div>
                <span>Try again by tapping the button below</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3 pt-4">
            <Button
              onClick={retryCamera}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isNative ? 'Allow Access' : 'Try Again'}
            </Button>
            
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFlashEnabled(!flashEnabled)}
            className={cn(
              "text-white hover:bg-white/20",
              flashEnabled && "bg-white/20"
            )}
          >
            {flashEnabled ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={flipCamera}
            className="text-white hover:bg-white/20"
          >
            <RotateCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{
            filter: selectedFilter.css,
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
          }}
          muted
          playsInline
        />
        
        {/* Countdown Overlay */}
        {countdownActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-8xl font-bold animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-20 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Progress Bar */}
        {isRecording && (
          <div className="absolute top-16 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-red-600 transition-all duration-1000"
              style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Side Controls */}
      <div className="absolute right-4 bottom-32 flex flex-col space-y-4">
        {/* Filters */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "w-12 h-12 rounded-full bg-black/30 text-white hover:bg-black/50",
            showFilters && "bg-white/20"
          )}
        >
          <Palette className="w-6 h-6" />
        </Button>

        {/* Effects */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowEffects(!showEffects)}
          className={cn(
            "w-12 h-12 rounded-full bg-black/30 text-white hover:bg-black/50",
            showEffects && "bg-white/20"
          )}
        >
          <Sparkles className="w-6 h-6" />
        </Button>

        {/* Audio Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={cn(
            "w-12 h-12 rounded-full bg-black/30 text-white hover:bg-black/50",
            !audioEnabled && "bg-red-600"
          )}
        >
          {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        {/* Timer */}
        <div className="flex flex-col items-center space-y-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-12 h-12 rounded-full bg-black/30 text-white hover:bg-black/50",
              timer > 0 && "bg-yellow-600"
            )}
          >
            <Timer className="w-6 h-6" />
          </Button>
          <div className="flex flex-col space-y-1">
            {timerOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimer(option.value)}
                className={cn(
                  "text-white text-xs px-2 py-1 rounded",
                  timer === option.value ? "bg-yellow-600" : "bg-black/30"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute bottom-32 left-0 right-0 bg-black/80 p-4">
          <div className="flex space-x-4 overflow-x-auto">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden",
                  selectedFilter.id === filter.id ? "border-white" : "border-transparent"
                )}
              >
                <div
                  className="w-full h-full bg-gradient-to-b from-blue-500 to-purple-600"
                  style={{ filter: filter.css }}
                />
                <div className="text-white text-xs mt-1 text-center">{filter.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
        <div className="flex items-center justify-center">
          {!isRecording ? (
            <Button
              onClick={startCountdown}
              disabled={!cameraReady}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center border-4 border-white"
            >
              <div className="w-12 h-12 bg-red-600 rounded-full" />
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
            >
              <Square className="w-8 h-8 text-white fill-current" />
            </Button>
          )}
        </div>
        
        <div className="flex justify-center mt-4">
          <div className="text-white text-sm">
            {isRecording ? 'Tap to stop' : timer > 0 ? `${timer}s timer set` : 'Hold to record'}
          </div>
        </div>
      </div>
    </div>
  );
}