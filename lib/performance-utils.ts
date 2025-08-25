// Performance utilities for optimizing the app

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Cache with TTL
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>()
  private defaultTTL: number

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { value, expiry })
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Lazy loading utility
export const createLazyLoader = (threshold = 0.1) => {
  if (typeof window === 'undefined') return null
  
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement
          const src = target.dataset.src
          if (src && target instanceof HTMLImageElement) {
            target.src = src
            target.removeAttribute('data-src')
          }
        }
      })
    },
    { threshold }
  )
}

// Image optimization utilities
export const getOptimizedImageUrl = (
  url: string,
  width?: number,
  height?: number,
  quality = 75
): string => {
  if (!url || url.includes('placeholder')) return url
  
  // For external URLs, return as-is (Next.js Image component will handle optimization)
  if (url.startsWith('http') && !url.includes(window?.location?.hostname)) {
    return url
  }
  
  // For internal URLs, add optimization parameters
  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  params.set('q', quality.toString())
  
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params.toString()}`
}

// Memory usage monitoring
export const getMemoryUsage = (): number | null => {
  if (typeof window === 'undefined' || !('memory' in performance)) return null
  
  const memory = (performance as any).memory
  return memory ? memory.usedJSHeapSize / 1024 / 1024 : null // MB
}

// Performance timing
export const measurePerformance = (name: string) => {
  const start = performance.now()
  
  return {
    end: () => {
      const duration = performance.now() - start
      console.log(`${name} took ${duration.toFixed(2)}ms`)
      return duration
    }
  }
}

// Batch operations to reduce re-renders
export const batchUpdates = <T>(
  updates: (() => void)[],
  delay = 0
): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      updates.forEach(update => update())
      resolve()
    }, delay)
  })
}

// Virtual scrolling helper
export const calculateVisibleItems = (
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  buffer = 5
) => {
  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight)
  
  return {
    start: Math.max(0, visibleStart - buffer),
    end: visibleEnd + buffer
  }
}

// Preload critical resources
export const preloadResource = (url: string, type: 'image' | 'video' | 'script' = 'image') => {
  if (typeof window === 'undefined') return
  
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = url
  link.as = type
  
  if (type === 'image') {
    link.type = 'image/*'
  }
  
  document.head.appendChild(link)
}

// Service worker registration for caching
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
  }
}