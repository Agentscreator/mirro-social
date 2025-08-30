// app/(authenticated)/layout.tsx
"use client"
import type React from "react"
import { usePathname } from "next/navigation"
import { InstagramNavigation } from "@/components/instagram-navigation"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { HamburgerMenu } from "@/components/hamburger-menu"
import { StreamProvider } from '@/components/providers/StreamProvider'
import { ErrorBoundary } from '@/components/providers/ErrorBoundary'
import { StreamVideoProvider } from "@/components/providers/StreamVideoProvider"
import { MessageNotifications } from "@/components/messages/MessageNotifications"
import { useEffect, useState } from "react"
import { requestNotificationPermission } from "@/utils/sound"
import { isNativeApp, isMobileDevice } from "@/lib/mobile-utils"
import { AppTypeIndicator } from "@/components/debug/AppTypeIndicator"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isNative, setIsNative] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const isFeedPage = pathname === '/feed'
  const isMessagesPage = pathname.startsWith('/messages')
  const isInActiveConversation = pathname.match(/^\/messages\/[^\/]+$/) || pathname.match(/^\/groups\/[^\/]+$/)
  
  // Debug layout detection
  useEffect(() => {
    console.log('Layout debug:', { pathname, isFeedPage, isMessagesPage, isInActiveConversation, isNative, isMobile })
  }, [pathname, isFeedPage, isMessagesPage, isInActiveConversation, isNative, isMobile])

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Enhanced mobile/native app environment detection and setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nativeApp = isNativeApp()
      const mobileDevice = isMobileDevice()
      
      setIsNative(nativeApp)
      setIsMobile(mobileDevice)
      
      // Import and run mobile optimizations
      import('@/lib/mobile-performance').then(({ optimizeMobilePerformance }) => {
        optimizeMobilePerformance()
      })
      
      // Add appropriate classes with enhanced detection
      const deviceType = nativeApp ? 'native-app' : mobileDevice ? 'mobile-web' : 'desktop-web'
      document.documentElement.classList.add(deviceType)
      document.body.classList.add(deviceType)
      
      // iOS-specific optimizations
      if (mobileDevice && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.documentElement.classList.add('ios-device')
        document.body.classList.add('ios-device')
        
        // Set CSS custom property for iOS viewport height
        const setIOSViewport = () => {
          const vh = window.innerHeight * 0.01
          document.documentElement.style.setProperty('--vh', `${vh}px`)
        }
        setIOSViewport()
        window.addEventListener('resize', setIOSViewport)
        window.addEventListener('orientationchange', () => setTimeout(setIOSViewport, 100))
      }
      
      // Android-specific optimizations
      if (mobileDevice && /Android/.test(navigator.userAgent)) {
        document.documentElement.classList.add('android-device')
        document.body.classList.add('android-device')
      }
      
      // Ensure proper interaction and navigation
      document.body.style.pointerEvents = 'auto'
      document.body.style.userSelect = 'auto'
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
      
      return () => {
        document.documentElement.classList.remove('native-app', 'mobile-web', 'desktop-web', 'ios-device', 'android-device')
        document.body.classList.remove('native-app', 'mobile-web', 'desktop-web', 'ios-device', 'android-device')
      }
    }
  }, [])

  // Native app layout - cleaner UI without duplicate navigation
  if (isNative) {
    return (
      <ErrorBoundary>
        <StreamProvider>
          <StreamVideoProvider>
            <div className="flex min-h-screen flex-col bg-black native-app-layout">
              {/* Native app navigation - simplified */}
              <InstagramNavigation />
              
              {/* Native app main content - no extra padding/margins */}
              <main className={`flex-1 bg-black ${isInActiveConversation ? 'pb-0' : 'pb-20'}`}>
                <div className="h-full min-h-screen bg-black">
                  {children}
                </div>
              </main>
              
              {/* Message Notifications */}
              <MessageNotifications />
              
              {/* Debug indicator */}
              <AppTypeIndicator />
            </div>
          </StreamVideoProvider>
        </StreamProvider>
      </ErrorBoundary>
    )
  }

  // Web layout - original with top navigation
  return (
    <ErrorBoundary>
      <StreamProvider>
        <StreamVideoProvider>
          <div className="flex min-h-screen flex-col md:flex-row bg-black">
            <InstagramNavigation />
            {/* Top header with notifications - hidden on feed page and native apps */}
            {!isFeedPage && !isNative && (
              <div className="fixed top-0 right-0 z-40 p-4 lg:ml-16">
                {isMessagesPage ? (
                  <HamburgerMenu />
                ) : (
                  <NotificationBell />
                )}
              </div>
            )}
            <main className={`flex-1 ${isInActiveConversation ? 'pb-0' : 'pb-20'} lg:ml-16 lg:pb-0 ${!isNative && !isFeedPage ? 'pt-16' : ''} lg:pt-safe-top px-safe-left px-safe-right bg-black`}>
              {isFeedPage ? (
                // Feed page gets full screen treatment
                <div className="h-full min-h-screen bg-black">
                  {children}
                </div>
              ) : (
                // Other pages get container treatment
                <div className="mx-auto max-w-4xl px-4 py-4 md:px-6 md:py-8">
                  {children}
                </div>
              )}
            </main>
            
            {/* Message Notifications */}
            <MessageNotifications />
            
            {/* Debug indicator */}
            <AppTypeIndicator />
          </div>
        </StreamVideoProvider>
      </StreamProvider>
    </ErrorBoundary>
  )
}