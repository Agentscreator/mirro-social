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

  // Hide navigation during active conversations but show on main messages page
  const isInActiveConversation = pathname.match(/^\/messages\/[^\/]+$/) || pathname.match(/^\/groups\/[^\/]+$/)
  const isMainMessagesPage = pathname === "/messages"
  
  // Don't hide navigation completely - this might be causing the stuck issue
  // if (isInActiveConversation && !isMainMessagesPage) {
  //   return null
  // }

  const routes = [
    {
      href: "/feed",
      icon: Home,
      label: "Feed",
      active: pathname === "/feed",
    },    
    {
      href: "/discover",
      icon: Search,
      label: "Discover",
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
      label: "You",
      active: pathname === "/profile",
    }
  ]

  return (
    <>
      {/* Desktop navigation (side) */}
      <div className="fixed left-0 top-0 z-50 hidden lg:flex lg:flex-col lg:items-center lg:justify-between lg:py-6 h-screen w-16 border-r border-gray-800 bg-black">
        <Link href="/feed" className="flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
        </Link>
        <div className="flex flex-col items-center space-y-6">
          {routes.slice(0, 2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10",
                route.active && "bg-white/20",
              )}
              aria-label={route.label}
            >
              <route.icon className={cn("h-5 w-5", route.active ? "text-white" : "text-gray-400")} />
            </Link>
          ))}
          
          {/* Create Video Button */}
          <Link
            href="/create-video"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105 shadow-lg"
            aria-label="Create Video"
          >
            <Plus className="h-5 w-5 text-white" />
          </Link>
          
          {routes.slice(2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 relative",
                route.active && "bg-white/20",
              )}
              aria-label={route.label}
            >
              <route.icon className={cn("h-5 w-5", route.active ? "text-white" : "text-gray-400")} />
              {route.href === "/messages" && <MessageBadge />}
            </Link>
          ))}
        </div>
        <div className="h-10"></div>
      </div>

      {/* Mobile web navigation (bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-black pb-safe-bottom md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {routes.slice(0, 2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
                route.active ? "text-white" : "text-gray-400",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  route.active && "bg-white/20",
                )}
              >
                <route.icon className="h-5 w-5" />
              </div>
              <span className="mt-0.5 text-[10px] font-medium">{route.label}</span>
            </Link>
          ))}
          
          {/* Create Video Button - Centered */}
          <Link
            href="/create-video"
            className="flex flex-col items-center justify-center p-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105 shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <span className="mt-0.5 text-[10px] font-medium text-white">Create</span>
          </Link>
          
          {routes.slice(2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
                route.active ? "text-white" : "text-gray-400",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full relative",
                  route.active && "bg-white/20",
                )}
              >
                <route.icon className="h-5 w-5" />
                {route.href === "/messages" && <MessageBadge />}
              </div>
              <span className="mt-0.5 text-[10px] font-medium">{route.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}