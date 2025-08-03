'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { VideoClip, AudioClip, TextOverlay, StickerOverlay } from '@/types/video-editor';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  Volume2, 
  Type, 
  Sticker, 
  Scissors, 
  Copy, 
  Trash2,
  MoreHorizontal 
} from 'lucide-react';

const PIXELS_PER_SECOND = 100;
const TRACK_HEIGHT = 48;

interface TimelineTrackProps {
  type: 'video' | 'audio' | 'text' | 'sticker';
  items: (VideoClip | AudioClip | TextOverlay | StickerOverlay)[];
  onItemSelect: (id: string) => void;
  onItemUpdate: (id: string, updates: any) => void;
  onItemRemove: (id: string) => void;
  selectedId?: string | null;
  duration: number;
}

function TimelineTrack({ 
  type, 
  items, 
  onItemSelect, 
  onItemUpdate, 
  onItemRemove, 
  selectedId, 
  duration 
}: TimelineTrackProps) {
  const [dragging, setDragging] = useState<{ id: string; startX: number; startTime: number } | null>(null);

  const getIcon = () => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Volume2 className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'sticker': return <Sticker className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'video': return 'bg-blue-600';
      case 'audio': return 'bg-green-600';
      case 'text': return 'bg-purple-600';
      case 'sticker': return 'bg-orange-600';
    }
  };

  const handleMouseDown = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    setDragging({
      id: item.id,
      startX: e.clientX,
      startTime: item.startTime
    });
    onItemSelect(item.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    
    const deltaX = e.clientX - dragging.startX;
    const deltaTime = deltaX / PIXELS_PER_SECOND;
    const newStartTime = Math.max(0, dragging.startTime + deltaTime);
    
    const item = items.find(i => i.id === dragging.id);
    if (item) {
      const itemDuration = item.endTime - item.startTime;
      onItemUpdate(dragging.id, {
        startTime: newStartTime,
        endTime: newStartTime + itemDuration
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging]);

  return (
    <div className="flex border-b border-gray-700">
      {/* Track header */}
      <div className="w-24 flex-shrink-0 flex items-center justify-center bg-gray-800 border-r border-gray-700">
        <div className="flex items-center space-x-2 text-white">
          {getIcon()}
          <span className="text-xs capitalize">{type}</span>
        </div>
      </div>
      
      {/* Track content */}
      <div 
        className="flex-1 relative bg-gray-850"
        style={{ height: TRACK_HEIGHT }}
      >
        {items.map((item) => {
          const left = item.startTime * PIXELS_PER_SECOND;
          const width = (item.endTime - item.startTime) * PIXELS_PER_SECOND;
          const isSelected = selectedId === item.id;
          
          return (
            <div
              key={item.id}
              className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${getColor()} ${
                isSelected ? 'ring-2 ring-white' : ''
              } hover:opacity-80`}
              style={{
                left: `${left}px`,
                width: `${width}px`,
              }}
              onMouseDown={(e) => handleMouseDown(e, item)}
            >
              <div className="p-1 text-white text-xs truncate">
                {'name' in item ? item.name : 'text' in item ? item.text : 'Item'}
              </div>
              
              {/* Resize handles */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-0 hover:opacity-100 cursor-ew-resize" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-0 hover:opacity-100 cursor-ew-resize" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Timeline() {
  const {
    project,
    currentTime,
    zoom,
    selectedClip,
    selectedOverlay,
    setCurrentTime,
    selectClip,
    selectOverlay,
    updateVideoClip,
    updateAudioClip,
    updateTextOverlay,
    updateStickerOverlay,
    removeVideoClip,
    removeAudioClip,
    removeTextOverlay,
    removeStickerOverlay,
  } = useVideoEditor();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.scrollWidth);
    }
  }, [project?.timeline.duration, zoom]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!project || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 96; // Account for track headers
    const time = Math.max(0, x / PIXELS_PER_SECOND);
    setCurrentTime(Math.min(time, project.timeline.duration));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        No project loaded
      </div>
    );
  }

  const playheadPosition = currentTime * PIXELS_PER_SECOND;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Timeline header */}
      <div className="flex border-b border-gray-700">
        <div className="w-24 flex-shrink-0 flex items-center justify-center bg-gray-800 border-r border-gray-700">
          <span className="text-white text-xs font-medium">Timeline</span>
        </div>
        
        {/* Time ruler */}
        <div 
          className="flex-1 relative bg-gray-800 h-8 overflow-hidden"
          onClick={handleTimelineClick}
          ref={timelineRef}
        >
          {/* Time markers */}
          {Array.from({ length: Math.ceil(project.timeline.duration) + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-gray-600"
              style={{ left: `${i * PIXELS_PER_SECOND}px` }}
            >
              <span className="text-gray-400 text-xs ml-1">
                {formatTime(i)}
              </span>
            </div>
          ))}
          
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${playheadPosition}px` }}
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Timeline tracks */}
      <div className="flex-1 overflow-y-auto">
        <TimelineTrack
          type="video"
          items={project.timeline.videoClips}
          onItemSelect={selectClip}
          onItemUpdate={updateVideoClip}
          onItemRemove={removeVideoClip}
          selectedId={selectedClip}
          duration={project.timeline.duration}
        />
        
        <TimelineTrack
          type="audio"
          items={project.timeline.audioClips}
          onItemSelect={(id) => selectOverlay(id)}
          onItemUpdate={updateAudioClip}
          onItemRemove={removeAudioClip}
          selectedId={selectedOverlay}
          duration={project.timeline.duration}
        />
        
        <TimelineTrack
          type="text"
          items={project.timeline.textOverlays}
          onItemSelect={selectOverlay}
          onItemUpdate={updateTextOverlay}
          onItemRemove={removeTextOverlay}
          selectedId={selectedOverlay}
          duration={project.timeline.duration}
        />
        
        <TimelineTrack
          type="sticker"
          items={project.timeline.stickerOverlays}
          onItemSelect={selectOverlay}
          onItemUpdate={updateStickerOverlay}
          onItemRemove={removeStickerOverlay}
          selectedId={selectedOverlay}
          duration={project.timeline.duration}
        />
      </div>

      {/* Timeline controls */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedClip && !selectedOverlay}
          >
            <Scissors className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedClip && !selectedOverlay}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!selectedClip && !selectedOverlay}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-white text-xs">
          Duration: {formatTime(project.timeline.duration)}
        </div>
      </div>
    </div>
  );
}