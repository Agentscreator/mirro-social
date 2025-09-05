// app/(authenticated)/layout.tsx
"use client"
import type React from "react"
import { usePathname } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { StreamProvider } from '@/components/providers/StreamProvider'
import { ErrorBoundary } from '@/components/providers/ErrorBoundary'
import { StreamVideoProvider } from "@/components/providers/StreamVideoProvider"
import { MessageNotifications } from "@/components/messages/MessageNotifications"
import { useEffect } from "react"
import { requestNotificationPermission } from "@/utils/sound"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isFeedPage = pathname === '/feed'

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <ErrorBoundary>
      <StreamProvider>
        <StreamVideoProvider>
          <div className="flex min-h-screen flex-col md:flex-row bg-black">
            <Navigation />
            {/* Top header with notifications - hidden on feed page */}
            {!isFeedPage && (
              <div className="fixed top-0 right-0 z-40 p-4 lg:ml-16">
                <NotificationBell />
              </div>
            )}
            <main className="flex-1 pb-20 lg:ml-16 lg:pb-0 pt-16 lg:pt-safe-top px-safe-left px-safe-right bg-black">
              <div className="mx-auto max-w-4xl px-4 py-4 md:px-6 md:py-8">
                {children}
              </div>
            </main>

            {/* Message Notifications */}
            <MessageNotifications />
          </div>
        </StreamVideoProvider>
      </StreamProvider>
    </ErrorBoundary>
  )
}