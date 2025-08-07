'use client';

import React, { useState } from 'react';
import { useVideoEditor } from '@/contexts/VideoEditorContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { ExportSettings } from '@/types/video-editor';
import { Download, X, Settings } from 'lucide-react';
// import { saveAs } from 'file-saver'; // Removed for serverless compatibility

export function ExportPanel() {
  const { project, exportProgress, isExporting, exportVideo } = useVideoEditor();
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: '1080p',
    frameRate: 30,
    quality: 'high',
    format: 'mp4',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExport = async () => {
    try {
      const blob = await exportVideo();
      const filename = `${project?.name || 'video'}.${exportSettings.format}`;
      saveAs(blob, filename);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getResolutionDetails = (resolution: string) => {
    switch (resolution) {
      case '1080p': return { width: 1920, height: 1080, quality: 'Full HD' };
      case '720p': return { width: 1280, height: 720, quality: 'HD' };
      case '480p': return { width: 854, height: 480, quality: 'SD' };
      default: return { width: 1920, height: 1080, quality: 'Full HD' };
    }
  };

  const getEstimatedFileSize = () => {
    if (!project) return '0 MB';
    
    const duration = project.timeline.duration;
    const { width, height } = getResolutionDetails(exportSettings.resolution);
    const pixels = width * height;
    const bitrate = exportSettings.quality === 'high' ? 8000 : 
                   exportSettings.quality === 'medium' ? 4000 : 2000;
    
    const estimatedSizeMB = (duration * bitrate) / 8 / 1024; // Convert to MB
    return `~${Math.round(estimatedSizeMB)} MB`;
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full mx-4">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <h2 className="text-white text-xl font-bold">Export Video</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {isExporting ? (
          // Export Progress
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-white text-lg font-medium mb-2">
                Exporting Video...
              </div>
              <div className="text-gray-400 text-sm">
                This may take a few minutes
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
            </div>

            <div className="text-center text-gray-400 text-sm">
              Processing with {exportSettings.resolution} • {exportSettings.quality} quality
            </div>
          </div>
        ) : (
          // Export Settings
          <div className="space-y-4">
            {/* Resolution */}
            <div>
              <Label className="text-white mb-2 block">Resolution</Label>
              <div className="grid grid-cols-3 gap-2">
                {['1080p', '720p', '480p'].map((res) => (
                  <Button
                    key={res}
                    variant={exportSettings.resolution === res ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportSettings(prev => ({ ...prev, resolution: res as any }))}
                    className="w-full"
                  >
                    {res}
                  </Button>
                ))}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {getResolutionDetails(exportSettings.resolution).quality} • {' '}
                {getResolutionDetails(exportSettings.resolution).width}×{getResolutionDetails(exportSettings.resolution).height}
              </div>
            </div>

            {/* Quality */}
            <div>
              <Label className="text-white mb-2 block">Quality</Label>
              <div className="grid grid-cols-3 gap-2">
                {['high', 'medium', 'low'].map((quality) => (
                  <Button
                    key={quality}
                    variant={exportSettings.quality === quality ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportSettings(prev => ({ ...prev, quality: quality as any }))}
                    className="w-full capitalize"
                  >
                    {quality}
                  </Button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-gray-400 hover:text-white p-0"
              >
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </Button>
              
              {showAdvanced && (
                <div className="mt-3 space-y-3 pl-4 border-l border-gray-700">
                  {/* Frame Rate */}
                  <div>
                    <Label className="text-white mb-2 block text-sm">Frame Rate</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[30, 60].map((fps) => (
                        <Button
                          key={fps}
                          variant={exportSettings.frameRate === fps ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setExportSettings(prev => ({ ...prev, frameRate: fps as any }))}
                          className="w-full"
                        >
                          {fps} FPS
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Format */}
                  <div>
                    <Label className="text-white mb-2 block text-sm">Format</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['mp4', 'webm'].map((format) => (
                        <Button
                          key={format}
                          variant={exportSettings.format === format ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setExportSettings(prev => ({ ...prev, format: format as any }))}
                          className="w-full uppercase"
                        >
                          {format}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white">
                  {Math.floor((project?.timeline.duration || 0) / 60)}:
                  {Math.floor((project?.timeline.duration || 0) % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated Size:</span>
                <span className="text-white">{getEstimatedFileSize()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Format:</span>
                <span className="text-white uppercase">{exportSettings.format}</span>
              </div>
            </div>

            {/* Watermark Option */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">Add Watermark</div>
                  <div className="text-gray-400 text-xs">Include app branding</div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  defaultChecked
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-700">
        {isExporting ? (
          <Button
            variant="outline"
            className="w-full"
            disabled
          >
            Exporting... {Math.round(exportProgress)}%
          </Button>
        ) : (
          <Button
            onClick={handleExport}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Video
          </Button>
        )}
      </div>
    </div>
  );
}