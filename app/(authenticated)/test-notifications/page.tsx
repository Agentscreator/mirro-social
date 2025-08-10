"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export default function TestNotificationsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  const createTestNotification = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-invite-notification', {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: "Test notification created successfully!",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create test notification",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating test notification:', error)
      toast({
        title: "Error",
        description: "Failed to create test notification",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        console.log('Current notifications:', data)
        toast({
          title: "Notifications Check",
          description: `Found ${data.notifications?.length || 0} notifications, ${data.unreadCount || 0} unread`,
        })
      }
    } catch (error) {
      console.error('Error checking notifications:', error)
    }
  }

  if (!session) {
    return <div>Please log in to test notifications</div>
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Use these buttons to test the notification system. Check the browser console for detailed logs.
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={createTestNotification}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Test Notification"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={checkNotifications}
            >
              Check Current Notifications
            </Button>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-medium mb-2">How to test invite notifications:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Create a post with an invite (set manual approval)</li>
              <li>Use another account to request the invite</li>
              <li>Check notifications on the post author's account</li>
              <li>Accept or deny the request</li>
              <li>Check notifications on the requester's account</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}