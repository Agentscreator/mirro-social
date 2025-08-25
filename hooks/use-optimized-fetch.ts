"use client"

"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { TTLCache } from '@/lib/performance-utils'

interface FetchOptions extends RequestInit {
  cache?: boolean
  cacheTTL?: number
  retries?: number
  retryDelay?: number
}

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// Global cache instance
const globalCache = new TTLCache(5 * 60 * 1000) // 5 minutes

export function useOptimizedFetch<T>(
  url: string | null,
  options: FetchOptions = {}
) {
  const {
    cache = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (
    fetchUrl: string,
    attempt = 0
  ): Promise<void> => {
    // Check cache first
    if (cache && fetchOptions.method !== 'POST') {
      const cacheKey = `${fetchUrl}-${JSON.stringify(fetchOptions)}`
      const cachedData = globalCache.get(cacheKey)
      if (cachedData) {
        setState({ data: cachedData as T, loading: false, error: null })
        return
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(fetchUrl, {
        ...fetchOptions,
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Cache successful responses
      if (cache && fetchOptions.method !== 'POST') {
        const cacheKey = `${fetchUrl}-${JSON.stringify(fetchOptions)}`
        globalCache.set(cacheKey, data, cacheTTL)
      }

      setState({ data, loading: false, error: null })
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return // Request was cancelled
      }

      // Retry logic
      if (attempt < retries) {
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(fetchUrl, attempt + 1)
        }, retryDelay * Math.pow(2, attempt)) // Exponential backoff
        return
      }

      setState({
        data: null,
        loading: false,
        error: error.message || 'An error occurred'
      })
    }
  }, [cache, cacheTTL, retries, retryDelay, fetchOptions])

  const refetch = useCallback(() => {
    if (url) {
      fetchData(url)
    }
  }, [url, fetchData])

  const clearCache = useCallback(() => {
    if (url) {
      const cacheKey = `${url}-${JSON.stringify(fetchOptions)}`
      globalCache.clear()
    }
  }, [url, fetchOptions])

  useEffect(() => {
    if (url) {
      fetchData(url)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [url, fetchData])

  return {
    ...state,
    refetch,
    clearCache
  }
}

// Specialized hook for posts
export function useOptimizedPosts(userId?: string, feedMode = false) {
  const url = userId 
    ? `/api/posts?userId=${userId}&t=${Date.now()}`
    : feedMode 
    ? `/api/posts?feed=true&t=${Date.now()}`
    : null

  return useOptimizedFetch<{ posts: any[] }>(url, {
    cache: true,
    cacheTTL: 30 * 1000, // 30 seconds for posts
    retries: 2
  })
}

// Specialized hook for user profile
export function useOptimizedProfile(userId?: string) {
  const url = userId ? `/api/users/profile/${userId}` : null

  return useOptimizedFetch<{ user: any }>(url, {
    cache: true,
    cacheTTL: 2 * 60 * 1000, // 2 minutes for profiles
    retries: 2
  })
}