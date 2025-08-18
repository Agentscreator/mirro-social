"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MessageSquare, User, Heart, Sparkles } from "lucide-react"
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

  return (
    <div className="relative group envelope-float">
      {/* Elegant Envelope Card */}
      <div className={cn(
        "relative bg-gradient-to-br from-slate-50 via-white to-slate-100 envelope-pattern",
        "border border-slate-200/60 rounded-3xl envelope-glow",
        "transition-all duration-700 ease-out hover-lift",
        "before:absolute before:inset-0 before:rounded-3xl before:shimmer-effect before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        "overflow-hidden envelope-glass",
        isLarge ? "max-w-2xl mx-auto min-h-[600px]" : "max-w-lg mx-auto min-h-[500px]"
      )}>
        
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1)_0%,transparent_50%)]" />
        </div>

        {/* Envelope Seal */}
        <div className="absolute top-6 right-6 w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full border-2 border-amber-300/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
          <Sparkles className="w-7 h-7 text-amber-600/80 sparkle-rotate" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 p-8 h-full flex flex-col">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-slate-400 rounded-full floating-dots"></div>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
              <Heart className="w-4 h-4 text-rose-400 heartbeat" />
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full floating-dots"></div>
            </div>
            <h2 className="text-2xl font-light text-slate-700 tracking-wide gradient-text">
              Dear Friend
            </h2>
          </div>

          {/* Profile Section */}
          <div className="flex-1 flex flex-col items-center text-center">
            
            {/* Profile Image */}
            <div className="relative mb-6 group/image">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-200/50 transition-transform duration-500 group-hover/image:scale-105">
                {shouldShowPrimaryImage ? (
                  <Image
                    src={imageUrl! || "/placeholder.svg"}
                    alt={user.username}
                    fill
                    className="object-cover"
                    sizes="128px"
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-3xl drop-shadow-lg">
                        {usernameInitial}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-3xl">
                    {usernameInitial}
                  </div>
                )}
              </div>
              
              {/* Floating elements around profile */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-100 rounded-full border-2 border-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200">
                <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
              </div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-100 rounded-full border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-all duration-500 delay-300"></div>
            </div>

            {/* Username */}
            <div className="mb-6">
              <h3 className="text-3xl font-light text-slate-800 tracking-wide mb-2 gradient-text">
                @{user.username}
              </h3>
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-auto"></div>
            </div>

            {/* Reason - Beautiful Typography */}
            {user.reason && (
              <div className="mb-8 max-w-md">
                <p className="text-slate-600 leading-relaxed text-lg font-light italic text-center">
                  "{user.reason}"
                </p>
              </div>
            )}

            {/* Tags - Elegant Pills */}
            {user.tags.length > 0 && (
              <div className="mb-8">
                <div className="flex flex-wrap gap-3 justify-center">
                  {user.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-medium border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow duration-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Section */}
            <div className="mt-auto pt-6">
              <Button
                onClick={handleViewProfile}
                className="button-premium text-white rounded-full px-8 py-3 font-medium tracking-wide"
              >
                <User className="w-5 h-5 mr-2" />
                View Profile
              </Button>
              <p className="text-slate-400 text-sm mt-3 font-light tracking-wide">
                Tap to view profile
              </p>
              
              {/* Bottom Decorative Line */}
              <div className="flex items-center justify-center mt-6 gap-2">
                <div className="w-2 h-2 bg-slate-300 rounded-full floating-dots"></div>
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                <div className="w-1 h-1 bg-slate-400 rounded-full floating-dots"></div>
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                <div className="w-2 h-2 bg-slate-300 rounded-full floating-dots"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Elegant Corner Accents */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-white/60 to-transparent rounded-tl-3xl"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-slate-100/60 to-transparent rounded-br-3xl"></div>
      </div>
    </div>
  )
}
