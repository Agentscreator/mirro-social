"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, MessageCircle, ArrowLeft } from "lucide-react"
import { HamburgerMenu } from "@/components/hamburger-menu"

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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  // Mock data for now - replace with actual API calls
  const mockConversations: Conversation[] = [
    {
      id: "1",
      userId: "user1",
      username: "alexchen",
      nickname: "Alex Chen",
      profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      lastMessage: "Hey! Thanks for connecting. Looking forward to working together!",
      lastMessageTime: "2 min ago",
      unreadCount: 2,
      isOnline: true
    },
    {
      id: "2", 
      userId: "user2",
      username: "sarahmartinez",
      nickname: "Sarah Martinez",
      profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612c4c0?w=100&h=100&fit=crop&crop=face",
      lastMessage: "The project proposal looks great! When can we schedule a call?",
      lastMessageTime: "1 hour ago",
      unreadCount: 0,
      isOnline: false
    },
    {
      id: "3",
      userId: "user3", 
      username: "mikejohnson",
      nickname: "Mike Johnson",
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      lastMessage: "Just pushed the latest updates to the repo. Check it out!",
      lastMessageTime: "3 hours ago",
      unreadCount: 1,
      isOnline: true
    },
    {
      id: "4",
      userId: "user4",
      username: "emmadavis", 
      nickname: "Emma Davis",
      profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      lastMessage: "Love the design system work! The components look amazing.",
      lastMessageTime: "1 day ago",
      unreadCount: 0,
      isOnline: false
    }
  ]

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setConversations(mockConversations)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConversationClick = (userId: string) => {
    router.push(`/messages/${userId}`)
  }

  const formatTime = (timeStr: string) => {
    return timeStr
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/feed')}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          </div>
          <HamburgerMenu />
        </div>
      </div>

      {/* Search */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 rounded-full border-gray-300"
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
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.userId)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={conversation.profileImage} 
                        alt={conversation.username}
                      />
                      <AvatarFallback className="bg-blue-500 text-white">
                        {conversation.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.nickname || conversation.username}
                      </p>
                      <p className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(conversation.lastMessageTime)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate flex-1">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full ml-2">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </h3>
            <p className="text-gray-600 text-center max-w-sm">
              {searchQuery 
                ? 'Try searching for a different name or username.'
                : 'Start discovering people and send your first message!'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => router.push('/discover')}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                Discover People
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}