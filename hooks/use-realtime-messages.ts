"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { playMessageSound, showDesktopNotification } from "@/utils/sound"

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  timestamp: Date
  isRead: boolean
  messageType?: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: string
  attachmentSize?: number
}

interface ChatUser {
  id: string
  username: string
  nickname?: string
  profileImage?: string
  isOnline: boolean
  lastSeen?: Date
}

export function useRealtimeMessages(userId?: string) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [chatUser, setChatUser] = useState<ChatUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const lastMessageCountRef = useRef(0)
  const isActiveRef = useRef(true)

  // Track if the tab is active for more efficient polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Fetch messages with optimistic updates
  const fetchMessages = useCallback(async (targetUserId: string, silent = false) => {
    if (!targetUserId || !session?.user?.id) return

    try {
      if (!silent) setLoading(true)
      
      const response = await fetch(`/api/messages/${targetUserId}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (!silent) {
          setChatUser(data.user)
        }
        
        const newMessages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.createdAt),
          isRead: msg.isRead === 1,
          messageType: msg.messageType || 'text',
          attachmentUrl: msg.attachmentUrl,
          attachmentName: msg.attachmentName,
          attachmentType: msg.attachmentType,
          attachmentSize: msg.attachmentSize,
        }))
        
        // Check if we have new messages
        if (newMessages.length > lastMessageCountRef.current) {
          const newMessageCount = newMessages.length - lastMessageCountRef.current
          const latestMessage = newMessages[newMessages.length - 1]
          
          // Only play sound and show notification for messages from others
          if (silent && latestMessage && latestMessage.senderId !== session?.user?.id) {
            playMessageSound()
            
            // Show desktop notification if tab is not active
            if (!isActiveRef.current && data.user) {
              showDesktopNotification(
                `New message from ${data.user.nickname || data.user.username}`,
                latestMessage.content.length > 50 
                  ? latestMessage.content.substring(0, 50) + '...'
                  : latestMessage.content
              )
            }
          }
          
          setMessages(newMessages)
          lastMessageCountRef.current = newMessages.length
          
          // Scroll to bottom if new messages arrived
          setTimeout(() => {
            const messagesContainer = document.querySelector('[data-messages-end]')
            messagesContainer?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        } else if (newMessages.length !== lastMessageCountRef.current) {
          setMessages(newMessages)
          lastMessageCountRef.current = newMessages.length
        }
      } else {
        console.error('Failed to fetch messages:', response.status)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [session?.user?.id])

  // Send message with optimistic update (supports attachments)
  const sendMessage = useCallback(async (content: string, attachment?: { url: string; name: string; type: string; size: number }, targetUserId?: string) => {
    const recipientId = targetUserId || userId
    if ((!content.trim() && !attachment) || sending || !recipientId) return false

    setSending(true)
    
    // Determine message type
    let messageType = 'text'
    if (attachment) {
      if (attachment.type.startsWith('image/')) messageType = 'image'
      else if (attachment.type.startsWith('audio/')) messageType = 'audio'
      else messageType = 'file'
    }
    
    // Optimistic update - add message immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: content.trim() || '',
      senderId: session?.user?.id || '',
      receiverId: recipientId,
      timestamp: new Date(),
      isRead: false,
      messageType,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
      attachmentSize: attachment?.size,
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    
    try {
      const response = await fetch(`/api/messages/${recipientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim() || null,
          messageType,
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentType: attachment?.type,
          attachmentSize: attachment?.size,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const actualMessage: Message = {
          id: data.message.id.toString(),
          content: data.message.content,
          senderId: data.message.senderId,
          receiverId: data.message.receiverId,
          timestamp: new Date(data.message.createdAt),
          isRead: false,
          messageType: data.message.messageType || 'text',
          attachmentUrl: data.message.attachmentUrl,
          attachmentName: data.message.attachmentName,
          attachmentType: data.message.attachmentType,
          attachmentSize: data.message.attachmentSize,
        }
        
        // Replace optimistic message with actual message
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? actualMessage : msg
        ))
        
        return true
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        console.error('Failed to send message')
        return false
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      console.error('Error sending message:', error)
      return false
    } finally {
      setSending(false)
    }
  }, [userId, sending, session?.user?.id])

  // Adaptive polling - faster when active, slower when inactive
  useEffect(() => {
    if (!userId || !session?.user?.id) return

    fetchMessages(userId, false) // Initial load
    
    const createPollingInterval = () => {
      return setInterval(() => {
        if (isActiveRef.current) {
          fetchMessages(userId, true) // Silent update when active
        }
      }, isActiveRef.current ? 1500 : 10000) // 1.5s when active, 10s when inactive
    }

    let interval = createPollingInterval()

    // Recreate interval when visibility changes
    const handleVisibilityChange = () => {
      clearInterval(interval)
      interval = createPollingInterval()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, session?.user?.id, fetchMessages])

  return {
    messages,
    chatUser,
    loading,
    sending,
    sendMessage,
    refetch: () => userId && fetchMessages(userId, false),
  }
}