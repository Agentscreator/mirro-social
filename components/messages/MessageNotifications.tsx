"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface MessageNotification {
  id: string
  senderId: string
  senderName: string
  senderImage?: string
  content: string
  timestamp: Date
}

export function MessageNotifications() {
  const { data: session } = useSession()
  const router = useRouter()
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  useEffect(() => {
    if (!session?.user?.id) return

    const checkForNewMessages = async () => {
      try {
        const response = await fetch('/api/messages')
        if (response.ok) {
          const data = await response.json()
          const conversations = data.conversations || []
          
          // Check for new messages since last check
          conversations.forEach((conv: any) => {
            const lastMessageTime = new Date(conv.lastMessageTime)
            if (lastMessageTime > lastCheck && conv.lastMessageSenderId !== session.user.id) {
              // Show notification for new message
              toast({
                title: `New message from ${conv.nickname || conv.username}`,
                description: conv.lastMessage.length > 50 
                  ? conv.lastMessage.substring(0, 50) + '...'
                  : conv.lastMessage,
                action: (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/messages/${conv.userId}`)}
                  >
                    Reply
                  </Button>
                ),
              })
            }
          })
          
          setLastCheck(new Date())
        }
      } catch (error) {
        console.error('Error checking for new messages:', error)
      }
    }

    // Check immediately and then every 10 seconds
    checkForNewMessages()
    const interval = setInterval(checkForNewMessages, 10000)

    return () => clearInterval(interval)
  }, [session?.user?.id, lastCheck, router])

  return null // This component doesn't render anything visible
}