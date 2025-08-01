"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedText } from "@/components/animated-text"
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
  const DEFAULT_ANIMATED_BG = "https://i.gifer.com/RtKg.mp4"

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
    "border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white rounded-2xl",
    isLarge && "shadow-xl hover:shadow-2xl max-w-4xl mx-auto",
  )

  const contentClasses = cn("p-4 sm:p-6", isLarge && "p-6 sm:p-8 md:p-10 lg:p-12")

  const imageSize = isLarge ? "h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 lg:h-48 lg:w-48" : "h-16 w-16 sm:h-20 sm:w-20"

  const titleSize = isLarge ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl" : "text-lg sm:text-xl"

  const reasonTextSize = isLarge ? "text-sm sm:text-base md:text-lg" : "text-sm"

  return (
    <Card className={cardClasses}>
      <CardContent className={contentClasses}>
        <div
          className={cn(
            "flex flex-col items-center gap-4",
            isLarge ? "sm:gap-6 md:gap-8" : "sm:flex-row sm:items-start sm:gap-4",
          )}
        >
          <div
            className={cn(
              "relative flex-shrink-0 overflow-hidden rounded-full shadow-lg border-3 border-blue-200",
              imageSize,
            )}
          >
            {shouldShowPrimaryImage ? (
              <Image
                src={imageUrl! || "/placeholder.svg"}
                alt={user.username}
                fill
                className="object-cover"
                sizes={
                  isLarge
                    ? "(max-width: 640px) 128px, (max-width: 1024px) 160px, 192px"
                    : "(max-width: 640px) 80px, 64px"
                }
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
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={handleGifError}
                />
                {/* Initial overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={cn(
                      "text-white font-bold drop-shadow-lg",
                      isLarge ? "text-4xl sm:text-5xl lg:text-6xl" : "text-xl",
                    )}
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                  >
                    {usernameInitial}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                <span className={cn(isLarge ? "text-4xl sm:text-5xl lg:text-6xl" : "text-xl")}>{usernameInitial}</span>
              </div>
            )}
          </div>

          <div className={cn("flex-1 text-center w-full", !isLarge && "sm:text-left")}>
            <h3 className={cn("mb-3 font-bold text-blue-600", titleSize)}>@{user.username}</h3>

            {user.reason && (
              <div className={cn("mt-4", isLarge && "mt-6")}>
                <div className={cn("leading-relaxed text-gray-700 max-w-2xl mx-auto", reasonTextSize)}>
                  <AnimatedText text={user.reason} delay={500} speed={20} />
                </div>
              </div>
            )}

            {user.tags.length > 0 && (
              <div className={cn("mt-4", isLarge && "mt-6")}>
                <h4 className={cn("mb-3 font-semibold text-blue-600", isLarge ? "text-base sm:text-lg" : "text-sm")}>
                  Tags:
                </h4>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {user.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      className={cn(
                        "rounded-full font-medium tag-hover bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors",
                        isLarge ? "text-sm px-4 py-2" : "text-xs px-3 py-1",
                      )}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div
              className={cn(
                "flex flex-col sm:flex-row justify-center items-center gap-3",
                "mt-6",
                isLarge && "mt-8 gap-4",
              )}
            >
              <Button
                onClick={handleMessage}
                disabled={isMessaging}
                className={cn(
                  "rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50 min-w-[120px] shadow-md hover:shadow-lg transition-all",
                  isLarge && "px-8 py-4 text-lg min-w-[140px]",
                )}
              >
                {isMessaging ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <MessageSquare className={cn("h-4 w-4", isLarge && "h-5 w-5")} />
                )}
                <span>Message</span>
              </Button>
              <Button
                onClick={handleViewProfile}
                variant="outline"
                className={cn(
                  "rounded-full border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 flex items-center gap-2 min-w-[120px] shadow-md hover:shadow-lg transition-all",
                  isLarge && "px-8 py-4 text-lg min-w-[140px]",
                )}
              >
                <User className={cn("h-4 w-4", isLarge && "h-5 w-5")} />
                <span>Profile</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
