// Mobile performance optimization utilities
import { isMobileDevice, isNativeApp, isIOSDevice, isAndroidDevice, optimizeMobilePerformance } from './mobile-utils'

// Initialize mobile optimizations when the module loads
if (typeof window !== 'undefined') {
  // Run optimizations on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeMobilePerformance)
  } else {
    optimizeMobilePerformance()
  }
}

// Mobile-specific touch and gesture optimizations
export const optimizeTouchInteractions = () => {
  if (typeof window === 'undefined' || !isMobileDevice()) return

  // Prevent double-tap zoom on mobile
  let lastTouchEnd = 0
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime()
    if (now - lastTouchEnd <= 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  }, false)

  // Optimize scroll performance
  const passiveSupported = (() => {
    let passiveSupported = false
    try {
      const options = {
        get passive() {
          passiveSupported = true
          return false
        }
      }
      window.addEventListener('test', null as any, options)
      window.removeEventListener('test', null as any, options)
    } catch (err) {
      passiveSupported = false
    }
    return passiveSupported
  })()

  // Add passive event listeners for better scroll performance
  if (passiveSupported) {
    document.addEventListener('touchstart', () => {}, { passive: true })
    document.addEventListener('touchmove', () => {}, { passive: true })
  }
}

// Video optimization for mobile devices
export const optimizeMobileVideo = () => {
  if (typeof window === 'undefined') return

  const videos = document.querySelectorAll('video')
  
  videos.forEach((video) => {
    // Mobile video attributes
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    video.setAttribute('muted', 'true')
    
    // iOS-specific video optimizations
    if (isIOSDevice()) {
      video.setAttribute('x-webkit-airplay', 'deny')
      video.style.webkitTransform = 'translateZ(0)'
    }
    
    // Android-specific video optimizations
    if (isAndroidDevice()) {
      video.style.transform = 'translateZ(0)'
      video.style.willChange = 'transform'
    }
    
    // Native app video optimizations
    if (isNativeApp()) {
      video.setAttribute('disablePictureInPicture', 'true')
      video.style.pointerEvents = 'auto'
    }
  })
}

// Font loading optimization for mobile
export const optimizeMobileFonts = () => {
  if (typeof window === 'undefined') return

  // Preload critical fonts
  const fontPreloads = [
    'Helvetica Neue',
    'Helvetica',
    'Arial',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto'
  ]

  // Use system fonts on mobile for better performance
  if (isMobileDevice()) {
    document.body.style.fontFamily = fontPreloads.join(', ') + ', sans-serif'
  }
}

// Memory management for mobile devices
export const optimizeMobileMemory = () => {
  if (typeof window === 'undefined' || !isMobileDevice()) return

  // Clean up unused images
  const cleanupImages = () => {
    const images = document.querySelectorAll('img')
    images.forEach((img) => {
      if (!img.getBoundingClientRect().width) {
        img.src = ''
      }
    })
  }

  // Clean up periodically
  setInterval(cleanupImages, 30000) // Every 30 seconds

  // Clean up on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cleanupImages()
    }
  })
}

// Initialize all mobile optimizations
export const initializeMobileOptimizations = () => {
  if (typeof window === 'undefined') return

  optimizeTouchInteractions()
  optimizeMobileVideo()
  optimizeMobileFonts()
  optimizeMobileMemory()

  // Re-optimize when new content is added
  const observer = new MutationObserver(() => {
    optimizeMobileVideo()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileOptimizations)
  } else {
    initializeMobileOptimizations()
  }
}