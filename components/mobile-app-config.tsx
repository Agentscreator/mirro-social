"use client"

import { useEffect } from "react"

// Mobile app configuration component
export function MobileAppConfig() {
  useEffect(() => {
    // Configure mobile app specific settings
    const configureMobileApp = () => {
      // Disable context menu on long press (iOS/Android)
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault()
      })

      // Disable text selection for app-like feel
      document.addEventListener('selectstart', (e) => {
        e.preventDefault()
      })

      // Prevent zoom on double tap
      let lastTouchEnd = 0
      document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime()
        if (now - lastTouchEnd <= 300) {
          e.preventDefault()
        }
        lastTouchEnd = now
      }, false)

      // Handle back button for mobile apps
      if (typeof window !== 'undefined' && 'history' in window) {
        window.addEventListener('popstate', (e) => {
          // Custom back button handling
          e.preventDefault()
          // You can implement custom navigation logic here
        })
      }

      // Set mobile app viewport
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        )
      }

      // Add mobile app class to body
      document.body.classList.add('mobile-app')

      // Handle safe area insets for iOS
      if (CSS.supports('padding: env(safe-area-inset-top)')) {
        document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)')
        document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)')
        document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)')
        document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)')
      }
    }

    // Check if running in mobile app
    const checkIfMobileApp = () => {
      const userAgent = navigator.userAgent
      return userAgent.includes('ReactNative') ||
             userAgent.includes('Expo') ||
             userAgent.includes('CapacitorWebView') ||
             userAgent.includes('Cordova') ||
             userAgent.includes('PhoneGap') ||
             userAgent.includes('Flutter') ||
             userAgent.includes('MirroApp') ||
             userAgent.includes('MirroMobile') ||
             window.matchMedia('(display-mode: standalone)').matches ||
             new URLSearchParams(window.location.search).get('app') === 'mobile'
    }

    if (checkIfMobileApp()) {
      configureMobileApp()
    }

    // Cleanup function
    return () => {
      document.body.classList.remove('mobile-app')
    }
  }, [])

  return null
}