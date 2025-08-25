"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, User, Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, memo, useCallback } from "react"
import { useRouter } from "next/navigation"

interface UserCardProps {
  user: {
    id: string | number
    username: string
    image: string
    profileImage?: string
    reason?: string
    tags: string[]
  }
  onMessage?: (userId: string | number) => void
  onViewProfile?: () => void
  onSaveProfile?: (userId: string | number) => Promise<void>
  onUnsaveProfile?: (userId: string | number) => Promise<void>
  isMessaging?: boolean
  isLarge?: boolean
  isSaved?: boolean
}

const OptimizedUserCard = memo(function OptimizedUserCard({ 
  user, 
  onMessage, 
  onViewProfile, 
  onSaveProfile, 
  onUnsaveProfile, 
  isMessaging = false, 
  isLarge = false, 
  isSaved = false 
}: UserCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const usernameInitial = user.username.charAt(0).toUpperCase()

  // Memoized callbacks for better performance
  const handleMessage = useCallback(() => {
    if (onMessage) {
      onMessage(user.id)
    } else {
      router.push(`/messages/${user.id}`)
    }
  }, [onMessage, user.id, router])

  const handleViewProfile = useCallback(() => {
    if (onViewProfile) {
      onViewProfile()
    }
  }, [onViewProfile])

  const handleSaveProfile = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (isSaved && onUnsaveProfile) {
        await onUnsaveProfile(user.id)
      } else if (!isSaved && onSaveProfile) {
        await onSaveProfile(user.id)
      }
    } catch (error) {
      console.error('Error toggling save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, isSaved, onUnsaveProfile, onSaveProfile, user.id])

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Get the best available image URL
  const getBestImageUrl = useCallback((user: { image?: string | null; profileImage?: string | null }): string | null => {
    if (user.profileImage && user.profileImage.trim() && !user.profileImage.includes("placeholder")) {
      return user.profileImage
    }
    if (user.image && user.image.trim() && !user.image.includes("placeholder")) {
      return user.image
    }
    return null
  }, [])

  const imageUrl = getBestImageUrl(user)
  const shouldShowPrimaryImage = imageUrl && !imageError

  // Dynamic sizing based on isLarge prop
  const cardClasses = cn(
    "border-2 border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gray-800 rounded-2xl",
    isLarge && "shadow-xl hover:shadow-2xl max-w-4xl mx-auto",
  )

  const contentClasses = cn("p-4 sm:p-6", isLarge && "p-6")
  const imageSize = "h-12 w-12"

  return (
    <Card 
      className={cn(cardClasses, "cursor-pointer")} 
      onClick={handleViewProfile}
    >
      <CardContent className={contentClasses}>
        {/* Header with profile picture and username inline */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={cn(
              "relative flex-shrink-0 overflow-hidden rounded-full shadow-lg border-2 border-gray-600",
              imageSize,
            )}
          >
            {shouldShowPrimaryImage ? (
              <Image
                src={imageUrl!}
                alt={user.username}
                fill
                className="object-cover"
                sizes="48px"
                onError={handleImageError}
                priority={false}
                loading="lazy"
                unoptimized={imageUrl?.startsWith("http") && !imageUrl.includes("localhost")}
              />
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                <span className="text-lg">{usernameInitial}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">@{user.username}</h3>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleViewProfile()
              }}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors px-3 py-1.5 text-sm font-medium"
            >
              <User className="h-3.5 w-3.5 mr-1.5" />
              View profile
            </Button>
          </div>
        </div>

        {/* Reason text with optimized loading state */}
        {user.reason && (
          <div className="mb-4">
            {user.reason === "Generating match explanation..." ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-blue-400 text-sm font-medium">Generating match explanation...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-500/30 to-transparent animate-[shimmer_2s_infinite]"></div>
                  </div>
                  <div className="h-4 bg-gray-700 rounded-md w-4/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-500/30 to-transparent animate-[shimmer_2s_infinite]" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                  <div className="h-4 bg-gray-700 rounded-md w-3/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-500/30 to-transparent animate-[shimmer_2s_infinite]" style={{ animationDelay: '0.6s' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 leading-relaxed">{user.reason}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handleMessage()
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            disabled={isMessaging}
          >
            {isMessaging ? (
              <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent mr-2"></div>
            ) : (
              <MessageSquare className="h-4 w-4 mr-2" />
            )}
            {isMessaging ? "Messaging..." : "Message"}
          </Button>
          
          {/* Save Profile Button */}
          {(onSaveProfile || onUnsaveProfile) && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleSaveProfile()
              }}
              variant="outline"
              className="border-gray-600 hover:bg-gray-700 transition-colors"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border border-gray-400 border-t-transparent"></div>
              ) : isSaved ? (
                <BookmarkCheck className="h-4 w-4 text-blue-500" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

export { OptimizedUserCard as UserCard }