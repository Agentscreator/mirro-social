"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Send, MoreVertical, Info, Smile, Paperclip, Mic, Check, CheckCheck, MessageCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"
import { SimpleMessageComposer } from "@/components/messages/SimpleMessageComposer"
import { NewMessageIndicator } from "@/components/messages/NewMessageIndicator"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import { MessageBubble } from "@/components/messages/MessageBubble"

export default function ChatPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string
  
  const [showUserProfile, setShowUserProfile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, chatUser, loading, sendMessage } = useRealtimeMessages(userId)
  const { isOtherUserTyping, startTyping, stopTyping } = useTypingIndicator(userId)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (content: string, attachment?: { url: string; name: string; type: string; size: number }) => {
    return await sendMessage(content, attachment, userId)
  }

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
      <div className="flex flex-col h-screen bg-black">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="-ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
              <div>
                <div className="w-24 h-4 bg-gray-700 rounded animate-pulse mb-1"></div>
                <div className="w-16 h-3 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Messages */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 text-sm">Loading messages...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!chatUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h2 className="text-xl font-semibold text-white mb-2">User not found</h2>
        <p className="text-gray-400 mb-4">This conversation doesn't exist or has been deleted.</p>
        <Button onClick={() => router.push('/inbox')}>
          Back to Inbox
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-black -mx-4 -my-4 md:-mx-6 md:-my-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/inbox')}
            className="-ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-800 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setShowUserProfile(true)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={chatUser.profileImage} alt={chatUser.username} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {(chatUser.nickname || chatUser.username)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {chatUser.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">
                {chatUser.nickname || chatUser.username}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {chatUser.isOnline ? 'Online' : chatUser.lastSeen ? `Last seen ${formatLastSeen(chatUser.lastSeen)}` : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-gray-800">
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 relative">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
            <p className="text-gray-400 text-center max-w-sm">
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
                    <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full shadow-sm">
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
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                    {(chatUser.nickname || chatUser.username)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-700">
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

      {/* Message Input */}
      <SimpleMessageComposer 
        onSendMessage={handleSendMessage}
        placeholder={`Message ${chatUser?.nickname || chatUser?.username || ''}...`}
        onStartTyping={startTyping}
        onStopTyping={stopTyping}
      />

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