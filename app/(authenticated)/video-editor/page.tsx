'use client';

import React, { useState } from 'react';
import { VideoEditorProvider } from '@/contexts/VideoEditorContext';
import { VideoEditor } from '@/components/video-editor/VideoEditor';
import { Button } from '@/components/ui/button';
import { VideoProject } from '@/types/video-editor';
import { ArrowLeft, Video, Square, Smartphone, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VideoEditorPage() {
  const router = useRouter();
  const [showProjectSelector, setShowProjectSelector] = useState(true);

  const aspectRatios: Array<{
    key: VideoProject['canvas']['aspectRatio'];
    label: string;
    description: string;
    icon: React.ReactNode;
    popular?: boolean;
  }> = [
    {
      key: '9:16',
      label: 'Vertical (9:16)',
      description: 'Perfect for TikTok, Instagram Stories, YouTube Shorts',
      icon: <Smartphone className="w-6 h-6" />,
      popular: true,
    },
    {
      key: '16:9',
      label: 'Landscape (16:9)',
      description: 'YouTube videos, desktop viewing',
      icon: <Monitor className="w-6 h-6" />,
    },
    {
      key: '1:1',
      label: 'Square (1:1)',
      description: 'Instagram posts, Facebook',
      icon: <Square className="w-6 h-6" />,
    },
    {
      key: '4:5',
      label: 'Portrait (4:5)',
      description: 'Instagram feed posts',
      icon: <Video className="w-6 h-6" />,
    },
  ];

  const handleCreateProject = (aspectRatio: VideoProject['canvas']['aspectRatio']) => {
    setShowProjectSelector(false);
  };

  if (showProjectSelector) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="absolute left-4 top-4 text-white hover:bg-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Create New Video</h1>
            <p className="text-gray-400 text-lg">
              Choose your video format to get started
            </p>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aspectRatios.map((ratio) => (
              <VideoEditorProvider key={ratio.key}>
                <ProjectCard
                  ratio={ratio}
                  onSelect={handleCreateProject}
                />
              </VideoEditorProvider>
            ))}
          </div>

          {/* Features Preview */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-6">
              Powerful Video Editing Tools
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-900 rounded-lg p-6">
                <div className="text-3xl mb-3">🎬</div>
                <h3 className="text-white font-semibold mb-2">Professional Timeline</h3>
                <p className="text-gray-400 text-sm">
                  Multi-track timeline with precise editing controls
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <div className="text-3xl mb-3">🎨</div>
                <h3 className="text-white font-semibold mb-2">Effects & Filters</h3>
                <p className="text-gray-400 text-sm">
                  Add stunning visual effects and color filters
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <div className="text-3xl mb-3">📱</div>
                <h3 className="text-white font-semibold mb-2">Face Overlay</h3>
                <p className="text-gray-400 text-sm">
                  TikTok-style picture-in-picture recording
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VideoEditorProvider>
      <VideoEditor
        onSave={() => {
          console.log('Project saved');
        }}
        onExport={(blob) => {
          console.log('Video exported:', blob);
          // TODO: Handle video export (save to backend, download, etc.)
        }}
      />
    </VideoEditorProvider>
  );
}

interface ProjectCardProps {
  ratio: {
    key: VideoProject['canvas']['aspectRatio'];
    label: string;
    description: string;
    icon: React.ReactNode;
    popular?: boolean;
  };
  onSelect: (aspectRatio: VideoProject['canvas']['aspectRatio']) => void;
}

function ProjectCard({ ratio, onSelect }: ProjectCardProps) {
  const { createProject } = useVideoEditor();

  const handleSelect = () => {
    createProject(ratio.key);
    onSelect(ratio.key);
  };

  const getDimensions = () => {
    switch (ratio.key) {
      case '9:16': return { width: 180, height: 320 };
      case '16:9': return { width: 320, height: 180 };
      case '1:1': return { width: 240, height: 240 };
      case '4:5': return { width: 240, height: 300 };
      default: return { width: 240, height: 240 };
    }
  };

  const dimensions = getDimensions();

  return (
    <div className="relative group">
      {ratio.popular && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full z-10">
          Popular
        </div>
      )}
      
      <button
        onClick={handleSelect}
        className="w-full bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 group"
      >
        {/* Aspect Ratio Preview */}
        <div className="flex justify-center mb-4">
          <div
            className="bg-gray-700 rounded-lg border-2 border-gray-600 group-hover:border-white transition-colors flex items-center justify-center"
            style={{
              width: `${dimensions.width * 0.4}px`,
              height: `${dimensions.height * 0.4}px`,
              maxWidth: '120px',
              maxHeight: '120px',
            }}
          >
            <div className="text-gray-400 group-hover:text-white transition-colors">
              {ratio.icon}
            </div>
          </div>
        </div>

        {/* Info */}
        <h3 className="text-white font-semibold text-lg mb-2">
          {ratio.label}
        </h3>
        <p className="text-gray-400 text-sm">
          {ratio.description}
        </p>

        {/* Dimensions */}
        <div className="mt-3 text-xs text-gray-500">
          {dimensions.width}×{dimensions.height}
        </div>
      </button>
    </div>
  );
}

// Need to add this import
import { useVideoEditor } from '@/contexts/VideoEditorContext';