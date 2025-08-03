'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { VideoEditorCanvas } from './VideoEditorCanvas';
import { Timeline } from './Timeline';
import { ToolPanel } from './ToolPanel';
import { ExportPanel } from './ExportPanel';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Upload,
  Layers,
  Volume2,
  Type,
  Sticker,
  Palette,
  User,
  Camera,
  Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

interface VideoEditorProps {
  onSave?: () => void;
  onExport?: (blob: Blob) => void;
}

export function VideoEditor({ onSave, onExport }: VideoEditorProps) {
  const {
    project,
    currentTime,
    isPlaying,
    zoom,
    isExporting,
    exportProgress,
    play,
    pause,
    setCurrentTime,
    setZoom,
    exportVideo,
    saveProject,
  } = useVideoEditor();

  const [activeTab, setActiveTab] = useState('video');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // TODO: Add video clip to timeline
      console.log('File uploaded:', url);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportVideo();
      onExport?.(blob);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleSaveAndPost = async () => {
    if (!project) return;
    
    try {
      // Export video first
      const videoBlob = await exportVideo();
      
      // Convert blob to base64 for API
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Video = reader.result as string;
        
        // Get content from user (simplified - in real app you'd have a modal)
        const content = prompt('Add a description for your video:') || 'Check out my awesome video! 🎬';
        
        const response = await fetch('/api/video-editor/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project,
            videoBlob: base64Video,
            content,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          alert('Video posted successfully! 🎉');
          // Redirect to feed or profile
          window.location.href = '/feed';
        } else {
          const error = await response.json();
          alert(`Failed to post video: ${error.error}`);
        }
      };
      
      reader.readAsDataURL(videoBlob);
    } catch (error) {
      console.error('Save and post failed:', error);
      alert('Failed to save and post video');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!project) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No Project Loaded</h2>
          <p className="text-gray-400">Create a new project to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-white font-bold text-lg">{project.name}</h1>
          <div className="text-gray-400 text-sm">
            {formatTime(currentTime)} / {formatTime(project.timeline.duration)}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={saveProject}
          >
            Save Draft
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? `Exporting ${exportProgress}%` : 'Export'}
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAndPost}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Post Video
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Tools */}
        <div className="w-80 bg-gray-900 border-r border-gray-700 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-gray-800">
              <TabsTrigger value="video" className="p-2" title="Video & Audio">
                <Layers className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="text" className="p-2" title="Text & Stickers">
                <Type className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="effects" className="p-2" title="Effects & Filters">
                <Palette className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="face-overlay" className="p-2" title="Face Overlay">
                <Camera className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
            
            <div className="p-4">
              <TabsContent value="video">
                <div className="space-y-6">
                  <ToolPanel type="video" />
                  <div className="border-t border-gray-700 pt-4">
                    <ToolPanel type="audio" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="text">
                <div className="space-y-6">
                  <ToolPanel type="text" />
                  <div className="border-t border-gray-700 pt-4">
                    <ToolPanel type="stickers" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="effects">
                <div className="space-y-6">
                  <ToolPanel type="effects" />
                  <div className="border-t border-gray-700 pt-4">
                    <ToolPanel type="watermark" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="face-overlay">
                <ToolPanel type="face-overlay" />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col bg-gray-800">
          {/* Canvas Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="text-white hover:bg-gray-700"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentTime(0)}
                className="text-white hover:bg-gray-700"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm">Zoom:</span>
              <div className="w-32">
                <Slider
                  value={[zoom]}
                  onValueChange={([value]) => setZoom(value)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <span className="text-white text-sm w-12">{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-8">
            <VideoEditorCanvas />
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-semibold mb-4">Properties</h3>
            {/* TODO: Add property panels for selected elements */}
            <div className="text-gray-400 text-sm">
              Select an element to edit its properties
            </div>
          </div>
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-64 bg-gray-900 border-t border-gray-700">
        <Timeline />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Export Modal */}
      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ExportPanel />
        </div>
      )}
    </div>
  );
}