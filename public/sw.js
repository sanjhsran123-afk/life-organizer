const CACHE_PREFIX = 'dayledger-pwa-'
const CACHE_NAME = `${CACHE_PREFIX}v2`
const APP_SHELL = [
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)))
          }
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          return (await cache.match(request)) || (await cache.match('/index.html'))
        }),
    )
    return
  }

  const isStaticAsset = ['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)
    || url.pathname.startsWith('/assets/')
  if (!isStaticAsset) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)))
        }
        return response
      })
    }),
  )
})

// ==================== WEB PUSH NOTIFICATIONS ====================

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    let payload = {}
    try {
      payload = event.data.json()
    } catch {
      payload = { title: 'Task Reminder', body: event.data.text() }
    }

    const title = payload.title || 'DayLedger Task Reminder'
    const notificationOptions = {
      body: payload.body || 'You have an upcoming task deadline.',
      icon: '/icons/icon-192.png',
      badge: '/favicon.svg',
      tag: payload.tag || `dayledger-task-${payload.taskId || Date.now()}`,
      data: payload,
      requireInteraction: true,
      actions: payload.actions || [],
      vibrate: [200, 100, 200],
    }

    event.waitUntil(self.registration.showNotification(title, notificationOptions))
  } catch (err) {
    console.error('[ServiceWorker] Push event error:', err)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action
  const taskId = data.taskId

  event.waitUntil(
    (async () => {
      // Find all matching DayLedger client tabs/windows
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // If user clicked 'mark_complete'
      if (action === 'mark_complete' && taskId) {
        if (clientList.length > 0) {
          // Send message to active clients
          clientList.forEach((client) => {
            client.postMessage({
              type: 'TASK_MARK_COMPLETE',
              taskId,
            })
          })
          return clientList[0].focus()
        } else {
          // Open new window with action query param
          return self.clients.openWindow(`/?action=complete&taskId=${encodeURIComponent(taskId)}`)
        }
      }

      // If user clicked 'not_yet'
      if (action === 'not_yet') {
        if (clientList.length > 0) {
          return clientList[0].focus()
        }
        return self.clients.openWindow('/?tab=tasks')
      }

      // Default click on notification body: focus existing client or open tasks tab
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return self.clients.openWindow(data.url || '/?tab=tasks')
    })()
  )
})

