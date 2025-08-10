"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Smile, Paperclip, Mic, Image, X, Play, Pause, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Attachment {
  url: string
  name: string
  type: string
  size: number
}

interface EnhancedMessageComposerProps {
  onSendMessage: (content: string, attachment?: Attachment) => Promise<boolean>
  disabled?: boolean
  placeholder?: string
  onStartTyping?: () => void
  onStopTyping?: () => void
}

export function EnhancedMessageComposer({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Message...", 
  onStartTyping, 
  onStopTyping 
}: EnhancedMessageComposerProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    
    // Trigger typing indicator
    if (e.target.value.trim() && onStartTyping) {
      onStartTyping()
    } else if (!e.target.value.trim() && onStopTyping) {
      onStopTyping()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setAttachment({
          url: data.url,
          name: data.name,
          type: data.type,
          size: data.size,
        })
        toast({
          title: "File uploaded",
          description: "Your file is ready to send",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Upload failed",
          description: error.error || "Failed to upload file",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setRecording(true)
    } catch (error) {
      console.error('Recording error:', error)
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const uploadAudio = async () => {
    if (!audioBlob) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice-message.wav')

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setAttachment({
          url: data.url,
          name: 'Voice Message',
          type: data.type,
          size: data.size,
        })
        setAudioBlob(null)
        setAudioUrl(null)
        toast({
          title: "Voice message ready",
          description: "Your voice message is ready to send",
        })
      }
    } catch (error) {
      console.error('Audio upload error:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload voice message",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
    setAudioBlob(null)
    setAudioUrl(null)
  }

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || sending || disabled) return

    setSending(true)
    const messageContent = message.trim()
    setMessage("") // Clear input immediately for better UX
    
    // Stop typing indicator
    if (onStopTyping) {
      onStopTyping()
    }
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    const success = await onSendMessage(messageContent || "", attachment || undefined)
    if (!success) {
      setMessage(messageContent) // Restore message on error
    } else {
      setAttachment(null) // Clear attachment on success
    }
    
    setSending(false)
  }

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.startsWith('audio/')) return <Mic className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="p-4 bg-gray-900 border-t border-gray-700">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-3 p-3 bg-gray-800 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getFileIcon(attachment.type)}
            <div>
              <p className="text-sm font-medium text-white">{attachment.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeAttachment}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Audio Recording Preview */}
      {audioUrl && (
        <div className="mb-3 p-3 bg-gray-800 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={playAudio}
              className="text-blue-400 hover:text-blue-300"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div>
              <p className="text-sm font-medium text-white">Voice Message</p>
              <p className="text-xs text-gray-400">Tap to preview</p>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={uploadAudio}
              disabled={uploading}
              className="text-green-400 hover:text-green-300"
            >
              {uploading ? "Uploading..." : "Use"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAudioBlob(null)
                setAudioUrl(null)
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-gray-400 hover:text-gray-300"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full ${recording ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading}
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="min-h-[44px] max-h-[120px] resize-none rounded-3xl border-gray-600 bg-gray-800 px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-gray-400"
            disabled={disabled || sending}
            rows={1}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full text-gray-400 hover:text-gray-300"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>
        
        {(message.trim() || attachment) ? (
          <Button
            onClick={handleSend}
            disabled={sending || disabled || uploading}
            size="icon"
            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white w-11 h-11 flex-shrink-0"
          >
            {sending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-gray-400 hover:text-gray-300 w-11 h-11 flex-shrink-0"
            onClick={recording ? stopRecording : startRecording}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,.pdf,.txt,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}