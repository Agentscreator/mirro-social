'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
// import { Canvas, FabricText, FabricImage } from 'fabric'; // Removed for serverless compatibility
import { VideoClip, TextOverlay, StickerOverlay } from '@/types/video-editor';

export function VideoEditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    project,
    currentTime,
    isPlaying,
    zoom,
    selectClip,
    selectOverlay,
    updateVideoClip,
    updateTextOverlay,
    updateStickerOverlay,
  } = useVideoEditor();

  const [canvasReady, setCanvasReady] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !project) return;

    const canvas = new Canvas(canvasRef.current, {
      width: project.canvas.width,
      height: project.canvas.height,
      backgroundColor: '#000000',
    });

    fabricCanvasRef.current = canvas;
    setCanvasReady(true);

    // Handle object selection
    canvas.on('selection:created', (e) => {
      const selectedObject = e.selected?.[0];
      if (selectedObject) {
        const objectId = selectedObject.get('id') as string;
        const objectType = selectedObject.get('type');
        
        if (objectType === 'video') {
          selectClip(objectId);
        } else {
          selectOverlay(objectId);
        }
      }
    });

    canvas.on('selection:updated', (e) => {
      const selectedObject = e.selected?.[0];
      if (selectedObject) {
        const objectId = selectedObject.get('id') as string;
        const objectType = selectedObject.get('type');
        
        if (objectType === 'video') {
          selectClip(objectId);
        } else {
          selectOverlay(objectId);
        }
      }
    });

    canvas.on('selection:cleared', () => {
      selectClip(null);
      selectOverlay(null);
    });

    // Handle object modifications
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj) return;

      const objectId = obj.get('id') as string;
      const objectType = obj.get('objectType') as string;

      const updates = {
        position: { x: obj.left || 0, y: obj.top || 0 },
        scale: obj.scaleX || 1,
        rotation: obj.angle || 0,
      };

      if (objectType === 'video') {
        updateVideoClip(objectId, updates);
      } else if (objectType === 'text') {
        updateTextOverlay(objectId, updates);
      } else if (objectType === 'sticker') {
        updateStickerOverlay(objectId, updates);
      }
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      setCanvasReady(false);
    };
  }, [project]);

  // Update canvas zoom
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    canvas.setZoom(zoom);
    canvas.renderAll();
  }, [zoom]);

  // Render video clips
  useEffect(() => {
    if (!fabricCanvasRef.current || !project || !canvasReady) return;

    const canvas = fabricCanvasRef.current;
    
    // Clear existing video objects
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if (obj.get('objectType') === 'video') {
        canvas.remove(obj);
      }
    });

    // Add current video clips
    project.timeline.videoClips.forEach(async (clip) => {
      if (currentTime >= clip.startTime && currentTime <= clip.endTime) {
        try {
          const videoElement = document.createElement('video');
          videoElement.src = clip.src;
          videoElement.crossOrigin = 'anonymous';
          videoElement.currentTime = (currentTime - clip.startTime) / clip.speed;
          
          videoElement.onloadeddata = () => {
            const fabricVideo = new FabricImage(videoElement, {
              left: clip.position.x,
              top: clip.position.y,
              scaleX: clip.scale,
              scaleY: clip.scale,
              angle: clip.rotation,
              selectable: true,
              hasControls: true,
              hasBorders: true,
            });
            
            fabricVideo.set('id', clip.id);
            fabricVideo.set('objectType', 'video');
            
            // Apply filters
            clip.filters.forEach(filter => {
              // TODO: Apply fabric.js filters based on filter type
            });
            
            canvas.add(fabricVideo);
            canvas.renderAll();
          };
        } catch (error) {
          console.error('Error loading video clip:', error);
        }
      }
    });
  }, [currentTime, project, canvasReady]);

  // Render text overlays
  useEffect(() => {
    if (!fabricCanvasRef.current || !project || !canvasReady) return;

    const canvas = fabricCanvasRef.current;
    
    // Clear existing text objects
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if (obj.get('objectType') === 'text') {
        canvas.remove(obj);
      }
    });

    // Add current text overlays
    project.timeline.textOverlays.forEach((textOverlay) => {
      if (currentTime >= textOverlay.startTime && currentTime <= textOverlay.endTime) {
        const fabricText = new FabricText(textOverlay.text, {
          left: textOverlay.position.x,
          top: textOverlay.position.y,
          fontSize: textOverlay.fontSize,
          fontFamily: textOverlay.fontFamily,
          fill: textOverlay.color,
          backgroundColor: textOverlay.backgroundColor,
          fontWeight: textOverlay.style === 'bold' ? 'bold' : 'normal',
          fontStyle: textOverlay.style === 'italic' ? 'italic' : 'normal',
          selectable: true,
          hasControls: true,
          hasBorders: true,
        });
        
        fabricText.set('id', textOverlay.id);
        fabricText.set('objectType', 'text');
        
        canvas.add(fabricText);
        canvas.renderAll();
      }
    });
  }, [currentTime, project, canvasReady]);

  // Render sticker overlays
  useEffect(() => {
    if (!fabricCanvasRef.current || !project || !canvasReady) return;

    const canvas = fabricCanvasRef.current;
    
    // Clear existing sticker objects
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if (obj.get('objectType') === 'sticker') {
        canvas.remove(obj);
      }
    });

    // Add current sticker overlays
    project.timeline.stickerOverlays.forEach(async (stickerOverlay) => {
      if (currentTime >= stickerOverlay.startTime && currentTime <= stickerOverlay.endTime) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = stickerOverlay.src;
          
          img.onload = () => {
            const fabricSticker = new FabricImage(img, {
              left: stickerOverlay.position.x,
              top: stickerOverlay.position.y,
              scaleX: stickerOverlay.scale,
              scaleY: stickerOverlay.scale,
              angle: stickerOverlay.rotation,
              selectable: true,
              hasControls: true,
              hasBorders: true,
            });
            
            fabricSticker.set('id', stickerOverlay.id);
            fabricSticker.set('objectType', 'sticker');
            
            canvas.add(fabricSticker);
            canvas.renderAll();
          };
        } catch (error) {
          console.error('Error loading sticker:', error);
        }
      }
    });
  }, [currentTime, project, canvasReady]);

  // Handle playback
  useEffect(() => {
    if (!isPlaying || !project) return;

    const interval = setInterval(() => {
      const newTime = currentTime + 0.1; // 100ms intervals
      if (newTime <= project.timeline.duration) {
        // TODO: Update current time through context
      } else {
        // TODO: Pause playback when reaching end
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, project]);

  if (!project) {
    return <div className="text-white">No project loaded</div>;
  }

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Canvas container */}
      <div 
        className="relative"
        style={{
          width: project.canvas.width * zoom,
          height: project.canvas.height * zoom,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        />
        
        {/* Aspect ratio indicator */}
        <div className="absolute -top-6 left-0 text-xs text-gray-400">
          {project.canvas.aspectRatio} • {project.canvas.width}×{project.canvas.height}
        </div>
      </div>

      {/* Hidden video element for video clips */}
      <video
        ref={videoRef}
        className="hidden"
        muted
        playsInline
      />
    </div>
  );
}