"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"

export function useTypingIndicator(userId?: string) {
  const { data: session } = useSession()
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Send typing status to server
  const sendTypingStatus = useCallback(async (typing: boolean) => {
    if (!userId || !session?.user?.id) return

    try {
      await fetch('/api/messages/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: userId,
          isTyping: typing,
        }),
      })
    } catch (error) {
      console.error('Error sending typing status:', error)
    }
  }, [userId, session?.user?.id])

  // Check if other user is typing
  const checkTypingStatus = useCallback(async () => {
    if (!userId || !session?.user?.id) return

    try {
      const response = await fetch(`/api/messages/typing?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setIsOtherUserTyping(data.isTyping)
      }
    } catch (error) {
      console.error('Error checking typing status:', error)
    }
  }, [userId, session?.user?.id])

  // Start typing
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      sendTypingStatus(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingStatus(false)
    }, 3000)
  }, [isTyping, sendTypingStatus])

  // Stop typing
  const stopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false)
      sendTypingStatus(false)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }, [isTyping, sendTypingStatus])

  // Poll for typing status every 2 seconds
  useEffect(() => {
    if (!userId || !session?.user?.id) return

    checkTypingStatus()
    const interval = setInterval(checkTypingStatus, 2000)

    return () => clearInterval(interval)
  }, [userId, session?.user?.id, checkTypingStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping) {
        sendTypingStatus(false)
      }
    }
  }, [isTyping, sendTypingStatus])

  return {
    isOtherUserTyping,
    startTyping,
    stopTyping,
  }
}