"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function WebAuthRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Don't show anything if loading or not authenticated
  if (status === 'loading' || !session) {
    return null
  }

  // Check if mobile app (don't show for mobile apps)
  const isMobileApp = () => {
    if (typeof window === 'undefined') return false
    
    const userAgent = window.navigator.userAgent
    const mobileAppIndicators = [
      'ReactNative',
      'Expo',
      'CapacitorWebView', 
      'Cordova',
      'PhoneGap',
      'Flutter',
      'MirroApp',
      'MirroMobile'
    ]
    
    return mobileAppIndicators.some(indicator => userAgent.includes(indicator)) ||
           window.matchMedia('(display-mode: standalone)').matches ||
           new URLSearchParams(window.location.search).get('app') === 'mobile'
  }

  if (isMobileApp()) {
    return null
  }

  // Show "Go to App" banner for authenticated web users
  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-medium">Welcome back!</p>
          <p className="text-sm text-blue-100">You're already signed in</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/feed')}
          className="bg-white text-blue-600 hover:bg-blue-50"
        >
          Go to App
        </Button>
      </div>
    </div>
  )
}