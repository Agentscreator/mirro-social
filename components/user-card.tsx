"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
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
  isMessaging?: boolean
  isLarge?: boolean
}

export function UserCard({ user, onMessage, onViewProfile, isMessaging = false, isLarge = false }: UserCardProps) {
  const [imageError, setImageError] = useState(false)
  const [gifError, setGifError] = useState(false)
  const router = useRouter()
  const usernameInitial = user.username.charAt(0).toUpperCase()

  // Direct MP4 URL from Gifer - using MP4 instead of GIF for better performance
  const DEFAULT_ANIMATED_BG = "https://i.gifer.com/WMDx.mp4"

  // Debug logging
  console.log("UserCard received user:", user.username, "image:", user.image, "profileImage:", user.profileImage)

  // Function to get the best available image URL
  const getBestImageUrl = (user: { image?: string | null; profileImage?: string | null }): string | null => {
    // Priority: profileImage > image > null
    if (user.profileImage && user.profileImage.trim() && !user.profileImage.includes("placeholder")) {
      return user.profileImage
    }
    if (user.image && user.image.trim() && !user.image.includes("placeholder")) {
      return user.image
    }
    return null
  }

  const handleMessage = () => {
    console.log("Message button clicked for user:", user.id, user.username)

    if (onMessage) {
      // Call the provided onMessage callback with the user ID
      onMessage(user.id)
    } else {
      // Default behavior: navigate to the message page
      // Ensure we're using the correct user ID
      const targetUserId = user.id
      console.log("Navigating to message page with userId:", targetUserId)
      router.push(`/messages/${targetUserId}`)
    }
  }

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile()
    }
  }

  const handleImageError = () => {
    console.log("Image failed to load for user:", user.username, "URL:", imageUrl)
    setImageError(true)
  }

  const handleGifError = () => {
    console.log("GIF failed to load for user:", user.username)
    setGifError(true)
  }

  // Get the actual image URL to use
  const imageUrl = getBestImageUrl(user)

  // Improved fallback logic:
  // 1. Show profile/image if available and no error
  // 2. Show animated GIF with initial overlay if primary image fails but GIF loads
  // 3. Show static colored background with initial if both fail
  const shouldShowPrimaryImage = imageUrl && !imageError
  const shouldShowGifFallback = !shouldShowPrimaryImage && !gifError
  const shouldShowStaticFallback = !shouldShowPrimaryImage && gifError

  console.log("Image display logic for", user.username, ":", {
    imageUrl,
    imageError,
    gifError,
    shouldShowPrimaryImage,
    shouldShowGifFallback,
    shouldShowStaticFallback,
  })

  // Dynamic sizing based on isLarge prop
  const cardClasses = cn(
    "border-2 border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gray-800 rounded-2xl",
    isLarge && "shadow-xl hover:shadow-2xl max-w-4xl mx-auto",
  )

  const contentClasses = cn("p-4 sm:p-6", isLarge && "p-6")

  const imageSize = "h-12 w-12"

  return (
    <Card className={cardClasses}>
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
                src={imageUrl! || "/placeholder.svg"}
                alt={user.username}
                fill
                className="object-cover"
                sizes="48px"
                onError={handleImageError}
                priority={false}
                unoptimized={imageUrl?.startsWith("http") && !imageUrl.includes("localhost")}
              />
            ) : shouldShowGifFallback ? (
              <div className="relative w-full h-full">
                <video
                  src={DEFAULT_ANIMATED_BG}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={handleGifError}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-white font-bold text-lg drop-shadow-lg"
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                  >
                    {usernameInitial}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                <span className="text-lg">{usernameInitial}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">@{user.username}</h3>
            <Button
              onClick={handleViewProfile}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors px-3 py-1.5 text-sm font-medium"
            >
              <User className="h-3.5 w-3.5 mr-1.5" />
              View profile
            </Button>
          </div>
        </div>

        {/* Reason text - simple without animation */}
        {user.reason && (
          <div className="mb-4">
            <p className="text-gray-300 leading-relaxed">{user.reason}</p>
          </div>
        )}

        {/* Tags */}
        {user.tags.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {user.tags.map((tag, index) => (
                <Badge
                  key={index}
                  className="bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 transition-colors text-xs px-3 py-1 rounded-full"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
