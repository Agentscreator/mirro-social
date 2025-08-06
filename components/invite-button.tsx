"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Users } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface InviteButtonProps {
  postId: number
  className?: string
}

interface InviteData {
  invite: {
    id: number
    participantLimit: number
    currentParticipants: number
  }
  userRequest: {
    id: number
    status: "pending" | "accepted" | "denied"
    requestedAt: string
    respondedAt?: string
  } | null
  authorSettings: {
    inviteMode: "manual" | "auto"
    autoAcceptLimit: number
  }
}

export function InviteButton({ postId, className }: InviteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [isFetching, setIsFetching] = useState(true)

  // Fetch invite data
  const fetchInviteData = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/invites`)
      if (response.ok) {
        const data = await response.json()
        setInviteData(data)
      } else if (response.status === 404) {
        // No invite exists yet, show initial state
        setInviteData(null)
      }
    } catch (error) {
      console.error("Error fetching invite data:", error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchInviteData()
  }, [postId])

  const handleInviteRequest = async () => {
    setIsLoading(true)
    try {
      console.log("=== FRONTEND INVITE REQUEST DEBUG ===")
      console.log("Sending invite request for post ID:", postId)
      
      const response = await fetch(`/api/posts/${postId}/invites`, {
        method: "POST",
      })

      console.log("Invite request response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        
        if (data.autoAccepted) {
          toast({
            title: "Automatically Accepted!",
            description: "You've been added to this invite.",
          })
        } else {
          toast({
            title: "Request Sent",
            description: "Your invite request has been sent.",
          })
        }
        
        // Refresh invite data
        await fetchInviteData()
      } else {
        const errorText = await response.text()
        console.error("Invite request failed:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }
        toast({
          title: "Error",
          description: error.error || `Failed to send invite request: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending invite request:", error)
      toast({
        title: "Error",
        description: "Failed to send invite request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Determine button state and appearance
  const getButtonConfig = () => {
    if (!inviteData) {
      // No invite data - check if we need manual or auto mode from context
      return {
        text: "Send Request",
        variant: "default" as const,
        disabled: false,
        onClick: handleInviteRequest,
      }
    }

    const { userRequest, authorSettings, invite } = inviteData
    const isManualMode = authorSettings.inviteMode === "manual"
    const isAtLimit = invite.currentParticipants >= invite.participantLimit

    if (!userRequest) {
      // No request sent yet
      if (isManualMode) {
        return {
          text: "Send Request",
          variant: "default" as const,
          className: "bg-orange-500 hover:bg-orange-600",
          disabled: false,
          onClick: handleInviteRequest,
        }
      } else {
        // Auto-accept mode
        if (isAtLimit) {
          return {
            text: "Send Request",
            variant: "default" as const,
            className: "bg-orange-500 hover:bg-orange-600",
            disabled: false,
            onClick: handleInviteRequest,
          }
        } else {
          return {
            text: "Accept Invite",
            variant: "default" as const,
            disabled: false,
            onClick: handleInviteRequest,
          }
        }
      }
    }

    // User has sent a request
    switch (userRequest.status) {
      case "pending":
        if (isManualMode) {
          return {
            text: "Request Sent",
            variant: "default" as const,
            className: "bg-orange-500 hover:bg-orange-600",
            disabled: true,
          }
        } else {
          return {
            text: "Invite Request Sent",
            variant: "default" as const,
            className: "bg-orange-500 hover:bg-orange-600",
            disabled: true,
          }
        }
      case "accepted":
        return {
          text: "Accepted",
          variant: "default" as const,
          className: "bg-blue-500 hover:bg-blue-600",
          disabled: true,
        }
      case "denied":
        return {
          text: "Send Request",
          variant: "default" as const,
          className: "bg-orange-500 hover:bg-orange-600",
          disabled: false,
          onClick: handleInviteRequest,
        }
      default:
        return {
          text: "Send Request",
          variant: "default" as const,
          disabled: false,
          onClick: handleInviteRequest,
        }
    }
  }

  if (isFetching) {
    return (
      <Button variant="outline" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    )
  }

  const buttonConfig = getButtonConfig()

  return (
    <Button
      variant={buttonConfig.variant}
      disabled={buttonConfig.disabled || isLoading}
      onClick={buttonConfig.onClick}
      className={`${buttonConfig.className || ""} ${className || ""}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Users className="h-4 w-4 mr-2" />
      )}
      {buttonConfig.text}
      {inviteData && (
        <span className="ml-2 text-xs opacity-75">
          ({inviteData.invite.currentParticipants}/{inviteData.invite.participantLimit})
        </span>
      )}
    </Button>
  )
}