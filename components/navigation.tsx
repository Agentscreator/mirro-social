"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Search, User, MessageSquare, Bell, Plus } from "lucide-react"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { NewPostCreator } from "@/components/new-post/NewPostCreator"
import { toast } from "@/hooks/use-toast"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)

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

  const handlePostCreated = (newPost: any) => {
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
  }

  return (
    <>
      {/* Desktop navigation (side) */}
      <div className="fixed left-0 top-0 z-50 hidden h-screen w-16 border-r border-blue-100/50 bg-white/80 backdrop-blur-md md:flex md:flex-col md:items-center md:justify-between md:py-6">
        <Link href="/feed" className="flex items-center justify-center">
          <Logo size="md" />
        </Link>
        <div className="flex flex-col items-center space-y-6">
          {routes.slice(0, 2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-blue-500/10",
                route.active && "bg-blue-500/20 blue-glow",
              )}
              aria-label={route.label}
            >
              <route.icon className={cn("h-5 w-5", route.active ? "text-blue-600" : "text-muted-foreground")} />
              <span className="sr-only">{route.label}</span>
            </Link>
          ))}
          
          {/* Create Post Button */}
          <button
            onClick={() => setIsCreatePostOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
            aria-label="Create Post"
          >
            <Plus className="h-5 w-5 text-white" />
            <span className="sr-only">Create</span>
          </button>
          
          {routes.slice(2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-blue-500/10",
                route.active && "bg-blue-500/20 blue-glow",
              )}
              aria-label={route.label}
            >
              <route.icon className={cn("h-5 w-5", route.active ? "text-blue-600" : "text-muted-foreground")} />
              <span className="sr-only">{route.label}</span>
            </Link>
          ))}
        </div>
        <div className="h-10"></div> {/* Spacer */}
      </div>

      {/* Mobile navigation (bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-blue-100/50 bg-white/80 backdrop-blur-md pb-safe-bottom md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {routes.slice(0, 2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
                route.active ? "text-blue-600" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  route.active && "bg-blue-500/20 blue-glow",
                )}
              >
                <route.icon className="h-5 w-5" />
              </div>
              <span className="mt-0.5 text-[10px] font-medium">{route.label}</span>
            </Link>
          ))}
          
          {/* Create Post Button */}
          <button
            onClick={() => setIsCreatePostOpen(true)}
            className="flex flex-col items-center justify-center p-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <span className="mt-0.5 text-[10px] font-medium text-blue-600">Create</span>
          </button>
          
          {routes.slice(2).map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
                route.active ? "text-blue-600" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  route.active && "bg-blue-500/20 blue-glow",
                )}
              >
                <route.icon className="h-5 w-5" />
              </div>
              <span className="mt-0.5 text-[10px] font-medium">{route.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* New Post Creator */}
      <NewPostCreator
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </>
  )
}