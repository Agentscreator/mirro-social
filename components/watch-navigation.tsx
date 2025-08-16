"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, User, MessageSquare, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { NewPostCreator } from "@/components/new-post/NewPostCreator"
import { MessageBadge } from "@/components/messages/MessageBadge"

export function WatchNavigation() {
  const pathname = usePathname()
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
    console.log("New post created:", newPost)
    window.dispatchEvent(new CustomEvent('postCreated', { detail: newPost }))
  }

  return (
    <>
      {/* Apple Watch Navigation */}
      <div className="watch:block hidden watch-nav">
        {routes.slice(0, 2).map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "watch-nav-item",
              route.active ? "active text-white" : "text-gray-400"
            )}
            aria-label={route.label}
          >
            <route.icon className="watch-nav-icon" />
          </Link>
        ))}
        
        {/* Create Post Button for Watch */}
        <button
          onClick={() => setIsCreatePostOpen(true)}
          className="watch-nav-item bg-blue-600 text-white"
          aria-label="Create Post"
        >
          <Plus className="watch-nav-icon" />
        </button>
        
        {routes.slice(2).map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "watch-nav-item relative",
              route.active ? "active text-white" : "text-gray-400"
            )}
            aria-label={route.label}
          >
            <route.icon className="watch-nav-icon" />
            {route.href === "/messages" && (
              <div className="watch-badge">
                <MessageBadge />
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* New Post Creator for Watch */}
      <NewPostCreator
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </>
  )
}