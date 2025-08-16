"use client"

import type React from "react"
import { Navigation } from "./navigation"
import { WatchLayout } from "./watch-layout"
import { WatchFeed } from "./watch-feed"
import { WatchMessages } from "./watch-messages"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveLayout({ children, className }: ResponsiveLayoutProps) {
  const pathname = usePathname()

  // Render watch-specific components for certain routes
  const renderWatchContent = () => {
    switch (pathname) {
      case "/feed":
        return <WatchFeed />
      case "/messages":
        return <WatchMessages />
      default:
        return (
          <WatchLayout>
            <div className="watch-container">
              {children}
            </div>
          </WatchLayout>
        )
    }
  }

  return (
    <>
      {/* Standard layout for mobile/desktop */}
      <div className="watch:hidden">
        <Navigation />
        <main className={cn(
          "min-h-screen bg-black text-white",
          "lg:ml-16", // Account for desktop sidebar
          "pb-16 lg:pb-0", // Account for mobile bottom nav
          className
        )}>
          {children}
        </main>
      </div>

      {/* Apple Watch optimized layout */}
      {renderWatchContent()}
    </>
  )
}

// Hook to detect if we're on Apple Watch
export function useIsAppleWatch() {
  if (typeof window === 'undefined') return false
  
  return window.innerWidth <= 272 && window.innerHeight <= 340
}

// Utility component for conditional watch rendering
export function WatchOnly({ children }: { children: React.ReactNode }) {
  return (
    <div className="watch:block hidden">
      {children}
    </div>
  )
}

export function NonWatchOnly({ children }: { children: React.ReactNode }) {
  return (
    <div className="watch:hidden">
      {children}
    </div>
  )
}