"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Smile, Paperclip, X, Image, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Attachment {
  url: string
  name: string
  type: string
  size: number
}

interface SimpleMessageComposerProps {
  onSendMessage: (content: string, attachment?: Attachment) => Promise<boolean>
  disabled?: boolean
  placeholder?: string
  onStartTyping?: () => void
  onStopTyping?: () => void
}

export function SimpleMessageComposer({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Message...", 
  onStartTyping, 
  onStopTyping 
}: SimpleMessageComposerProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const pathname = usePathname()
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  // Check if we're in an active conversation (navigation is hidden)
  const isInActiveConversation = pathname.match(/^\/messages\/[^\/]+$/) || pathname.match(/^\/groups\/[^\/]+$/)

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

    console.log("=== FILE UPLOAD START ===")
    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size
    })

    setUploading(true)
    try {
      // Validate file size before uploading
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        })
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      console.log("Uploading to /api/messages/upload...")
      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      })

      console.log("Upload response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Upload response data:", data)
        
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
        console.log("✅ Upload successful")
      } else {
        const errorText = await response.text()
        console.error("Upload failed:", response.status, errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || "Unknown error" }
        }
        
        toast({
          title: "Upload failed",
          description: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred while uploading",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      console.log("=== FILE UPLOAD END ===")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
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

  // Capacitor keyboard handling
  useEffect(() => {
    const isCapacitor = !!(window as any).Capacitor
    
    if (isCapacitor && (window as any).Capacitor?.Plugins?.Keyboard) {
      const keyboard = (window as any).Capacitor.Plugins.Keyboard
      
      const keyboardWillShow = () => {
        // Add padding to body to prevent content from being hidden
        document.body.style.paddingBottom = '280px' // More padding for message composer
      }
      
      const keyboardWillHide = () => {
        // Remove padding when keyboard hides
        document.body.style.paddingBottom = isInActiveConversation ? '0px' : '80px' // No padding if nav is hidden
      }
      
      keyboard.addListener('keyboardWillShow', keyboardWillShow)
      keyboard.addListener('keyboardWillHide', keyboardWillHide)
      
      return () => {
        keyboard.removeAllListeners()
        document.body.style.paddingBottom = isInActiveConversation ? '0px' : '80px'
      }
    }
  }, [isInActiveConversation])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <div ref={composerRef} className={`p-4 bg-gray-900 border-t border-gray-700 ${isInActiveConversation ? 'mb-0' : 'mb-[calc(4rem+env(safe-area-inset-bottom))] md:mb-0'}`}>
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
        </div>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={() => {
              // Handle keyboard display for both web and Capacitor apps
              if (window.innerWidth < 1024) {
                // Check if running in Capacitor
                const isCapacitor = !!(window as any).Capacitor
                
                if (isCapacitor) {
                  // For Capacitor apps, scroll to keep composer visible
                  setTimeout(() => {
                    composerRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'end' 
                    })
                  }, 100)
                } else {
                  // For web browsers
                  setTimeout(() => {
                    composerRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'end' 
                    })
                  }, 300)
                }
              }
            }}
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
        
        <Button
          onClick={handleSend}
          disabled={sending || disabled || uploading || (!message.trim() && !attachment)}
          size="icon"
          className="rounded-full bg-blue-500 hover:bg-blue-600 text-white w-11 h-11 flex-shrink-0 disabled:opacity-50"
        >
          {sending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}