// Tradios Service Worker - Static assets only (no HTML caching to avoid auth issues)
const CACHE_NAME = 'tradeos-static-v1'

// Only cache static assets, NEVER HTML pages (to avoid auth/session issues)
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching static assets')
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Only cache static assets (JS, CSS, images, fonts) — never HTML
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|ico|json)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            return response
          })
        )
      })
    )
    return
  }

  // For all other requests (HTML, API): network only, never cache
  event.respondWith(fetch(request).catch(() => {
    // Offline fallback: return a minimal offline page
    return new Response('Offline. Please connect to the internet.', { status: 503 })
  }))
})
