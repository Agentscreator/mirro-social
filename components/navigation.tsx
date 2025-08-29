"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Search, User, MessageSquare, Bell, Plus } from "lucide-react"
import { MirroIcon } from "@/components/logo"
import { cn } from "@/lib/utils"
import { useState, useCallback, memo, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { MessageBadge } from "@/components/messages/MessageBadge"
import { WatchNavigation } from "@/components/watch-navigation"
import { isNativeApp, isMobileDevice } from "@/lib/mobile-utils"

// Lazy load heavy components
import dynamic from "next/dynamic"
const NewPostCreator = dynamic(() => import("@/components/new-post/NewPostCreator").then(mod => ({ default: mod.NewPostCreator })), {
  ssr: false,
  loading: () => null
})

// Memoized navigation item component
const NavigationItem = memo(({ route, className }: { route: any, className?: string }) => (
  <Link
    key={route.href}
    href={route.href}
    className={cn(
      "flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10",
      route.active && "bg-white/20",
      className
    )}
    aria-label={route.label}
  >
    <route.icon className={cn("h-5 w-5", route.active ? "text-white" : "text-gray-400")} />
    <span className="sr-only">{route.label}</span>
    {route.href === "/messages" && <MessageBadge />}
  </Link>
))

NavigationItem.displayName = "NavigationItem"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isNative, setIsNative] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect environment
  useEffect(() => {
    setIsNative(isNativeApp())
    setIsMobile(isMobileDevice())
  }, [])

  // Hide navigation during active conversations for professional experience
  const isInActiveConversation = pathname.match(/^\/messages\/[^\/]+$/) || pathname.match(/^\/groups\/[^\/]+$/)
  
  if (isInActiveConversation) {
    return null
  }

  const routes = [
    {
      href: "/feed",
      icon: Home,
      label: "Feed",
      active: pathname === "/feed",
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

  const handlePostCreated = useCallback((newPost: any) => {
    console.log("New post created:", newPost);
    toast({
      title: "Success",
      description: "Your invitation has been posted!",
    });
    
    // Dispatch custom event to refresh feed
    window.dispatchEvent(new CustomEvent('postCreated', { detail: newPost }));
    
    // Navigate to feed page if not already there
    if (pathname !== '/feed') {
      router.push('/feed');
    }
  }, [pathname, router, toast])

  // Native app navigation - cleaner, more native feel
  if (isNative) {
    return (
      <>
        {/* Native app bottom navigation - simplified */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-gray-800/50">
          <div className="flex h-20 items-center justify-center px-4 pb-safe-bottom">
            <div className="flex items-center justify-between w-full max-w-sm">
              {/* Left - Feed */}
              <Link
                href="/feed"
                className={cn(
                  "flex flex-col items-center justify-center p-3 transition-all duration-200",
                  pathname === "/feed" ? "text-blue-400" : "text-gray-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                    pathname === "/feed" && "bg-blue-500/20 scale-110",
                  )}
                >
                  <Home className={cn("h-5 w-5", pathname === "/feed" && "text-blue-400")} />
                </div>
                <span className={cn(
                  "mt-1 text-xs font-medium transition-all duration-200",
                  pathname === "/feed" ? "text-blue-400" : "text-gray-500"
                )}>
                  Feed
                </span>
              </Link>
              
              {/* Center - Create Button */}
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="flex flex-col items-center justify-center p-3"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <span className="mt-1 text-xs font-medium text-blue-400">Create</span>
              </button>
              
              {/* Right - Messages */}
              <Link
                href="/messages"
                className={cn(
                  "flex flex-col items-center justify-center p-3 transition-all duration-200",
                  pathname === "/messages" ? "text-blue-400" : "text-gray-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 relative",
                    pathname === "/messages" && "bg-blue-500/20 scale-110",
                  )}
                >
                  <MessageSquare className={cn("h-5 w-5", pathname === "/messages" && "text-blue-400")} />
                  <MessageBadge />
                </div>
                <span className={cn(
                  "mt-1 text-xs font-medium transition-all duration-200",
                  pathname === "/messages" ? "text-blue-400" : "text-gray-500"
                )}>
                  Messages
                </span>
              </Link>
              
              {/* Far Right - Profile */}
              <Link
                href="/profile"
                className={cn(
                  "flex flex-col items-center justify-center p-3 transition-all duration-200",
                  pathname === "/profile" ? "text-blue-400" : "text-gray-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                    pathname === "/profile" && "bg-blue-500/20 scale-110",
                  )}
                >
                  <User className={cn("h-5 w-5", pathname === "/profile" && "text-blue-400")} />
                </div>
                <span className={cn(
                  "mt-1 text-xs font-medium transition-all duration-200",
                  pathname === "/profile" ? "text-blue-400" : "text-gray-500"
                )}>
                  You
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Apple Watch Navigation */}
        <WatchNavigation />

        {/* New Post Creator */}
        <NewPostCreator
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onPostCreated={handlePostCreated}
        />
      </>
    )
  }

  // Web navigation - original design
  return (
    <>
      {/* Desktop navigation (side) - FORCE HIDE on mobile */}
      <div className="fixed left-0 top-0 z-50 hidden lg:flex lg:flex-col lg:items-center lg:justify-between lg:py-6 h-screen w-16 border-r border-gray-800 bg-black max-lg:!hidden">
        <Link href="/feed" className="flex items-center justify-center">
          <MirroIcon size="md" />
        </Link>
        <div className="flex flex-col items-center space-y-6">
          {/* Feed */}
          <NavigationItem route={routes[0]} />
          
          {/* Create Post Button */}
          <button
            onClick={() => setIsCreatePostOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
            aria-label="Create Post"
          >
            <Plus className="h-5 w-5 text-white" />
            <span className="sr-only">Create</span>
          </button>
          
          {/* Messages */}
          <NavigationItem route={routes[1]} className="relative" />
          
          {/* Profile */}
          <NavigationItem route={routes[2]} />
        </div>
        <div className="h-10"></div> {/* Spacer */}
      </div>

      {/* Mobile web navigation (bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-black pb-safe-bottom md:hidden">
        <div className="flex h-16 items-center justify-center px-2">
          <div className="flex items-center justify-between w-full max-w-sm">
            {/* Left side - Feed */}
            <Link
              href="/feed"
              className={cn(
                "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
                pathname === "/feed" ? "text-white" : "text-gray-400",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  pathname === "/feed" && "bg-white/20",
                )}
              >
                <Home className="h-5 w-5" />
              </div>
              <span className="sr-only">Feed</span>
            </Link>
            
            {/* Center - Create Button */}
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="flex flex-col items-center justify-center p-2"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <span className="sr-only">Create</span>
            </button>
            
            {/* Right side - Messages */}
            <Link
              href="/messages"
              className={cn(
                "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
                pathname === "/messages" ? "text-white" : "text-gray-400",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full relative",
                  pathname === "/messages" && "bg-white/20",
                )}
              >
                <MessageSquare className="h-5 w-5" />
                <MessageBadge />
              </div>
              <span className="sr-only">Messages</span>
            </Link>
            
            {/* Far right - Profile */}
            <Link
              href="/profile"
              className={cn(
                "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
                pathname === "/profile" ? "text-white" : "text-gray-400",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  pathname === "/profile" && "bg-white/20",
                )}
              >
                <User className="h-5 w-5" />
              </div>
              <span className="sr-only">Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Apple Watch Navigation */}
      <WatchNavigation />

      {/* New Post Creator */}
      <NewPostCreator
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </>
  )
}