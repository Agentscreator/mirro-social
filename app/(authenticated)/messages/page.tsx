"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, MessageCircle, ArrowLeft, Plus, MoreVertical, Pin } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { StreamChatMessages } from "@/components/StreamChatMessages"
import { useStreamContext } from "@/components/providers/StreamProvider"

interface Conversation {
  id: string
  userId: string
  username: string
  nickname?: string
  profileImage?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isOnline: boolean
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { client, isReady } = useStreamContext()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  // Always use API for now to avoid infinite loading
  const useStreamChat = false // Temporarily disabled

  // Fetch conversations from API
  const fetchConversations = async () => {
    try {
      console.log('🔄 Fetching conversations...')
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversations fetched:', data.conversations?.length || 0)
        setConversations(data.conversations || []);
      } else {
        console.error('❌ Failed to fetch conversations:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [session?.user?.id])

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConversationClick = (userId: string) => {
    router.push(`/messages/${userId}`)
  }

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Temporarily disabled Stream Chat to fix loading issue
  // if (useStreamChat) {
  //   return <StreamChatMessages />
  // }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/feed')}
              className="md:hidden -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/discover')}
              className="rounded-full"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search messages..."
            className="pl-11 rounded-xl border-0 bg-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="bg-white">
            {filteredConversations.map((conversation, index) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.userId)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-14 w-14">
                      <AvatarImage 
                        src={conversation.profileImage} 
                        alt={conversation.username}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {(conversation.nickname || conversation.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.nickname || conversation.username}
                        </h3>
                        {/* Add pinned indicator if needed */}
                        {/* <Pin className="h-3 w-3 text-gray-400 flex-shrink-0" /> */}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white min-w-[20px] h-5 text-xs px-1.5 rounded-full">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate leading-tight">
                      {truncateMessage(conversation.lastMessage)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No chats found' : 'No messages yet'}
            </h3>
            <p className="text-gray-500 text-center max-w-sm mb-6 leading-relaxed">
              {searchQuery 
                ? 'Try searching for a different name or username.'
                : 'Start a conversation by discovering new people or messaging someone from your feed.'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => router.push('/discover')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium"
              >
                Start Chatting
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}