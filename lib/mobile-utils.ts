// Enhanced mobile detection and native app utilities
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  
  // Enhanced mobile detection
  const userAgent = navigator.userAgent.toLowerCase()
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i
  
  return mobileRegex.test(userAgent) || 
         window.innerWidth <= 768 ||
         ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0)
}

export const isNativeApp = () => {
  if (typeof window === 'undefined') return false
  
  // Enhanced Capacitor/Cordova detection
  return !!(
    (window as any).Capacitor || 
    (window as any).cordova || 
    (window as any).PhoneGap ||
    (window as any).webkit?.messageHandlers ||
    document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1
  )
}

export const isIOSDevice = () => {
  if (typeof window === 'undefined') return false
  
  const userAgent = navigator.userAgent.toLowerCase()
  return /ipad|iphone|ipod/.test(userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad Pro detection
}

export const isAndroidDevice = () => {
  if (typeof window === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'unknown'
  
  if (isNativeApp()) {
    if (isIOSDevice()) return 'ios-native'
    if (isAndroidDevice()) return 'android-native'
    return 'native'
  }
  
  if (isMobileDevice()) {
    if (isIOSDevice()) return 'ios-web'
    if (isAndroidDevice()) return 'android-web'
    return 'mobile-web'
  }
  
  return 'desktop'
}

export const getScreenSize = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    isSmall: window.innerWidth < 640,
    isMedium: window.innerWidth >= 640 && window.innerWidth < 1024,
    isLarge: window.innerWidth >= 1024
  }
}

export const hideAddressBar = () => {
  if (typeof window === 'undefined') return
  
  // Only hide on mobile web (not native apps)
  if (isMobileDevice() && !isNativeApp()) {
    // Enhanced address bar hiding with viewport meta tag
    const hideBar = () => {
      window.scrollTo(0, 1)
      if (document.body) {
        document.body.scrollTop = 1
      }
      
      // Update viewport meta tag for better control
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui'
        )
      }
    }
    
    // Multiple attempts with better timing
    setTimeout(hideBar, 0)
    setTimeout(hideBar, 100)
    setTimeout(hideBar, 300)
    setTimeout(hideBar, 500)
    setTimeout(hideBar, 1000)
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(hideBar, 100)
    })
  }
}

export const optimizeMobilePerformance = () => {
  if (typeof window === 'undefined') return
  
  // Apply device-specific optimizations
  const deviceType = getDeviceType()
  const body = document.body
  const html = document.documentElement
  
  // Add device-specific classes
  body.classList.add(deviceType)
  html.classList.add(deviceType)
  
  // iOS-specific optimizations
  if (isIOSDevice()) {
    body.classList.add('ios-device')
    html.classList.add('ios-device')
    
    // Fix iOS viewport issues
    const setIOSViewport = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setIOSViewport()
    window.addEventListener('resize', setIOSViewport)
    window.addEventListener('orientationchange', () => {
      setTimeout(setIOSViewport, 100)
    })
  }
  
  // Android-specific optimizations
  if (isAndroidDevice()) {
    body.classList.add('android-device')
    html.classList.add('android-device')
    
    // Android WebView optimizations
    if (isNativeApp()) {
      body.style.webkitFontSmoothing = 'antialiased'
      body.style.textRendering = 'optimizeLegibility'
    }
  }
  
  // Native app optimizations
  if (isNativeApp()) {
    body.classList.add('native-app')
    html.classList.add('native-app')
    
    // Disable context menu on native apps
    document.addEventListener('contextmenu', (e) => e.preventDefault())
    
    // Optimize scrolling
    body.style.webkitOverflowScrolling = 'touch'
    body.style.overflowScrolling = 'touch'
  }
  
  // Mobile web optimizations
  if (isMobileDevice() && !isNativeApp()) {
    body.classList.add('mobile-web')
    html.classList.add('mobile-web')
    
    hideAddressBar()
  }
}

export const forceNavigation = (path: string) => {
  if (typeof window === 'undefined') return
  
  console.log('Force navigation to:', path)
  
  // For native apps, use more gentle navigation
  if (isNativeApp()) {
    try {
      // Try history API first for native apps
      window.history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (error) {
      console.error('Native navigation error:', error)
      window.location.href = path
    }
  } else {
    // For web, use direct navigation
    try {
      window.location.href = path
    } catch (error) {
      console.error('Navigation error:', error)
      window.location.replace(path)
    }
  }
}

// Remove all navigation blocking
export const removeNavigationBlocks = () => {
  if (typeof window === 'undefined') return
  
  // Remove any event listeners that might block navigation
  const events = ['beforeunload', 'unload', 'pagehide']
  events.forEach(event => {
    window.removeEventListener(event, () => {})
  })
  
  // Ensure body and html can scroll and navigate
  document.body.style.overflow = 'auto'
  document.body.style.position = 'static'
  document.documentElement.style.overflow = 'auto'
  document.documentElement.style.position = 'static'
  
  // Remove any CSS that might block navigation
  const style = document.createElement('style')
  style.textContent = `
    * {
      pointer-events: auto !important;
      user-select: auto !important;
    }
    body, html {
      overflow: auto !important;
      position: static !important;
      height: auto !important;
    }
  `
  document.head.appendChild(style)
}