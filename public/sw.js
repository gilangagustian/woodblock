const CACHE_NAME = 'woodblock-v3'
// The page this SW controls (e.g. https://host/woodblock/) — also the app's
// single navigable URL, since it's a client-only SPA with no routing.
const SCOPE_URL = self.registration.scope
// Ignore Vary when reading from the cache: the response was originally
// fetched by the SW itself (during install) with different request headers
// than the real browser-issued <script>/<link> requests that ask for it
// later, so a strict Vary-aware match would miss it even though the URL is
// identical. We fully control what's written to this cache, so exact-URL
// lookup is what we want.
const MATCH_OPTS = { ignoreVary: true }

// Precache the app shell on install. This matters because a service worker
// only starts intercepting requests *after* it's active — the very first
// page load (the one that registers it) runs entirely uncontrolled, so the
// old "cache whatever you fetch" approach cached nothing until a *second*
// online visit. Fetching and caching the shell explicitly during install
// means offline play works right after the first visit.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const htmlResponse = await fetch(SCOPE_URL, { cache: 'reload' })
      const html = await htmlResponse.clone().text()

      const assetUrls = new Set()
      const attrRe = /(?:src|href)="([^"]+\.(?:js|css))"/g
      let match
      while ((match = attrRe.exec(html))) {
        assetUrls.add(new URL(match[1], SCOPE_URL).toString())
      }

      await cache.put(SCOPE_URL, htmlResponse)
      await Promise.all(
        [...assetUrls].map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => cache.put(url, res))
            .catch(() => {
              // A single missing asset shouldn't block the rest of the shell
              // from being cached.
            }),
        ),
      )
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Leave cross-origin requests (Google Analytics, etc.) alone entirely —
  // don't cache or interfere with them, just let the browser handle them
  // normally.
  if (new URL(event.request.url).origin !== self.location.origin) return

  // Navigation requests (opening/reloading the app) always fall back to the
  // precached shell document, regardless of the exact request URL — this is
  // a single-page app, so any navigation within scope means "load the app".
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(SCOPE_URL, response.clone()))
          return response
        })
        .catch(() => caches.match(SCOPE_URL, MATCH_OPTS)),
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request, MATCH_OPTS)),
  )
})
