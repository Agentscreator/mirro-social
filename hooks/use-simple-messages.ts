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
        timestamp: new Date(msg.timestamp)
      })) || []

      setMessages(transformedMessages)
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
      
      // Add message to local state
      setMessages(prev => [...prev, {
        ...newMessage,
        timestamp: new Date(newMessage.timestamp)
      }])

      return true
    } catch (err) {
      console.error('Error sending message:', err)
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
    }, 3000) // Poll every 3 seconds

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