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

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isFeedPage = pathname === '/feed'

  return (
    <ErrorBoundary>
      <StreamProvider>
        <StreamVideoProvider>
          <div className="flex min-h-screen flex-col md:flex-row bg-black">
            <Navigation />
            {/* Top header with notifications - hidden on feed page */}
            {!isFeedPage && (
              <div className="fixed top-0 right-0 z-40 p-4 md:ml-16">
                <NotificationBell theme="dark" />
              </div>
            )}
            <main className="flex-1 pb-20 md:ml-16 md:pb-0 pt-16 md:pt-safe-top px-safe-left px-safe-right bg-black">
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