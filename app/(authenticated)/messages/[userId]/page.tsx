"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Send, MoreVertical, Smile, Paperclip, Phone, Video, MessageCircle } from "lucide-react"
import { useSimpleMessages, useSimpleTyping } from "@/hooks/use-simple-messages"

// WhatsApp-style Message Bubble Component
function MessageBubble({ message, isMe, showAvatar, senderInfo }: {
  message: any
  isMe: boolean
  showAvatar: boolean
  senderInfo?: any
}) {
  return (
    <div className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && showAvatar && (
        <Avatar className="w-8 h-8 mr-2 mt-1">
          <AvatarImage src={senderInfo?.profileImage} />
          <AvatarFallback className="bg-gray-600 text-white text-xs">
            {(senderInfo?.nickname || senderInfo?.username || 'U')[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[80%] ${!isMe && !showAvatar ? 'ml-10' : ''}`}>
        <div
          className={`px-3 py-2 rounded-lg ${
            isMe
              ? 'bg-green-500 text-white rounded-br-none'
              : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
          }`}
        >
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && (
            <div className="text-gray-500">
              <svg className="w-4 h-4" viewBox="0 0 16 15" fill="currentColor">
                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l3.61 3.465c.143.14.361.125.484-.033L10.91 3.879a.366.366 0 0 0-.063-.51z"/>
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple Message Composer Component
function SimpleMessageComposer({ onSendMessage, placeholder, onStartTyping, onStopTyping }: {
  onSendMessage: (content: string) => Promise<boolean>
  placeholder: string
  onStartTyping?: () => void
  onStopTyping?: () => void
}) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const handleSend = async () => {
    if (!message.trim() || sending) return
    
    setSending(true)
    const content = message.trim()
    setMessage("")
    onStopTyping?.()
    
    const success = await onSendMessage(content)
    if (!success) {
      setMessage(content)
    }
    setSending(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    
    // Handle typing indicators
    if (e.target.value.trim() && !typingTimeoutRef.current) {
      onStartTyping?.()
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.()
      typingTimeoutRef.current = undefined
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-100 border-t border-gray-200">
      <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 flex-shrink-0">
        <Smile className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 flex items-center bg-white rounded-full border border-gray-300 min-w-0">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          className="border-0 bg-transparent focus:ring-0 rounded-full px-4 py-2 flex-1"
          disabled={sending}
        />
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 mr-2 flex-shrink-0">
          <Paperclip className="h-5 w-5" />
        </Button>
      </div>
      
      <Button
        onClick={handleSend}
        disabled={sending || !message.trim()}
        size="icon"
        className="rounded-full bg-green-500 hover:bg-green-600 text-white flex-shrink-0"
      >
        {sending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

// New Message Indicator Component
function NewMessageIndicator({ messageCount, onScrollToBottom }: {
  messageCount: number
  onScrollToBottom: () => void
}) {
  const [showIndicator, setShowIndicator] = useState(false)
  const [lastMessageCount, setLastMessageCount] = useState(messageCount)

  useEffect(() => {
    if (messageCount > lastMessageCount) {
      setShowIndicator(true)
      setLastMessageCount(messageCount)
    }
  }, [messageCount, lastMessageCount])

  const handleClick = () => {
    onScrollToBottom()
    setShowIndicator(false)
  }

  if (!showIndicator) return null

  return (
    <div className="fixed bottom-20 right-4 z-10">
      <Button
        onClick={handleClick}
        size="sm"
        className="rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
      >
        New message ↓
      </Button>
    </div>
  )
}

function ChatPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string
  
  const [showUserProfile, setShowUserProfile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, chatUser, loading, sendMessage } = useSimpleMessages(userId)
  const { isOtherUserTyping, startTyping, stopTyping } = useSimpleTyping(userId)

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    const success = await sendMessage(content)
    if (success) {
      setTimeout(scrollToBottom, 100)
    }
    return success
  }, [sendMessage, scrollToBottom])

  const handleBackNavigation = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    try {
      // Use window.history for safer navigation
      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.location.href = '/messages'
      }
    } catch (error) {
      console.error('Navigation error:', error)
      window.location.href = '/messages'
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const formatMessageTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Header Skeleton */}
        <div className="flex items-center bg-green-600 text-white px-4 py-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-white mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-green-700 rounded-full animate-pulse"></div>
            <div>
              <div className="w-24 h-4 bg-green-700 rounded animate-pulse mb-1"></div>
              <div className="w-16 h-3 bg-green-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Loading Messages */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <p className="text-gray-500 text-sm">Loading messages...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!chatUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
        <p className="text-gray-600 mb-4">This conversation doesn't exist or has been deleted.</p>
        <Button onClick={handleBackNavigation}>
          Back to Messages
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* WhatsApp-style Header */}
      <div className="flex items-center bg-green-600 text-white px-4 py-3 shadow-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackNavigation}
          className="text-white hover:bg-green-700 mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => setShowUserProfile(true)}
        >
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chatUser?.profileImage} alt={chatUser?.username} />
              <AvatarFallback className="bg-gray-500 text-white">
                {(chatUser?.nickname || chatUser?.username || 'U')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {chatUser?.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">
              {chatUser?.nickname || chatUser?.username || 'Loading...'}
            </p>
            <p className="text-xs text-green-100 truncate">
              {isOtherUserTyping ? 'typing...' : 
               chatUser?.isOnline ? 'online' : 
               'last seen recently'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-4 relative min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600 text-center max-w-sm">
              Start the conversation by sending a message to {chatUser.nickname || chatUser.username}.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
            const isMe = message.senderId === session?.user?.id
            const prevMessage = messages[index - 1]
            const showAvatar = !isMe && (!prevMessage || prevMessage.senderId !== message.senderId)
            const showTimestamp = index === 0 || 
              (message.timestamp.getTime() - (prevMessage?.timestamp.getTime() || 0)) > 5 * 60 * 1000 // 5 minutes
            
            return (
              <div key={message.id}>
                {showTimestamp && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full shadow-sm">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                )}
                
                <MessageBubble
                  message={message}
                  isMe={isMe}
                  showAvatar={showAvatar}
                  senderInfo={chatUser ? {
                    username: chatUser.username,
                    nickname: chatUser.nickname,
                    profileImage: chatUser.profileImage
                  } : undefined}
                />
              </div>
            )
          })}
          
          {isOtherUserTyping && (
            <div className="flex items-end gap-2 mb-1">
              <div className="w-8 h-8 flex-shrink-0">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={chatUser.profileImage} alt={chatUser.username} />
                  <AvatarFallback className="bg-gray-500 text-white text-xs">
                    {(chatUser.nickname || chatUser.username)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
        <div ref={messagesEndRef} data-messages-end />
        
        {/* New Message Indicator */}
        <NewMessageIndicator 
          messageCount={messages.length}
          onScrollToBottom={scrollToBottom}
        />
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        <SimpleMessageComposer 
          onSendMessage={handleSendMessage}
          placeholder={`Message ${chatUser?.nickname || chatUser?.username || ''}...`}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
        />
      </div>

      {/* User Profile Modal */}
      <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-center">Profile</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={chatUser.profileImage} alt={chatUser.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                {(chatUser.nickname || chatUser.username)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white">
                {chatUser.nickname || chatUser.username}
              </h3>
              <p className="text-gray-400">@{chatUser.username}</p>
              <p className="text-sm text-gray-500 mt-1">
                {chatUser.isOnline ? 'Online now' : chatUser.lastSeen ? `Last seen ${formatLastSeen(chatUser.lastSeen)}` : 'Offline'}
              </p>
            </div>
            
            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowUserProfile(false)
                  router.push(`/profile/${chatUser.id}`)
                }}
              >
                View Profile
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  // Add to contacts or block functionality
                }}
              >
                Block User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { ErrorBoundary } from "@/components/simple-error-boundary"

// Main export with error boundary
export default function ChatPage() {
  return (
    <ErrorBoundary>
      <ChatPageContent />
    </ErrorBoundary>
  )
}