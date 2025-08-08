"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export function MobileAppRedirect() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Detect if running in a mobile app environment
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
        'MirroMobile',
        'wv', // WebView indicator
        'Version/', // Mobile Safari WebView
      ]
      
      // Check for mobile app indicators
      const hasAppIndicator = mobileAppIndicators.some(indicator => 
        userAgent.includes(indicator)
      )
      
      // Check for standalone mode (PWA installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      
      // Check for app mode in URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const hasAppParam = urlParams.get('app') === 'mobile' || urlParams.get('mode') === 'app'
      
      // Check if it's a mobile device (iOS/Android)
      const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      
      console.log('🔍 Mobile app detection:', {
        userAgent: userAgent.substring(0, 100),
        hasAppIndicator,
        isStandalone,
        hasAppParam,
        isMobileDevice
      })
      
      return hasAppIndicator || isStandalone || hasAppParam || isMobileDevice
    }

    const handleRedirect = () => {
      console.log('🔄 Handling redirect, status:', status, 'session:', !!session)
      
      if (status === 'loading') {
        console.log('⏳ Still loading authentication...')
        return
      }
      
      if (session) {
        console.log('✅ User authenticated, redirecting to feed')
        router.replace('/feed')
      } else {
        console.log('❌ User not authenticated')
        
        // For mobile apps, always redirect to login to avoid landing page issues
        if (isMobileApp()) {
          console.log('📱 Mobile app detected, redirecting to login')
          router.replace('/login')
        }
      }
    }

    // Small delay to ensure proper initialization
    const timer = setTimeout(handleRedirect, 100)
    
    return () => clearTimeout(timer)
  }, [session, status, router])

  // Don't render anything, this is just for redirection
  return null
}