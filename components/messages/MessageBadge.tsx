"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"

export function MessageBadge() {
  const { data: session } = useSession()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/messages/unread-count')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    // Fetch immediately and then every 30 seconds
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [session?.user?.id])

  if (unreadCount === 0) return null

  return (
    <Badge className="bg-red-500 hover:bg-red-600 text-white min-w-[20px] h-5 text-xs px-1.5 rounded-full absolute -top-1 -right-1">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  )
}