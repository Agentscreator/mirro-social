// Service Worker for caching and performance optimization
/* global self, caches, clients */

const CACHE_NAME = 'mirro-social-v1'
const STATIC_CACHE = 'mirro-static-v1'
const API_CACHE = 'mirro-api-v1'

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/login',
  '/signup',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/',
]

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/posts',
  '/api/users/profile',
  '/api/users/settings'
]

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_RESOURCES.filter(url => !url.includes('css/') && !url.includes('js/')))
      }),
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
              return caches.delete(cacheName)
            }
          })
        )
      }),
      self.clients.claim()
    ])
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static resources
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticResource(request))
    return
  }

  // Handle page requests
  event.respondWith(handlePageRequest(request))
})

// API request handler - cache with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api))
  
  if (!isCacheable) {
    return fetch(request)
  }

  const cache = await caches.open(API_CACHE)
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone())
    
    if (networkResponse.ok) {
      // Cache successful responses for 5 minutes
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(request, cachedResponse)
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at')
      const age = Date.now() - parseInt(cachedAt || '0')
      
      // Return cached response if less than 5 minutes old
      if (age < 5 * 60 * 1000) {
        return cachedResponse
      }
    }
    
    throw error
  }
}

// Static resource handler - cache-first strategy
async function handleStaticResource(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    return new Response('Resource not available', { status: 404 })
  }
}

// Page request handler - network-first with cache fallback
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cache = await caches.open(CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page or basic error response
    return new Response('Page not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  // Handle any queued requests when connection is restored
  console.log('Background sync triggered')
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || []
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})