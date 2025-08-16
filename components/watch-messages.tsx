"use client"

import { useState } from "react"
import { Send, Phone, Video, MoreHorizontal } from "lucide-react"
import { 
  WatchLayout, 
  WatchCard, 
  WatchButton, 
  WatchInput,
  WatchTitle,
  WatchAvatar,
  WatchStatusDot 
} from "./watch-layout"
import { cn } from "@/lib/utils"

interface WatchMessagesProps {
  conversations?: any[]
}

export function WatchMessages({ conversations = [] }: WatchMessagesProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")

  // Mock data for demonstration
  const mockConversations = conversations.length > 0 ? conversations : [
    {
      id: "1",
      user: {
        name: "Alice",
        avatar: "/api/placeholder/32/32",
        status: "online"
      },
      lastMessage: "Hey! How are you?",
      timestamp: "2m ago",
      unread: 2
    },
    {
      id: "2",
      user: {
        name: "Bob",
        avatar: "/api/placeholder/32/32",
        status: "busy"
      },
      lastMessage: "Let's catch up later",
      timestamp: "1h ago",
      unread: 0
    },
    {
      id: "3",
      user: {
        name: "Carol",
        avatar: "/api/placeholder/32/32",
        status: "offline"
      },
      lastMessage: "Thanks for the help!",
      timestamp: "3h ago",
      unread: 1
    }
  ]

  const mockMessages = [
    {
      id: "1",
      text: "Hey! How are you?",
      sender: "Alice",
      timestamp: "2m ago",
      isOwn: false
    },
    {
      id: "2",
      text: "I'm doing great! How about you?",
      sender: "You",
      timestamp: "1m ago",
      isOwn: true
    },
    {
      id: "3",
      text: "Same here! Want to grab coffee later?",
      sender: "Alice",
      timestamp: "30s ago",
      isOwn: false
    }
  ]

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle sending message
      console.log("Sending message:", newMessage)
      setNewMessage("")
    }
  }

  if (selectedConversation) {
    const conversation = mockConversations.find(c => c.id === selectedConversation)
    
    return (
      <WatchLayout className="watch:block hidden">
        <div className="watch-flex-col h-full">
          {/* Header */}
          <WatchCard className="mb-2">
            <div className="watch-flex-row items-center">
              <WatchButton
                variant="secondary"
                onClick={() => setSelectedConversation(null)}
                className="mr-2 !min-w-6 !min-h-6 !p-1"
              >
                ←
              </WatchButton>
              <div className="relative mr-2">
                <WatchAvatar 
                  src={conversation?.user.avatar || ""} 
                  alt={conversation?.user.name || ""}
                />
                <WatchStatusDot 
                  status={conversation?.user.status || "offline"}
                  className="absolute -bottom-1 -right-1"
                />
              </div>
              <div className="flex-1">
                <div className="watch-text-sm font-medium text-white">
                  {conversation?.user.name}
                </div>
              </div>
              <div className="watch-flex-row gap-1">
                <WatchButton variant="secondary" className="!min-w-6 !min-h-6 !p-1">
                  <Phone className="w-3 h-3" />
                </WatchButton>
                <WatchButton variant="secondary" className="!min-w-6 !min-h-6 !p-1">
                  <Video className="w-3 h-3" />
                </WatchButton>
              </div>
            </div>
          </WatchCard>
          
          {/* Messages */}
          <div className="flex-1 watch-scroll mb-2">
            <div className="watch-flex-col gap-2">
              {mockMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[80%] p-2 rounded-lg watch-text-xs",
                    message.isOwn
                      ? "bg-blue-600 text-white ml-auto"
                      : "bg-gray-700 text-white mr-auto"
                  )}
                >
                  <div>{message.text}</div>
                  <div className={cn(
                    "watch-text-xs mt-1 opacity-70",
                    message.isOwn ? "text-blue-100" : "text-gray-300"
                  )}>
                    {message.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Input */}
          <WatchCard>
            <div className="watch-flex-row gap-2">
              <WatchInput
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage()
                  }
                }}
              />
              <WatchButton
                variant="primary"
                onClick={handleSendMessage}
                className="!min-w-8 !min-h-8 !p-1"
              >
                <Send className="w-3 h-3" />
              </WatchButton>
            </div>
          </WatchCard>
        </div>
      </WatchLayout>
    )
  }

  return (
    <WatchLayout className="watch:block hidden">
      <div className="watch-flex-col">
        <WatchTitle>Messages</WatchTitle>
        
        <div className="watch-flex-col">
          {mockConversations.map((conversation) => (
            <WatchCard 
              key={conversation.id} 
              className="watch-fade-in cursor-pointer hover:bg-gray-800/60"
              onClick={() => setSelectedConversation(conversation.id)}
            >
              <div className="watch-flex-row items-center">
                <div className="relative mr-3">
                  <WatchAvatar 
                    src={conversation.user.avatar} 
                    alt={conversation.user.name}
                  />
                  <WatchStatusDot 
                    status={conversation.user.status}
                    className="absolute -bottom-1 -right-1"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="watch-flex-row items-center justify-between mb-1">
                    <div className="watch-text-sm font-medium text-white truncate">
                      {conversation.user.name}
                    </div>
                    <div className="watch-text-xs text-gray-400 ml-2">
                      {conversation.timestamp}
                    </div>
                  </div>
                  <div className="watch-text-xs text-gray-300 truncate">
                    {conversation.lastMessage}
                  </div>
                </div>
                {conversation.unread > 0 && (
                  <div className="watch-badge ml-2">
                    {conversation.unread}
                  </div>
                )}
              </div>
            </WatchCard>
          ))}
        </div>
        
        {mockConversations.length === 0 && (
          <WatchCard>
            <div className="text-center py-4">
              <div className="watch-text-sm text-gray-300 mb-2">
                No conversations yet
              </div>
              <WatchButton variant="primary">
                Start Chatting
              </WatchButton>
            </div>
          </WatchCard>
        )}
      </div>
    </WatchLayout>
  )
}