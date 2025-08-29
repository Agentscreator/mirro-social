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
        {/* Native app bottom navigation - Enhanced */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-gray-800/50">
          <div className="relative">
            {/* Gradient overlay for premium feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            
            <div className="flex h-22 items-center justify-center px-6 pb-safe-bottom pt-2">
              {/* Navigation Grid - Perfectly centered */}
              <div className="grid grid-cols-4 gap-0 w-full max-w-sm items-center">
                
                {/* Feed */}
                <Link
                  href="/feed"
                  className={cn(
                    "flex flex-col items-center justify-center p-3 transition-all duration-300 group",
                    pathname === "/feed" ? "text-blue-400" : "text-gray-500",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                      pathname === "/feed" 
                        ? "bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/25" 
                        : "group-hover:bg-white/10 group-hover:scale-105",
                    )}
                  >
                    <Home className={cn(
                      "h-5 w-5 transition-all duration-300", 
                      pathname === "/feed" ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                    )} />
                  </div>
                  <span className={cn(
                    "mt-1 text-xs font-medium transition-all duration-300",
                    pathname === "/feed" ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                  )}>
                    Feed
                  </span>
                </Link>
                
                {/* Messages */}
                <Link
                  href="/messages"
                  className={cn(
                    "flex flex-col items-center justify-center p-3 transition-all duration-300 group",
                    pathname === "/messages" ? "text-blue-400" : "text-gray-500",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 relative",
                      pathname === "/messages" 
                        ? "bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/25" 
                        : "group-hover:bg-white/10 group-hover:scale-105",
                    )}
                  >
                    <MessageSquare className={cn(
                      "h-5 w-5 transition-all duration-300", 
                      pathname === "/messages" ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                    )} />
                    <MessageBadge />
                  </div>
                  <span className={cn(
                    "mt-1 text-xs font-medium transition-all duration-300",
                    pathname === "/messages" ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                  )}>
                    Messages
                  </span>
                </Link>
                
                {/* Create Button - CENTER */}
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="flex flex-col items-center justify-center p-3 group"
                >
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                    
                    {/* Main button */}
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/40 group-active:scale-95">
                      <Plus className="h-7 w-7 text-white transition-transform duration-300 group-hover:rotate-90" />
                    </div>
                  </div>
                  <span className="mt-1 text-xs font-medium text-blue-400 transition-all duration-300 group-hover:text-blue-300">
                    Create
                  </span>
                </button>
                
                {/* Profile */}
                <Link
                  href="/profile"
                  className={cn(
                    "flex flex-col items-center justify-center p-3 transition-all duration-300 group",
                    pathname === "/profile" ? "text-blue-400" : "text-gray-500",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                      pathname === "/profile" 
                        ? "bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/25" 
                        : "group-hover:bg-white/10 group-hover:scale-105",
                    )}
                  >
                    <User className={cn(
                      "h-5 w-5 transition-all duration-300", 
                      pathname === "/profile" ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                    )} />
                  </div>
                  <span className={cn(
                    "mt-1 text-xs font-medium transition-all duration-300",
                    pathname === "/profile" ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                  )}>
                    You
                  </span>
                </Link>
                
              </div>
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
      {/* Desktop navigation (side) - Enhanced */}
      <div className="fixed left-0 top-0 z-50 hidden lg:flex lg:flex-col lg:items-center lg:justify-between lg:py-6 h-screen w-18 border-r border-gray-800/50 bg-black/95 backdrop-blur-xl max-lg:!hidden">
        <div className="relative">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
          
          <Link href="/feed" className="relative flex items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-all duration-300">
            <MirroIcon size="md" />
          </Link>
        </div>
        
        <div className="flex flex-col items-center space-y-8">
          {/* Feed */}
          <Link
            href="/feed"
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group",
              pathname === "/feed" 
                ? "bg-blue-500/20 text-blue-400 scale-110 shadow-lg shadow-blue-500/25" 
                : "text-gray-400 hover:bg-white/10 hover:text-white hover:scale-105"
            )}
            aria-label="Feed"
          >
            <Home className="h-6 w-6 transition-all duration-300" />
          </Link>
          
          {/* Create Post Button - CENTER */}
          <button
            onClick={() => setIsCreatePostOpen(true)}
            className="group relative"
            aria-label="Create Post"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
              
              {/* Main button */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/40 group-active:scale-95">
                <Plus className="h-7 w-7 text-white transition-transform duration-300 group-hover:rotate-90" />
              </div>
            </div>
          </button>
          
          {/* Messages */}
          <Link
            href="/messages"
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group relative",
              pathname === "/messages" 
                ? "bg-blue-500/20 text-blue-400 scale-110 shadow-lg shadow-blue-500/25" 
                : "text-gray-400 hover:bg-white/10 hover:text-white hover:scale-105"
            )}
            aria-label="Messages"
          >
            <MessageSquare className="h-6 w-6 transition-all duration-300" />
            <MessageBadge />
          </Link>
          
          {/* Profile */}
          <Link
            href="/profile"
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group",
              pathname === "/profile" 
                ? "bg-blue-500/20 text-blue-400 scale-110 shadow-lg shadow-blue-500/25" 
                : "text-gray-400 hover:bg-white/10 hover:text-white hover:scale-105"
            )}
            aria-label="Profile"
          >
            <User className="h-6 w-6 transition-all duration-300" />
          </Link>
        </div>
        
        <div className="h-10"></div> {/* Spacer */}
      </div>

      {/* Mobile web navigation (bottom) - Enhanced */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-gray-800/50 pb-safe-bottom md:hidden">
        <div className="relative">
          {/* Gradient overlay for premium feel */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          
          <div className="flex h-18 items-center justify-center px-4 py-2">
            {/* Navigation Grid - Perfectly centered */}
            <div className="grid grid-cols-4 gap-0 w-full max-w-xs items-center">
              
              {/* Feed */}
              <Link
                href="/feed"
                className={cn(
                  "flex flex-col items-center justify-center p-3 transition-all duration-300 group",
                  pathname === "/feed" ? "text-white" : "text-gray-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                    pathname === "/feed" 
                      ? "bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/25" 
                      : "group-hover:bg-white/10 group-hover:scale-105",
                  )}
                >
                  <Home className={cn(
                    "h-5 w-5 transition-all duration-300", 
                    pathname === "/feed" ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                  )} />
                </div>
                <span className={cn(
                  "mt-1 text-xs font-medium transition-all duration-300",
                  pathname === "/feed" ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                )}>
                  Feed
                </span>
              </Link>
              
              {/* Messages */}
              <Link
                href="/messages"
                className={cn(
                  "flex flex-col items-center justify-center p-3 transition-all duration-300 group",
                  pathname === "/messages" ? "text-white" : "text-gray-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 relative",
                    pathname === "/messages" 
                      ? "bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/25" 
                      : "group-hover:bg-white/10 group-hover:scale-105",
                  )}
                >
                  <MessageSquare className={cn(
                    "h-5 w-5 transition-all duration-300", 
                    pathname === "/messages" ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                  )} />
                  <MessageBadge />
                </div>
                <span className={cn(
                  "mt-1 text-xs font-medium transition-all duration-300",
                  pathname === "/messages" ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                )}>
                  Messages
                </span>
              </Link>
              
              {/* Create Button - CENTER */}
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="flex flex-col items-center justify-center p-3 group"
              >
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                  
                  {/* Main button */}
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-blue-500/40 group-active:scale-95">
                    <Plus className="h-7 w-7 text-white transition-transform duration-300 group-hover:rotate-90" />
                  </div>
                </div>
                <span className="mt-1 text-xs font-medium text-blue-400 transition-all duration-300 group-hover:text-blue-300">
                  Create
                </span>
              </button>
              
              {/* Profile */}
              <Link
                href="/profile"
                className={cn(
                  "flex flex-col items-center justify-center p-3 transition-all duration-300 group",
                  pathname === "/profile" ? "text-white" : "text-gray-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                    pathname === "/profile" 
                      ? "bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/25" 
                      : "group-hover:bg-white/10 group-hover:scale-105",
                  )}
                >
                  <User className={cn(
                    "h-5 w-5 transition-all duration-300", 
                    pathname === "/profile" ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                  )} />
                </div>
                <span className={cn(
                  "mt-1 text-xs font-medium transition-all duration-300",
                  pathname === "/profile" ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"
                )}>
                  You
                </span>
              </Link>
              
            </div>
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