"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, User, MessageSquare, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { MessageBadge } from "@/components/messages/MessageBadge"
import { isNativeApp, isMobileDevice } from "@/lib/mobile-utils"

export function InstagramNavigation() {
  const pathname = usePathname()
  const [isNative, setIsNative] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect environment
  useEffect(() => {
    setIsNative(isNativeApp())
    setIsMobile(isMobileDevice())
  }, [])

  // Hide navigation during active conversations
  const isInActiveConversation = pathname.match(/^\/messages\/[^\/]+$/) || pathname.match(/^\/groups\/[^\/]+$/)
  
  if (isInActiveConversation) {
    return null
  }

  const routes = [
    {
      href: "/feed",
      icon: Home,
      label: "Home",
      active: pathname === "/feed",
    },    
    {
      href: "/discover",
      icon: Search,
      label: "Search",
      active: pathname === "/discover",
    },
    {
      href: "/messages",
      icon: MessageSquare,
      label: "Messages",
      active: pathname === "/messages",
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      active: pathname === "/profile",
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800 pb-safe-bottom">
      <div className="flex h-12 items-center justify-center px-4">
        <div className="flex w-full max-w-md items-center justify-around">
          {/* Home */}
          <Link
            href="/feed"
            className="flex items-center justify-center p-3"
          >
            <Home 
              className={cn(
                "h-6 w-6 transition-colors",
                pathname === "/feed" ? "text-white" : "text-gray-400"
              )} 
              fill={pathname === "/feed" ? "currentColor" : "none"}
            />
          </Link>

          {/* Search */}
          <Link
            href="/discover"
            className="flex items-center justify-center p-3"
          >
            <Search 
              className={cn(
                "h-6 w-6 transition-colors",
                pathname === "/discover" ? "text-white" : "text-gray-400"
              )}
            />
          </Link>

          {/* Create - Perfectly centered */}
          <Link
            href="/create-video"
            className="flex items-center justify-center p-3"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-gray-400 hover:border-white transition-colors">
              <Plus className="h-3 w-3 text-gray-400 hover:text-white transition-colors" />
            </div>
          </Link>

          {/* Messages */}
          <Link
            href="/messages"
            className="flex items-center justify-center p-3 relative"
          >
            <MessageSquare 
              className={cn(
                "h-6 w-6 transition-colors",
                pathname.startsWith("/messages") ? "text-white" : "text-gray-400"
              )}
            />
            <MessageBadge />
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className="flex items-center justify-center p-3"
          >
            <div 
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-colors bg-gray-600",
                pathname.startsWith("/profile") 
                  ? "border-white" 
                  : "border-gray-400"
              )}
            />
          </Link>
        </div>
      </div>
    </div>
  )
}