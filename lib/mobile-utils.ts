// Mobile detection and native app utilities
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export const isNativeApp = () => {
  if (typeof window === 'undefined') return false
  // Check for Capacitor (native app)
  return !!(window as any).Capacitor
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
    // Use a more aggressive approach to hide address bar
    setTimeout(() => {
      window.scrollTo(0, 1)
      document.body.scrollTop = 1
    }, 100)
    
    // Additional attempts
    setTimeout(() => {
      window.scrollTo(0, 1)
    }, 500)
  }
}

export const forceNavigation = (path: string) => {
  if (typeof window === 'undefined') return
  
  try {
    // Force navigation by directly changing location
    window.location.href = path
  } catch (error) {
    console.error('Navigation error:', error)
  }
}