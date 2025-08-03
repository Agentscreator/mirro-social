'use client';

import React, { useState } from 'react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Play, 
  Volume2, 
  Type, 
  Palette, 
  Smile,
  Sparkles,
  Camera,
  Mic
} from 'lucide-react';
import { FaceOverlay } from './FaceOverlay';
import { WatermarkEditor } from './WatermarkEditor';

interface ToolPanelProps {
  type: 'video' | 'audio' | 'text' | 'stickers' | 'effects' | 'face-overlay' | 'watermark';
}

const soundEffects = [
  { id: '1', name: 'Applause', category: 'applause', src: '/sounds/applause.mp3' },
  { id: '2', name: 'Laugh', category: 'laugh', src: '/sounds/laugh.mp3' },
  { id: '3', name: 'Whoosh', category: 'whoosh', src: '/sounds/whoosh.mp3' },
  { id: '4', name: 'Pop', category: 'impact', src: '/sounds/pop.mp3' },
  { id: '5', name: 'Beep', category: 'impact', src: '/sounds/beep.mp3' },
  { id: '6', name: 'Chime', category: 'ambient', src: '/sounds/chime.mp3' },
];

const videoFilters = [
  { id: 'brightness', name: 'Brightness', type: 'brightness' },
  { id: 'contrast', name: 'Contrast', type: 'contrast' },
  { id: 'saturation', name: 'Saturation', type: 'saturation' },
  { id: 'blur', name: 'Blur', type: 'blur' },
  { id: 'vintage', name: 'Vintage', type: 'vintage' },
  { id: 'sepia', name: 'Sepia', type: 'sepia' },
  { id: 'grayscale', name: 'B&W', type: 'grayscale' },
  { id: 'invert', name: 'Invert', type: 'invert' },
];

const stickerCategories = [
  { name: 'Emoji', items: ['😀', '😎', '🔥', '💯', '❤️', '👍', '✨', '🎉'] },
  { name: 'Shapes', items: ['⭐', '💎', '🔺', '🔴', '🟡', '🟢', '🔵', '🟣'] },
  { name: 'Arrows', items: ['⬆️', '⬇️', '⬅️', '➡️', '↗️', '↘️', '↙️', '↖️'] },
];

export function ToolPanel({ type }: ToolPanelProps) {
  const {
    addVideoClip,
    addAudioClip,
    addTextOverlay,
    addStickerOverlay,
    currentTime,
  } = useVideoEditor();

  const [newText, setNewText] = useState('Your text here');
  const [textStyle, setTextStyle] = useState({
    fontSize: 24,
    color: '#ffffff',
    fontFamily: 'Arial',
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'video' | 'audio') => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      
      if (fileType === 'video') {
        addVideoClip(url);
      } else {
        addAudioClip({
          src: url,
          startTime: currentTime,
          endTime: currentTime + 5, // Default 5 seconds
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
          name: file.name,
        });
      }
    }
  };

  const handleAddText = () => {
    addTextOverlay({
      text: newText,
      startTime: currentTime,
      endTime: currentTime + 3, // Default 3 seconds
      position: { x: 100, y: 100 },
      fontSize: textStyle.fontSize,
      fontFamily: textStyle.fontFamily,
      color: textStyle.color,
      style: 'normal',
    });
  };

  const handleAddSticker = (emoji: string) => {
    // Create a simple emoji sticker
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 50, 50);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          addStickerOverlay({
            src: url,
            startTime: currentTime,
            endTime: currentTime + 3,
            position: { x: 150, y: 150 },
            scale: 1,
            rotation: 0,
          });
        }
      });
    }
  };

  const handleAddSoundEffect = (soundEffect: any) => {
    addAudioClip({
      src: soundEffect.src,
      startTime: currentTime,
      endTime: currentTime + 2, // Most sound effects are short
      volume: 0.8,
      fadeIn: 0,
      fadeOut: 0.2,
      name: soundEffect.name,
    });
  };

  switch (type) {
    case 'video':
      return (
        <div className="space-y-4">
          <h3 className="text-white font-semibold mb-3">Video Tools</h3>
          
          {/* Upload Video */}
          <div>
            <Label className="text-white mb-2 block">Add Video Clip</Label>
            <div className="relative">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileUpload(e, 'video')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </Button>
            </div>
          </div>

          {/* Camera Access */}
          <Button variant="outline" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Record Video
          </Button>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-white text-sm font-medium">Quick Actions</h4>
            <Button variant="ghost" size="sm" className="w-full justify-start text-white">
              Split at Playhead
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-white">
              Duplicate Clip
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-white">
              Reverse Video
            </Button>
          </div>
        </div>
      );

    case 'audio':
      return (
        <div className="space-y-4">
          <h3 className="text-white font-semibold mb-3">Audio Tools</h3>
          
          {/* Upload Audio */}
          <div>
            <Label className="text-white mb-2 block">Add Audio</Label>
            <div className="relative">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileUpload(e, 'audio')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Audio
              </Button>
            </div>
          </div>

          {/* Record Audio */}
          <Button variant="outline" className="w-full">
            <Mic className="w-4 h-4 mr-2" />
            Record Audio
          </Button>

          {/* Sound Effects */}
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Sound Effects</h4>
            <div className="grid grid-cols-2 gap-2">
              {soundEffects.map((effect) => (
                <Button
                  key={effect.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddSoundEffect(effect)}
                  className="text-white hover:bg-gray-700"
                >
                  <Volume2 className="w-3 h-3 mr-1" />
                  {effect.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Music Library */}
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Music</h4>
            <Button variant="ghost" size="sm" className="w-full justify-start text-white">
              Browse Music Library
            </Button>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-4">
          <h3 className="text-white font-semibold mb-3">Text Tools</h3>
          
          {/* Text Input */}
          <div>
            <Label className="text-white mb-2 block">Text Content</Label>
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="bg-gray-800 text-white border-gray-600"
              placeholder="Enter your text"
            />
          </div>

          {/* Font Size */}
          <div>
            <Label className="text-white mb-2 block">Font Size: {textStyle.fontSize}px</Label>
            <Slider
              value={[textStyle.fontSize]}
              onValueChange={([value]) => setTextStyle(prev => ({ ...prev, fontSize: value }))}
              min={12}
              max={72}
              step={2}
              className="w-full"
            />
          </div>

          {/* Font Family */}
          <div>
            <Label className="text-white mb-2 block">Font Family</Label>
            <select
              value={textStyle.fontFamily}
              onChange={(e) => setTextStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
              className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded"
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Impact">Impact</option>
              <option value="Comic Sans MS">Comic Sans MS</option>
            </select>
          </div>

          {/* Text Color */}
          <div>
            <Label className="text-white mb-2 block">Text Color</Label>
            <input
              type="color"
              value={textStyle.color}
              onChange={(e) => setTextStyle(prev => ({ ...prev, color: e.target.value }))}
              className="w-full h-10 rounded border border-gray-600"
            />
          </div>

          {/* Add Text Button */}
          <Button onClick={handleAddText} className="w-full">
            <Type className="w-4 h-4 mr-2" />
            Add Text
          </Button>

          {/* Preset Styles */}
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Preset Styles</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Title
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Subtitle
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Caption
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Lowercase
              </Button>
            </div>
          </div>
        </div>
      );

    case 'stickers':
      return (
        <div className="space-y-4">
          <h3 className="text-white font-semibold mb-3">Stickers & Emojis</h3>
          
          {stickerCategories.map((category) => (
            <div key={category.name}>
              <h4 className="text-white text-sm font-medium mb-2">{category.name}</h4>
              <div className="grid grid-cols-4 gap-2">
                {category.items.map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddSticker(item)}
                    className="text-2xl hover:bg-gray-700 aspect-square"
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {/* Upload Custom Sticker */}
          <div>
            <Label className="text-white mb-2 block">Custom Sticker</Label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    addStickerOverlay({
                      src: url,
                      startTime: currentTime,
                      endTime: currentTime + 3,
                      position: { x: 200, y: 200 },
                      scale: 1,
                      rotation: 0,
                    });
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload Sticker
              </Button>
            </div>
          </div>
        </div>
      );

    case 'effects':
      return (
        <div className="space-y-4">
          <h3 className="text-white font-semibold mb-3">Effects & Filters</h3>
          
          {/* Video Filters */}
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Video Filters</h4>
            <div className="grid grid-cols-2 gap-2">
              {videoFilters.map((filter) => (
                <Button
                  key={filter.id}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  <Palette className="w-3 h-3 mr-1" />
                  {filter.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Transitions */}
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Transitions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Fade
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Slide
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Zoom
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                Spin
              </Button>
            </div>
          </div>

          {/* Speed Controls */}
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Speed</h4>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                0.5x
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                1x
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                2x
              </Button>
            </div>
          </div>

          {/* Picture-in-Picture */}
          <div>
            <h4 className="text-white text-sm font-medium mb-2">Picture-in-Picture</h4>
            <Button variant="outline" className="w-full">
              <Camera className="w-4 h-4 mr-2" />
              Add Face Overlay
            </Button>
          </div>
        </div>
      );

    case 'face-overlay':
      return <FaceOverlay />;

    case 'watermark':
      return <WatermarkEditor />;

    default:
      return <div className="text-white">Unknown tool panel type</div>;
  }
}