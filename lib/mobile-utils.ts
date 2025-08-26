// Mobile detection and native app utilities
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export const isNativeApp = () => {
  if (typeof window === 'undefined') return false
  // Check for Capacitor (native app)
  return !!(window as any).Capacitor || !!(window as any).cordova || !!(window as any).PhoneGap
}

export const isIOSDevice = () => {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export const isAndroidDevice = () => {
  if (typeof window === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}

export const hideAddressBar = () => {
  if (typeof window === 'undefined') return
  
  // Only hide on mobile web (not native apps)
  if (isMobileDevice() && !isNativeApp()) {
    // Aggressive address bar hiding
    const hideBar = () => {
      window.scrollTo(0, 1)
      if (document.body) {
        document.body.scrollTop = 1
      }
    }
    
    // Multiple attempts to hide address bar
    setTimeout(hideBar, 0)
    setTimeout(hideBar, 100)
    setTimeout(hideBar, 300)
    setTimeout(hideBar, 500)
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