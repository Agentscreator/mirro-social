"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
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

export function useMessages(userId?: string) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [chatUser, setChatUser] = useState<ChatUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        console.error('Failed to fetch conversations:', response.status)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  // Fetch messages for specific user
  const fetchMessages = useCallback(async (targetUserId: string, silent = false) => {
    if (!targetUserId || !session?.user?.id) return

    try {
      if (!silent) setLoading(true)
      
      const response = await fetch(`/api/messages/${targetUserId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setChatUser(data.user)
        const newMessages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.createdAt),
          isRead: msg.isRead === 1
        }))
        
        // Only update if messages have actually changed
        setMessages(prevMessages => {
          if (JSON.stringify(prevMessages) !== JSON.stringify(newMessages)) {
            return newMessages
          }
          return prevMessages
        })
      } else {
        console.error('Failed to fetch messages:', response.status)
        if (!silent) setChatUser(null)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      if (!silent) setChatUser(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [session?.user?.id])

  // Send message
  const sendMessage = useCallback(async (content: string, targetUserId?: string) => {
    const recipientId = targetUserId || userId
    if (!content.trim() || sending || !recipientId) return false

    setSending(true)
    
    try {
      const response = await fetch(`/api/messages/${recipientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newMessage: Message = {
          id: data.message.id.toString(),
          content: data.message.content,
          senderId: data.message.senderId,
          receiverId: data.message.receiverId,
          timestamp: new Date(data.message.createdAt),
          isRead: false
        }
        
        setMessages(prev => [...prev, newMessage])
        
        // Update conversations list
        await fetchConversations()
        
        return true
      } else {
        console.error('Failed to send message')
        return false
      }
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    } finally {
      setSending(false)
    }
  }, [userId, sending, fetchConversations])

  // Mark messages as read
  const markAsRead = useCallback(async (targetUserId: string) => {
    if (!targetUserId || !session?.user?.id) return

    try {
      // The API already marks messages as read when fetching
      // This is just for potential future use
      setMessages(prev => prev.map(msg => 
        msg.senderId === targetUserId ? { ...msg, isRead: true } : msg
      ))
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [session?.user?.id])

  // Auto-refresh conversations every 30 seconds
  useEffect(() => {
    if (!userId) {
      fetchConversations()
      const interval = setInterval(fetchConversations, 30000)
      return () => clearInterval(interval)
    }
  }, [userId, fetchConversations])

  // Auto-refresh messages every 2 seconds when in a chat
  useEffect(() => {
    if (userId && session?.user?.id) {
      fetchMessages(userId, false) // Initial load with loading state
      const interval = setInterval(() => fetchMessages(userId, true), 2000) // Silent updates
      return () => clearInterval(interval)
    }
  }, [userId, session?.user?.id, fetchMessages])

  return {
    messages,
    conversations,
    chatUser,
    loading,
    sending,
    sendMessage,
    fetchMessages,
    fetchConversations,
    markAsRead,
  }
}