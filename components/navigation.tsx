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
          <div className="flex h-20 items-center justify-around px-4 pb-safe-bottom">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex flex-col items-center justify-center p-3 transition-all duration-200",
                  route.active ? "text-blue-400" : "text-gray-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                    route.active && "bg-blue-500/20 scale-110",
                  )}
                >
                  <route.icon className={cn("h-5 w-5", route.active && "text-blue-400")} />
                  {route.href === "/messages" && <MessageBadge />}
                </div>
                <span className={cn(
                  "mt-1 text-xs font-medium transition-all duration-200",
                  route.active ? "text-blue-400" : "text-gray-500"
                )}>
                  {route.label}
                </span>
              </Link>
            ))}
            
            {/* Native Create Button - floating style */}
            <Link
              href="/create-video"
              className="flex flex-col items-center justify-center p-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <span className="mt-1 text-xs font-medium text-blue-400">Create</span>
            </Link>
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
          {routes.slice(0, 2).map((route) => (
            <NavigationItem key={route.href} route={route} />
          ))}
          
          {/* Create Video Button */}
          <Link
            href="/create-video"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
            aria-label="Create Video"
          >
            <Plus className="h-5 w-5 text-white" />
            <span className="sr-only">Create</span>
          </Link>
          
          {routes.slice(2).map((route) => (
            <NavigationItem key={route.href} route={route} className="relative" />
          ))}
        </div>
        <div className="h-10"></div> {/* Spacer */}
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
              <span className="sr-only">{route.label}</span>
            </Link>
          ))}
          
          {/* Create Video Button */}
          <Link
            href="/create-video"
            className="flex flex-col items-center justify-center p-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <span className="sr-only">Create</span>
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
              <span className="sr-only">{route.label}</span>
            </Link>
          ))}
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