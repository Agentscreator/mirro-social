"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Users, MessageCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface InviteButtonProps {
  postId: number
  postUserId?: string
  className?: string
}

interface InviteData {
  invite: {
    id: number
    inviteDescription?: string
    participantLimit: number
    currentParticipants: number
  }
  post: {
    id: number
    userId: string
    content: string
    autoAcceptInvites: number
    groupName?: string
  }
  postOwner: {
    username: string
    nickname?: string
    profileImage?: string
  }
  userRequest: {
    id: number
    status: "pending" | "accepted" | "denied"
    requestedAt: string
    respondedAt?: string
  } | null
  isOwner: boolean
}

export function InviteButton({ postId, postUserId, className }: InviteButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [isFetching, setIsFetching] = useState(true)

  // Don't show invite button for the post owner
  if (postUserId && session?.user?.id === postUserId) {
    return null
  }

  // Fetch invite data
  const fetchInviteData = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/invite`)
      if (response.ok) {
        const data = await response.json()
        setInviteData(data)
      } else if (response.status === 404) {
        // No invite exists for this post
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
      const response = await fetch(`/api/posts/${postId}/invite`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.autoAccepted) {
          toast({
            title: "Welcome to the group!",
            description: data.groupId 
              ? "You've been automatically added to the group chat."
              : "You've been accepted to this invite.",
          })
          
          // Navigate to group if one was created
          if (data.groupId) {
            setTimeout(() => {
              router.push(`/groups/${data.groupId}`)
            }, 1500)
          }
        } else {
          toast({
            title: "Request Sent!",
            description: "The host will review your request soon.",
          })
        }
        
        // Refresh invite data
        await fetchInviteData()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to send invite request",
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
      // No invite exists for this post
      return null
    }

    const { userRequest, post, invite } = inviteData
    const isAutoAccept = post.autoAcceptInvites === 1
    const isAtLimit = invite.currentParticipants >= invite.participantLimit
    const hasGroupName = !!post.groupName

    if (!userRequest) {
      // No request sent yet
      if (isAutoAccept && !isAtLimit) {
        return {
          text: hasGroupName ? "Join Group" : "Join Now",
          variant: "default" as const,
          className: "bg-green-500 hover:bg-green-600 text-white",
          disabled: false,
          onClick: handleInviteRequest,
          icon: hasGroupName ? MessageCircle : Users,
        }
      } else {
        return {
          text: "Request to Join",
          variant: "default" as const,
          className: "bg-blue-500 hover:bg-blue-600 text-white",
          disabled: isAtLimit,
          onClick: handleInviteRequest,
          icon: Users,
        }
      }
    }

    // User has sent a request
    switch (userRequest.status) {
      case "pending":
        return {
          text: "Request Sent",
          variant: "outline" as const,
          className: "bg-yellow-500/20 border-yellow-500 text-yellow-400",
          disabled: true,
          icon: Users,
        }
      case "accepted":
        return {
          text: hasGroupName ? "In Group" : "Joined",
          variant: "outline" as const,
          className: "bg-green-500/20 border-green-500 text-green-400",
          disabled: true,
          icon: hasGroupName ? MessageCircle : Users,
        }
      case "denied":
        return {
          text: "Request Again",
          variant: "outline" as const,
          className: "bg-gray-500/20 border-gray-500 text-gray-400",
          disabled: false,
          onClick: handleInviteRequest,
          icon: Users,
        }
      default:
        return {
          text: "Request to Join",
          variant: "default" as const,
          className: "bg-blue-500 hover:bg-blue-600 text-white",
          disabled: false,
          onClick: handleInviteRequest,
          icon: Users,
        }
    }
  }

  if (isFetching) {
    return (
      <Button variant="outline" disabled className={`${className} bg-black/40 border-white/20 text-white`}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    )
  }

  const buttonConfig = getButtonConfig()

  // Don't render if no invite exists
  if (!buttonConfig) {
    return null
  }

  const IconComponent = buttonConfig.icon || Users

  return (
    <div className="space-y-2">
      {inviteData?.invite.inviteDescription && (
        <p className="text-white/80 text-sm drop-shadow-lg">
          {inviteData.invite.inviteDescription}
        </p>
      )}
      <Button
        variant={buttonConfig.variant}
        disabled={buttonConfig.disabled || isLoading}
        onClick={buttonConfig.onClick}
        className={`${buttonConfig.className || ""} ${className || ""} backdrop-blur-sm transition-all duration-200`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <IconComponent className="h-4 w-4 mr-2" />
        )}
        {buttonConfig.text}
      </Button>
      {inviteData && (
        <p className="text-white/60 text-xs drop-shadow-lg">
          {inviteData.invite.currentParticipants}/{inviteData.invite.participantLimit} joined
        </p>
      )}
    </div>
  )
}