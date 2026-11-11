/* gogo เที่ยวกัน — offline service worker (generated at build time from sw/sw.template.js) */
/* global self, caches, fetch, URL, Response, setTimeout, clearTimeout */
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const APP = 'gogo-app-' + VERSION
const DATA = 'gogo-data-v1'
const NAV_TIMEOUT = 3500
const API_TIMEOUT = 6000

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gogo-app-') && k !== APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function timeout(ms) {
  let id
  const p = new Promise((_, reject) => { id = setTimeout(() => reject(new Error('timeout')), ms) })
  return { p, cancel: () => clearTimeout(id) }
}

/** network first (with a timeout), fall back to cache; good responses refresh the cache */
async function networkFirst(req, cacheName, ms, fallbackUrl) {
  const cache = await caches.open(cacheName)
  const t = timeout(ms)
  try {
    const res = await Promise.race([fetch(req), t.p])
    t.cancel()
    if (res.ok && res.status === 200) await cache.put(req, res.clone())
    return res
  } catch (err) {
    t.cancel()
    const hit = (await cache.match(req, { ignoreVary: true }))
      || (fallbackUrl && (await caches.match(fallbackUrl, { ignoreVary: true })))
    if (hit) return hit
    throw err
  }
}

/** cache first; misses go to the network and are stored */
async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req, { ignoreVary: true })
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok && res.status === 200) {
    const cache = await caches.open(cacheName)
    await cache.put(req, res.clone())
  }
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith(networkFirst(req, APP, NAV_TIMEOUT, '/index.html'))
    } else if (url.pathname !== '/sw.js') {
      event.respondWith(cacheFirst(req, APP))
    }
    return
  }

  // Supabase: keep the last copy of trip data / photos for offline viewing.
  // Writes (POST/PATCH/DELETE) and realtime are never cached.
  if (url.hostname.endsWith('.supabase.co')) {
    if (url.pathname.startsWith('/rest/v1/')) {
      event.respondWith(networkFirst(req, DATA, API_TIMEOUT))
    } else if (url.pathname.startsWith('/storage/v1/object/public/')) {
      event.respondWith(cacheFirst(req, DATA))
    }
  }
})
