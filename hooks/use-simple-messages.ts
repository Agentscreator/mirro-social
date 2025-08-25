"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

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
  isOnline?: boolean
  lastSeen?: Date
}

export function useSimpleMessages(userId: string) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [chatUser, setChatUser] = useState<ChatUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch messages and user data
  const fetchData = useCallback(async () => {
    if (!session?.user?.id || !userId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch messages
      const messagesResponse = await fetch(`/api/messages?userId=${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!messagesResponse.ok) {
        throw new Error('Failed to fetch messages')
      }

      const messagesData = await messagesResponse.json()
      
      // Transform messages
      const transformedMessages = messagesData.messages?.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp || msg.createdAt)
      })) || []

      // When setting messages from server, preserve any optimistic messages
      setMessages(prev => {
        const optimisticMessages = prev.filter(msg => msg.isOptimistic)
        const serverMessages = transformedMessages.filter(msg => !msg.isOptimistic)
        
        // Combine server messages with optimistic messages, removing duplicates
        const allMessages = [...serverMessages, ...optimisticMessages]
        return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      })
      
      setChatUser(messagesData.chatUser || null)

    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, userId])

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!session?.user?.id || !userId || !content.trim()) {
      return false
    }

    // Create optimistic message for immediate display
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      content: content.trim(),
      senderId: session.user.id,
      receiverId: userId,
      timestamp: new Date(),
      isRead: false,
      isOptimistic: true // Flag to identify optimistic messages
    }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          receiverId: userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const newMessage = await response.json()
      
      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id 
          ? { ...newMessage.message, timestamp: new Date(newMessage.message.createdAt) }
          : msg
      ))

      return true
    } catch (err) {
      console.error('Error sending message:', err)
      
      // Remove failed optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      
      return false
    }
  }, [session?.user?.id, userId])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Polling for new messages (simple approach)
  useEffect(() => {
    if (!session?.user?.id || !userId) return

    const interval = setInterval(() => {
      fetchData()
    }, 5000) // Poll every 5 seconds (reduced frequency to avoid interference with optimistic updates)

    return () => clearInterval(interval)
  }, [fetchData, session?.user?.id, userId])

  return {
    messages,
    chatUser,
    loading,
    error,
    sendMessage,
    refetch: fetchData
  }
}

// Simple typing indicator hook
export function useSimpleTyping(userId: string) {
  const [isTyping, setIsTyping] = useState(false)
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)

  const startTyping = useCallback(() => {
    setIsTyping(true)
  }, [])

  const stopTyping = useCallback(() => {
    setIsTyping(false)
  }, [])

  return {
    isTyping,
    isOtherUserTyping,
    startTyping,
    stopTyping
  }
}