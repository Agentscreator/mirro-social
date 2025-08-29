"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  Scissors, 
  Palette, 
  Music, 
  Type, 
  Sparkles, 
  Download,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Filter,
  Crop,
  Move,
  MoreHorizontal
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoEditorProps {
  videoUrl?: string
  onSave?: (videoBlob: Blob) => void
  onExport?: (videoBlob: Blob) => void
}

interface Effect {
  id: string
  name: string
  icon: React.ReactNode
  preview: string
  category: 'filter' | 'effect' | 'transition'
}

interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  font: string
  animation?: string
}

export function EnhancedVideoEditor({ videoUrl, onSave, onExport }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [activeTab, setActiveTab] = useState<'effects' | 'text' | 'audio' | 'crop'>('effects')
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null)
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
  const [isRecording, setIsRecording] = useState(false)

  const effects: Effect[] = [
    { id: 'vintage', name: 'Vintage', icon: <Filter className="w-4 h-4" />, preview: '🎞️', category: 'filter' },
    { id: 'neon', name: 'Neon', icon: <Zap className="w-4 h-4" />, preview: '⚡', category: 'effect' },
    { id: 'blur', name: 'Blur', icon: <Sparkles className="w-4 h-4" />, preview: '✨', category: 'effect' },
    { id: 'sepia', name: 'Sepia', icon: <Palette className="w-4 h-4" />, preview: '🟤', category: 'filter' },
    { id: 'grayscale', name: 'B&W', icon: <Filter className="w-4 h-4" />, preview: '⚫', category: 'filter' },
    { id: 'saturate', name: 'Vibrant', icon: <Sparkles className="w-4 h-4" />, preview: '🌈', category: 'filter' },
    { id: 'contrast', name: 'Contrast', icon: <Palette className="w-4 h-4" />, preview: '⚡', category: 'filter' },
    { id: 'glow', name: 'Glow', icon: <Sparkles className="w-4 h-4" />, preview: '✨', category: 'effect' },
  ]

  const textAnimations = [
    'none', 'fadeIn', 'slideUp', 'bounce', 'typewriter', 'glow', 'shake', 'zoom'
  ]

  const fonts = [
    'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 
    'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Verdana'
  ]

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('loadedmetadata', updateDuration)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('loadedmetadata', updateDuration)
    }
  }, [])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = value[0]
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const applyEffect = (effectId: string) => {
    setSelectedEffect(effectId === selectedEffect ? null : effectId)
    // Apply CSS filters to video element
    const video = videoRef.current
    if (!video) return

    let filter = ''
    switch (effectId) {
      case 'vintage':
        filter = 'sepia(0.5) contrast(1.2) brightness(0.9)'
        break
      case 'neon':
        filter = 'contrast(1.5) brightness(1.2) saturate(2)'
        break
      case 'blur':
        filter = 'blur(2px)'
        break
      case 'sepia':
        filter = 'sepia(1)'
        break
      case 'grayscale':
        filter = 'grayscale(1)'
        break
      case 'saturate':
        filter = 'saturate(2)'
        break
      case 'contrast':
        filter = 'contrast(1.5)'
        break
      case 'glow':
        filter = 'brightness(1.2) contrast(1.1) drop-shadow(0 0 10px rgba(255,255,255,0.5))'
        break
      default:
        filter = 'none'
    }
    
    video.style.filter = effectId === selectedEffect ? 'none' : filter
  }

  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: Date.now().toString(),
      text: 'Add your text',
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#ffffff',
      font: 'Arial',
      animation: 'none'
    }
    setTextOverlays([...textOverlays, newText])
  }

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(prev => 
      prev.map(text => text.id === id ? { ...text, ...updates } : text)
    )
  }

  const removeTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(text => text.id !== id))
  }

  const exportVideo = async () => {
    // This would typically involve canvas rendering and video processing
    // For now, we'll simulate the export process
    const canvas = canvasRef.current
    const video = videoRef.current
    
    if (!canvas || !video) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Add text overlays
    textOverlays.forEach(textOverlay => {
      ctx.font = `${textOverlay.fontSize}px ${textOverlay.font}`
      ctx.fillStyle = textOverlay.color
      ctx.fillText(
        textOverlay.text, 
        (textOverlay.x / 100) * canvas.width, 
        (textOverlay.y / 100) * canvas.height
      )
    })

    // Convert to blob (this is simplified - real implementation would process entire video)
    canvas.toBlob((blob) => {
      if (blob && onExport) {
        onExport(blob)
      }
    }, 'image/jpeg', 0.9)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Video Preview */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        <div className="relative max-w-full max-h-full">
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full rounded-lg"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Text Overlays */}
          {textOverlays.map(textOverlay => (
            <div
              key={textOverlay.id}
              className="absolute cursor-move select-none"
              style={{
                left: `${textOverlay.x}%`,
                top: `${textOverlay.y}%`,
                fontSize: `${textOverlay.fontSize}px`,
                color: textOverlay.color,
                fontFamily: textOverlay.font,
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                animation: textOverlay.animation !== 'none' ? `${textOverlay.animation} 2s infinite` : undefined
              }}
              onClick={() => {
                const newText = prompt('Edit text:', textOverlay.text)
                if (newText) {
                  updateTextOverlay(textOverlay.id, { text: newText })
                }
              }}
            >
              {textOverlay.text}
            </div>
          ))}

          {/* Play/Pause Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-700">
        {/* Timeline */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="text-white hover:bg-gray-700"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <div className="flex-1">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="w-full"
              />
            </div>

            <span className="text-sm text-gray-400 min-w-[80px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-gray-700"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tool Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'effects', label: 'Effects', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
            { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
            { id: 'crop', label: 'Crop', icon: <Crop className="w-4 h-4" /> },
          ].map(tab => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 rounded-none border-b-2 ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="ml-2 hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Tool Content */}
        <div className="p-4 max-h-48 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'effects' && (
              <motion.div
                key="effects"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3"
              >
                {effects.map(effect => (
                  <Button
                    key={effect.id}
                    variant="outline"
                    onClick={() => applyEffect(effect.id)}
                    className={`aspect-square flex flex-col items-center gap-1 p-2 ${
                      selectedEffect === effect.id 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <span className="text-lg">{effect.preview}</span>
                    <span className="text-xs text-gray-400">{effect.name}</span>
                  </Button>
                ))}
              </motion.div>
            )}

            {activeTab === 'text' && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <Button
                  onClick={addTextOverlay}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Type className="w-4 h-4 mr-2" />
                  Add Text
                </Button>

                {textOverlays.map(textOverlay => (
                  <Card key={textOverlay.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300 truncate">{textOverlay.text}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTextOverlay(textOverlay.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Square className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <select
                          value={textOverlay.font}
                          onChange={(e) => updateTextOverlay(textOverlay.id, { font: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                        >
                          {fonts.map(font => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                        
                        <input
                          type="color"
                          value={textOverlay.color}
                          onChange={(e) => updateTextOverlay(textOverlay.id, { color: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            {activeTab === 'audio' && (
              <motion.div
                key="audio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="text-center text-gray-400">
                  <Music className="w-8 h-8 mx-auto mb-2" />
                  <p>Audio editing features coming soon!</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'crop' && (
              <motion.div
                key="crop"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="text-center text-gray-400">
                  <Crop className="w-8 h-8 mx-auto mb-2" />
                  <p>Crop and resize features coming soon!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Export Controls */}
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="outline" className="border-gray-600 text-gray-300">
              <Camera className="w-4 h-4 mr-2" />
              Record
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onSave && onSave(new Blob())}
              className="border-gray-600 text-gray-300"
            >
              Save Draft
            </Button>
            <Button 
              onClick={exportVideo}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}