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

      // Request fullscreen for mobile browsers
      const requestFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen()
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          (document.documentElement as any).webkitRequestFullscreen()
        } else if ((document.documentElement as any).mozRequestFullScreen) {
          (document.documentElement as any).mozRequestFullScreen()
        } else if ((document.documentElement as any).msRequestFullscreen) {
          (document.documentElement as any).msRequestFullscreen()
        }
      }

      // Auto-hide address bar on scroll (mobile browsers)
      let ticking = false
      const hideAddressBar = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            window.scrollTo(0, 1)
            ticking = false
          })
          ticking = true
        }
      }

      // Hide address bar on load and orientation change
      window.addEventListener('load', hideAddressBar)
      window.addEventListener('orientationchange', () => {
        setTimeout(hideAddressBar, 100)
      })

      // Hide address bar on user interaction
      document.addEventListener('touchstart', hideAddressBar, { once: true })

      // Request fullscreen on first user interaction
      const enterFullscreen = () => {
        if (!document.fullscreenElement) {
          requestFullscreen()
        }
      }

      // Add fullscreen button for easy access
      const addFullscreenButton = () => {
        const button = document.createElement('button')
        button.innerHTML = '⛶'
        button.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 9999;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        `
        button.onclick = enterFullscreen
        document.body.appendChild(button)
        
        // Hide button after 5 seconds
        setTimeout(() => {
          if (button.parentNode) {
            button.parentNode.removeChild(button)
          }
        }, 5000)
      }

      // Show fullscreen button on mobile
      if (window.innerWidth <= 768) {
        setTimeout(addFullscreenButton, 1000)
      }

      // Auto-enter fullscreen on tap (one-time)
      document.addEventListener('click', enterFullscreen, { once: true })
      document.addEventListener('touchstart', enterFullscreen, { once: true })

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