"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send, Phone, Video, MoreVertical } from "lucide-react"

interface Message {
  id: string
  content: string
  senderId: string
  timestamp: Date
  isRead: boolean
}

interface ChatUser {
  id: string
  username: string
  nickname?: string
  profileImage?: string
  isOnline: boolean
  lastSeen?: Date
}

export default function ChatPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatUser, setChatUser] = useState<ChatUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock user data based on userId
  const mockUsers: { [key: string]: ChatUser } = {
    user1: {
      id: "user1",
      username: "alexchen",
      nickname: "Alex Chen",
      profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      isOnline: true
    },
    user2: {
      id: "user2",
      username: "sarahmartinez", 
      nickname: "Sarah Martinez",
      profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612c4c0?w=100&h=100&fit=crop&crop=face",
      isOnline: false,
      lastSeen: new Date(Date.now() - 60000 * 30) // 30 minutes ago
    },
    user3: {
      id: "user3",
      username: "mikejohnson",
      nickname: "Mike Johnson", 
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      isOnline: true
    },
    user4: {
      id: "user4",
      username: "emmadavis",
      nickname: "Emma Davis",
      profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      isOnline: false,
      lastSeen: new Date(Date.now() - 60000 * 60 * 24) // 1 day ago
    }
  }

  // Mock messages based on userId
  const mockMessages: { [key: string]: Message[] } = {
    user1: [
      {
        id: "1",
        content: "Hey! Thanks for connecting.",
        senderId: "user1",
        timestamp: new Date(Date.now() - 60000 * 10),
        isRead: true
      },
      {
        id: "2", 
        content: "Hi Alex! Great to connect with you too.",
        senderId: session?.user?.id || "me",
        timestamp: new Date(Date.now() - 60000 * 8),
        isRead: true
      },
      {
        id: "3",
        content: "Looking forward to working together!",
        senderId: "user1",
        timestamp: new Date(Date.now() - 60000 * 2),
        isRead: false
      }
    ],
    user2: [
      {
        id: "4",
        content: "The project proposal looks great!",
        senderId: "user2",
        timestamp: new Date(Date.now() - 60000 * 60),
        isRead: true
      },
      {
        id: "5",
        content: "Thanks! I put a lot of work into it.",
        senderId: session?.user?.id || "me", 
        timestamp: new Date(Date.now() - 60000 * 55),
        isRead: true
      },
      {
        id: "6",
        content: "When can we schedule a call?",
        senderId: "user2",
        timestamp: new Date(Date.now() - 60000 * 50),
        isRead: true
      }
    ],
    user3: [
      {
        id: "7",
        content: "Just pushed the latest updates to the repo.",
        senderId: "user3",
        timestamp: new Date(Date.now() - 60000 * 180),
        isRead: true
      },
      {
        id: "8",
        content: "Check it out!",
        senderId: "user3", 
        timestamp: new Date(Date.now() - 60000 * 179),
        isRead: false
      }
    ],
    user4: [
      {
        id: "9",
        content: "Love the design system work!",
        senderId: "user4",
        timestamp: new Date(Date.now() - 60000 * 60 * 24),
        isRead: true
      },
      {
        id: "10",
        content: "The components look amazing.",
        senderId: "user4",
        timestamp: new Date(Date.now() - 60000 * 60 * 24 + 30000),
        isRead: true
      }
    ]
  }

  useEffect(() => {
    if (userId) {
      // Simulate loading
      setTimeout(() => {
        setChatUser(mockUsers[userId] || null)
        setMessages(mockMessages[userId] || [])
        setLoading(false)
      }, 500)
    }
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    
    const message: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      senderId: session?.user?.id || "me",
      timestamp: new Date(),
      isRead: false
    }

    setMessages(prev => [...prev, message])
    setNewMessage("")

    // Simulate sending delay
    setTimeout(() => {
      setSending(false)
    }, 500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!chatUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
        <p className="text-gray-600 mb-4">This conversation doesn't exist or has been deleted.</p>
        <Button onClick={() => router.push('/messages')}>
          Back to Messages
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={chatUser.profileImage} alt={chatUser.username} />
                <AvatarFallback className="bg-blue-500 text-white">
                  {chatUser.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {chatUser.isOnline && (
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            
            <div>
              <p className="font-medium text-gray-900">
                {chatUser.nickname || chatUser.username}
              </p>
              <p className="text-xs text-gray-500">
                {chatUser.isOnline ? 'Online' : `Last seen ${formatLastSeen(chatUser.lastSeen!)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isMe = message.senderId === session?.user?.id || message.senderId === "me"
          
          return (
            <div
              key={message.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isMe
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="rounded-full border-gray-300"
              disabled={sending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="rounded-full bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}