"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bell, Check, X, Users, MessageCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "@/hooks/use-toast"

interface Notification {
  id: number
  type: string
  title: string
  message: string
  data?: string
  isRead: number
  createdAt: string
  actionUrl?: string
  fromUser?: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (notificationIds: number[]) => {
    console.log('Marking notifications as read:', notificationIds)
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      })

      console.log('Mark as read response status:', response.status)
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('Mark as read response:', responseData)
        
        // Update local state immediately
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, isRead: 1 }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
        
        // Refresh notifications to ensure server state is synced
        setTimeout(() => {
          fetchNotifications()
        }, 500)
      } else {
        const errorText = await response.text()
        console.error('Failed to mark notifications as read:', response.status, errorText)
        // Refresh notifications to get current state
        fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      // Refresh notifications to get current state
      fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    console.log('Marking all notifications as read')
    
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Mark all as read response status:', response.status)
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('Mark all as read response:', responseData)
        
        // Update local state immediately
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: 1 }))
        )
        setUnreadCount(0)
        
        // Refresh notifications to ensure server state is synced
        setTimeout(() => {
          fetchNotifications()
        }, 500)
      } else {
        const errorText = await response.text()
        console.error('Failed to mark all notifications as read:', response.status, errorText)
        // Refresh notifications to get current state
        fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      // Refresh notifications to get current state
      fetchNotifications()
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread - do this immediately for better UX
    if (notification.isRead === 0) {
      // Update UI immediately
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notification.id 
            ? { ...notif, isRead: 1 }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // Then update server
      await markAsRead([notification.id])
    }

    // Handle different notification types
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    } else if (notification.type === 'invite_request') {
      // Handle invite request - could open a modal or navigate
      try {
        const data = notification.data ? JSON.parse(notification.data) : {}
        if (data.postId) {
          window.location.href = `/posts/${data.postId}`
        }
      } catch (error) {
        console.error('Error parsing notification data:', error)
      }
    }
  }

  const respondToInviteRequest = async (notificationId: number, action: 'accept' | 'deny') => {
    const notification = notifications.find(n => n.id === notificationId)
    if (!notification) return

    try {
      const data = notification.data ? JSON.parse(notification.data) : {}
      const requestId = data.inviteRequestId

      if (!requestId) {
        toast({
          title: "Error",
          description: "Invalid request data",
          variant: "destructive",
        })
        return
      }

      setLoading(true)
      const response = await fetch(`/api/invite-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Request ${action}ed successfully`,
        })
        
        // Mark notification as read and refresh
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: 1 }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        await markAsRead([notificationId])
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || `Failed to ${action} request`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} request`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invite_request':
      case 'invite_accepted':
      case 'invite_auto_accepted':
        return <Users className="h-4 w-4" />
      case 'group_member_joined':
      case 'group_invite':
        return <Users className="h-4 w-4" />
      case 'message':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [session?.user?.id])

  if (!session?.user?.id) return null

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full text-white hover:bg-gray-800"
        onClick={() => setShowNotifications(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 hover:bg-red-600">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700 max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Notifications
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 overflow-y-auto max-h-96">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    notification.isRead === 0
                      ? 'bg-blue-900/20 border-blue-700/50 hover:bg-blue-900/30'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {notification.fromUser ? (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={notification.fromUser.profileImage} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {(notification.fromUser.nickname || notification.fromUser.username)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        
                        {notification.isRead === 0 && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>

                      {/* Action buttons for invite requests */}
                      {notification.type === 'invite_request' && notification.isRead === 0 && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              respondToInviteRequest(notification.id, 'deny')
                            }}
                            disabled={loading}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs bg-blue-500 hover:bg-blue-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              respondToInviteRequest(notification.id, 'accept')
                            }}
                            disabled={loading}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}