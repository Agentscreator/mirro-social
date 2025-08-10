"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Smile, Paperclip, Mic } from "lucide-react"

interface MessageComposerProps {
  onSendMessage: (content: string) => Promise<boolean>
  disabled?: boolean
  placeholder?: string
  onStartTyping?: () => void
  onStopTyping?: () => void
}

export function MessageComposer({ onSendMessage, disabled = false, placeholder = "Message...", onStartTyping, onStopTyping }: MessageComposerProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return

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
    
    const success = await onSendMessage(messageContent)
    if (!success) {
      setMessage(messageContent) // Restore message on error
    }
    
    setSending(false)
  }

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  return (
    <div className="p-4 bg-gray-900 border-t border-gray-700">
      <div className="flex items-end gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full text-gray-400 hover:text-gray-300">
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
        
        {message.trim() ? (
          <Button
            onClick={handleSend}
            disabled={sending || disabled}
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
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}