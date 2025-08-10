"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface InviteRequestNotificationProps {
  notification: {
    id: number
    title: string
    message: string
    data?: string
    fromUser?: {
      id: string
      username: string
      nickname?: string
      profileImage?: string
    }
  }
  onUpdate: () => void
}

export function InviteRequestNotification({ notification, onUpdate }: InviteRequestNotificationProps) {
  const [responding, setResponding] = useState(false)

  const handleResponse = async (action: 'accept' | 'deny') => {
    if (responding) return

    setResponding(true)
    try {
      const data = notification.data ? JSON.parse(notification.data) : {}
      const { inviteRequestId } = data

      if (!inviteRequestId) {
        toast({
          title: "Error",
          description: "Invalid invite request data",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/invite-requests/${inviteRequestId}/${action}`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: action === 'accept' ? "Invite accepted" : "Invite denied",
          description: `You have ${action}ed the invite request.`,
        })
        onUpdate() // Refresh notifications
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || `Failed to ${action} invite`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error ${action}ing invite:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} invite request`,
        variant: "destructive",
      })
    } finally {
      setResponding(false)
    }
  }

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors bg-blue-50 border-l-2 border-l-blue-500">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <User className="h-4 w-4 text-blue-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {notification.message}
          </p>
          
          {/* Action buttons for invite requests */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => handleResponse('accept')}
              disabled={responding}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleResponse('deny')}
              disabled={responding}
              className="border-red-500 text-red-500 hover:bg-red-50"
            >
              <X className="h-3 w-3 mr-1" />
              Deny
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}