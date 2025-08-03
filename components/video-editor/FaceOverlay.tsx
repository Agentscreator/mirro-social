'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { PictureInPictureConfig } from '@/types/video-editor';
import { 
  Camera, 
  CameraOff, 
  RotateCw, 
  Maximize2, 
  Minimize2,
  Move,
  Circle
} from 'lucide-react';

interface FaceOverlayProps {
  onConfigChange?: (config: PictureInPictureConfig) => void;
}

export function FaceOverlay({ onConfigChange }: FaceOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [config, setConfig] = useState<PictureInPictureConfig>({
    enabled: false,
    position: 'bottom-right',
    size: 'medium',
    borderRadius: 8,
    borderColor: '#ffffff',
    borderWidth: 2,
  });

  const { addVideoClip, currentTime } = useVideoEditor();

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setCameraEnabled(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraEnabled(false);
    setIsRecording(false);
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    
    setIsRecording(true);
    // TODO: Implement actual recording logic with MediaRecorder
    console.log('Started recording face overlay');
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    // TODO: Save recorded video as overlay
    console.log('Stopped recording face overlay');
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<PictureInPictureConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [config, onConfigChange]);

  // Get position styles
  const getPositionStyles = () => {
    const sizeMap = {
      small: { width: 120, height: 90 },
      medium: { width: 160, height: 120 },
      large: { width: 200, height: 150 }
    };
    
    const size = sizeMap[config.size];
    
    const baseStyles = {
      width: `${size.width}px`,
      height: `${size.height}px`,
      borderRadius: `${config.borderRadius}px`,
      border: `${config.borderWidth}px solid ${config.borderColor}`,
      position: 'absolute' as const,
    };

    switch (config.position) {
      case 'top-left':
        return { ...baseStyles, top: '20px', left: '20px' };
      case 'top-right':
        return { ...baseStyles, top: '20px', right: '20px' };
      case 'bottom-left':
        return { ...baseStyles, bottom: '20px', left: '20px' };
      case 'bottom-right':
        return { ...baseStyles, bottom: '20px', right: '20px' };
      default:
        return { ...baseStyles, bottom: '20px', right: '20px' };
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Face Overlay</h3>
        <div className="flex items-center space-x-2">
          {!cameraEnabled ? (
            <Button
              onClick={initCamera}
              size="sm"
              variant="outline"
            >
              <Camera className="w-4 h-4 mr-2" />
              Enable Camera
            </Button>
          ) : (
            <Button
              onClick={stopCamera}
              size="sm"
              variant="outline"
            >
              <CameraOff className="w-4 h-4 mr-2" />
              Disable Camera
            </Button>
          )}
        </div>
      </div>

      {cameraEnabled && (
        <>
          {/* Camera Preview */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-48 object-cover"
              muted
              playsInline
            />
            
            {/* Overlay Preview */}
            <div
              className="absolute bg-black bg-opacity-50 flex items-center justify-center"
              style={getPositionStyles()}
            >
              <div className="text-white text-xs text-center">
                <Circle className="w-4 h-4 mx-auto mb-1" />
                Preview
              </div>
            </div>

            {/* Recording Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                >
                  <Circle className="w-4 h-4 mr-2 fill-current" />
                  Stop Recording
                </Button>
              )}
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="space-y-4">
            {/* Position */}
            <div>
              <Label className="text-white mb-2 block">Position</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'top-left', label: 'Top Left' },
                  { key: 'top-right', label: 'Top Right' },
                  { key: 'bottom-left', label: 'Bottom Left' },
                  { key: 'bottom-right', label: 'Bottom Right' },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={config.position === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ position: key as any })}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <Label className="text-white mb-2 block">Size</Label>
              <div className="grid grid-cols-3 gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <Button
                    key={size}
                    variant={config.size === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ size: size as any })}
                    className="capitalize"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <Label className="text-white mb-2 block">
                Corner Radius: {config.borderRadius}px
              </Label>
              <Slider
                value={[config.borderRadius]}
                onValueChange={([value]) => updateConfig({ borderRadius: value })}
                min={0}
                max={50}
                step={2}
                className="w-full"
              />
            </div>

            {/* Border Width */}
            <div>
              <Label className="text-white mb-2 block">
                Border Width: {config.borderWidth}px
              </Label>
              <Slider
                value={[config.borderWidth]}
                onValueChange={([value]) => updateConfig({ borderWidth: value })}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            {/* Border Color */}
            <div>
              <Label className="text-white mb-2 block">Border Color</Label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={config.borderColor}
                  onChange={(e) => updateConfig({ borderColor: e.target.value })}
                  className="w-12 h-8 rounded border border-gray-600"
                />
                <div className="flex space-x-1">
                  {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map((color) => (
                    <button
                      key={color}
                      onClick={() => updateConfig({ borderColor: color })}
                      className="w-8 h-8 rounded border border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-white text-sm font-medium mb-2">Advanced</h4>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-white"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Flip Camera
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-white"
                >
                  <Move className="w-4 h-4 mr-2" />
                  Custom Position
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Info Panel */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-white text-sm font-medium mb-1">TikTok-Style Face Overlay</div>
        <div className="text-gray-400 text-xs">
          Record yourself talking over videos, just like TikTok duets and reactions.
          Your face will appear as a floating overlay on the main video.
        </div>
      </div>
    </div>
  );
}