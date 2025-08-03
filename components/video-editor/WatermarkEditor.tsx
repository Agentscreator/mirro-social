'use client';

import React, { useState } from 'react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Type, 
  Image as ImageIcon, 
  Move, 
  Eye, 
  EyeOff,
  Sparkles
} from 'lucide-react';

interface WatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  imageUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  size: number;
  rotation: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  shadow: boolean;
  animation: 'none' | 'fade' | 'pulse' | 'slide';
}

export function WatermarkEditor() {
  const { project } = useVideoEditor();
  const [config, setConfig] = useState<WatermarkConfig>({
    enabled: true,
    type: 'text',
    text: '@MirroSocial',
    imageUrl: '',
    position: 'bottom-right',
    opacity: 80,
    size: 100,
    rotation: 0,
    color: '#ffffff',
    fontFamily: 'Arial',
    fontSize: 16,
    shadow: true,
    animation: 'none',
  });

  const updateConfig = (updates: Partial<WatermarkConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const getPositionName = (position: string) => {
    switch (position) {
      case 'top-left': return 'Top Left';
      case 'top-right': return 'Top Right';
      case 'bottom-left': return 'Bottom Left';
      case 'bottom-right': return 'Bottom Right';
      case 'center': return 'Center';
      default: return position;
    }
  };

  const presetWatermarks = [
    { text: '@MirroSocial', color: '#ffffff' },
    { text: '🔥 MirroSocial', color: '#ff6b6b' },
    { text: '✨ Made with MirroSocial', color: '#4ecdc4' },
    { text: 'MirroSocial 📱', color: '#45b7d1' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Watermark</h3>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => updateConfig({ enabled })}
        />
      </div>

      {config.enabled && (
        <>
          {/* Watermark Type */}
          <div>
            <Label className="text-white mb-2 block">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={config.type === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ type: 'text' })}
                className="w-full"
              >
                <Type className="w-4 h-4 mr-2" />
                Text
              </Button>
              <Button
                variant={config.type === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ type: 'image' })}
                className="w-full"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </Button>
            </div>
          </div>

          {config.type === 'text' ? (
            <>
              {/* Text Content */}
              <div>
                <Label className="text-white mb-2 block">Text</Label>
                <Input
                  value={config.text}
                  onChange={(e) => updateConfig({ text: e.target.value })}
                  className="bg-gray-800 text-white border-gray-600"
                  placeholder="Enter watermark text"
                />
              </div>

              {/* Preset Watermarks */}
              <div>
                <Label className="text-white mb-2 block">Presets</Label>
                <div className="grid grid-cols-1 gap-2">
                  {presetWatermarks.map((preset, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => updateConfig({ 
                        text: preset.text, 
                        color: preset.color 
                      })}
                      className="text-white hover:bg-gray-700 justify-start"
                    >
                      <span style={{ color: preset.color }}>{preset.text}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Font Settings */}
              <div>
                <Label className="text-white mb-2 block">Font Family</Label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => updateConfig({ fontFamily: e.target.value })}
                  className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Impact">Impact</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  Font Size: {config.fontSize}px
                </Label>
                <Slider
                  value={[config.fontSize]}
                  onValueChange={([value]) => updateConfig({ fontSize: value })}
                  min={8}
                  max={48}
                  step={2}
                  className="w-full"
                />
              </div>

              {/* Text Color */}
              <div>
                <Label className="text-white mb-2 block">Color</Label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={config.color}
                    onChange={(e) => updateConfig({ color: e.target.value })}
                    className="w-12 h-8 rounded border border-gray-600"
                  />
                  <div className="flex space-x-1">
                    {['#ffffff', '#000000', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'].map((color) => (
                      <button
                        key={color}
                        onClick={() => updateConfig({ color })}
                        className="w-8 h-8 rounded border border-gray-600"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Shadow */}
              <div className="flex items-center justify-between">
                <Label className="text-white">Text Shadow</Label>
                <Switch
                  checked={config.shadow}
                  onCheckedChange={(shadow) => updateConfig({ shadow })}
                />
              </div>
            </>
          ) : (
            <>
              {/* Image Upload */}
              <div>
                <Label className="text-white mb-2 block">Watermark Image</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        updateConfig({ imageUrl: url });
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" className="w-full">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {config.imageUrl ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                {config.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={config.imageUrl}
                      alt="Watermark preview"
                      className="w-20 h-20 object-contain bg-gray-800 rounded border"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Position */}
          <div>
            <Label className="text-white mb-2 block">Position</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                'top-left', 'top-right', 'center',
                'bottom-left', 'bottom-right'
              ].map((position) => (
                <Button
                  key={position}
                  variant={config.position === position ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig({ position: position as any })}
                  className="text-xs"
                >
                  {getPositionName(position)}
                </Button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div>
            <Label className="text-white mb-2 block">
              Opacity: {config.opacity}%
            </Label>
            <Slider
              value={[config.opacity]}
              onValueChange={([value]) => updateConfig({ opacity: value })}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Size */}
          <div>
            <Label className="text-white mb-2 block">
              Size: {config.size}%
            </Label>
            <Slider
              value={[config.size]}
              onValueChange={([value]) => updateConfig({ size: value })}
              min={50}
              max={200}
              step={10}
              className="w-full"
            />
          </div>

          {/* Rotation */}
          <div>
            <Label className="text-white mb-2 block">
              Rotation: {config.rotation}°
            </Label>
            <Slider
              value={[config.rotation]}
              onValueChange={([value]) => updateConfig({ rotation: value })}
              min={-45}
              max={45}
              step={5}
              className="w-full"
            />
          </div>

          {/* Animation */}
          <div>
            <Label className="text-white mb-2 block">Animation</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'none', label: 'None' },
                { key: 'fade', label: 'Fade' },
                { key: 'pulse', label: 'Pulse' },
                { key: 'slide', label: 'Slide' },
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={config.animation === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig({ animation: key as any })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-800 rounded-lg p-4">
            <Label className="text-white mb-2 block">Preview</Label>
            <div className="relative bg-gray-700 rounded h-32 overflow-hidden">
              {/* Simulated video background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-50" />
              
              {/* Watermark preview */}
              <div
                className="absolute"
                style={{
                  [config.position.includes('top') ? 'top' : 'bottom']: '8px',
                  [config.position.includes('left') ? 'left' : config.position.includes('right') ? 'right' : 'left']: 
                    config.position === 'center' ? '50%' : '8px',
                  transform: config.position === 'center' ? 'translateX(-50%)' : 
                           `scale(${config.size / 100}) rotate(${config.rotation}deg)`,
                  transformOrigin: 'center',
                  opacity: config.opacity / 100,
                }}
              >
                {config.type === 'text' ? (
                  <span
                    style={{
                      color: config.color,
                      fontFamily: config.fontFamily,
                      fontSize: `${config.fontSize * 0.75}px`,
                      textShadow: config.shadow ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
                    }}
                  >
                    {config.text}
                  </span>
                ) : config.imageUrl ? (
                  <img
                    src={config.imageUrl}
                    alt="Watermark"
                    className="h-6 object-contain"
                  />
                ) : (
                  <div className="text-gray-400 text-xs">No image</div>
                )}
              </div>
            </div>
          </div>

          {/* TikTok Style Watermark */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-sm font-medium">TikTok Style</span>
            </div>
            <div className="text-gray-400 text-xs">
              Add a subtle watermark like TikTok to brand your content while keeping it professional.
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateConfig({
                text: '@MirroSocial',
                position: 'bottom-right',
                opacity: 70,
                size: 80,
                color: '#ffffff',
                shadow: true,
                animation: 'none'
              })}
              className="mt-2 text-yellow-400 hover:text-yellow-300"
            >
              Apply TikTok Style
            </Button>
          </div>
        </>
      )}
    </div>
  );
}