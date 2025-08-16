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
    communityName?: string
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
        
        // Always show welcome message since we auto-join
        toast({
          title: "Welcome to the community!",
          description: data.groupId 
            ? "You've been added to the community chat."
            : "You've joined this community.",
        })
        
        // Navigate to group if one was created
        if (data.groupId) {
          setTimeout(() => {
            router.push(`/groups/${data.groupId}`)
          }, 1500)
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
    const isAtLimit = false // Removed limit check to allow unlimited participants

    if (!userRequest) {
      // No request sent yet - always auto-join
      return {
        text: "Join",
        variant: "default" as const,
        disabled: isAtLimit,
        onClick: handleInviteRequest,
        icon: MessageCircle,
      }
    }

    // User has sent a request
    switch (userRequest.status) {
      case "accepted":
        return {
          text: "Joined",
          variant: "outline" as const,
          disabled: true,
          icon: MessageCircle,
        }
      default:
        // For all other cases (pending, denied), allow re-joining
        return {
          text: "Join",
          variant: "default" as const,
          disabled: isAtLimit,
          onClick: handleInviteRequest,
          icon: MessageCircle,
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
    <div className="space-y-3">
      {/* Description */}
      {inviteData?.invite.inviteDescription && (
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <p className="text-white text-sm font-medium leading-relaxed">
            {inviteData.invite.inviteDescription}
          </p>
        </div>
      )}
      
      {/* Location (if available) */}
      {inviteData?.post.communityName && (
        <div className="flex items-center text-white/80 text-xs">
          <div className="w-2 h-2 bg-white/60 rounded-full mr-2"></div>
          <span>{inviteData.post.communityName}</span>
        </div>
      )}
      
      {/* Simple Join Button */}
      <Button
        variant="default"
        disabled={buttonConfig.disabled || isLoading}
        onClick={buttonConfig.onClick}
        className="w-full bg-white text-black hover:bg-gray-100 font-semibold py-3 px-6 rounded-full transition-all duration-200 shadow-lg border-2 border-white"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <IconComponent className="h-4 w-4 mr-2" />
        )}
        {buttonConfig.text}
      </Button>
    </div>
  )
}