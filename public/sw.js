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
      payload = { title: 'DayLedger', body: event.data.text() }
    }

    const isIncomingCall = payload.data?.type === 'call_incoming' || payload.data?.type === 'call' || payload.type === 'call_incoming'
    const isMissedCall = payload.data?.type === 'call_missed' || payload.type === 'call_missed'

    const defaultTitle = isIncomingCall ? 'Incoming Audio Call' : isMissedCall ? 'Missed Audio Call' : 'DayLedger Task Reminder'
    const defaultBody = isIncomingCall ? 'A friend is calling you on DayLedger...' : isMissedCall ? 'You missed an audio call on DayLedger.' : 'You have an upcoming task deadline.'

    const title = payload.title || defaultTitle
    const notificationOptions = {
      body: payload.body || defaultBody,
      icon: '/icons/icon-192.png',
      badge: '/favicon.svg',
      tag: payload.tag || (isIncomingCall ? `call-${payload.data?.callId || Date.now()}` : `dayledger-task-${payload.taskId || Date.now()}`),
      data: payload,
      requireInteraction: isIncomingCall || payload.requireInteraction !== false,
      renotify: true,
      actions: payload.actions || (isIncomingCall ? [{ action: 'open_call', title: 'Open Call' }] : []),
      vibrate: isIncomingCall ? [500, 250, 500, 250, 500, 250, 500] : [200, 100, 200],
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
  const taskId = data.taskId || data.data?.taskId

  event.waitUntil(
    (async () => {
      // Find all matching DayLedger client tabs/windows
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Check if this is an incoming or missed call notification
      const isCall =
        action === 'open_call' ||
        data.data?.type === 'call_incoming' ||
        data.data?.type === 'call' ||
        data.data?.type === 'call_missed' ||
        data.type === 'call_incoming' ||
        data.type === 'call' ||
        data.type === 'call_missed'

      if (isCall) {
        const callId = data.data?.callId || data.callId || ''
        const callerName = data.data?.callerName || data.callerName || ''
        const callerId = data.data?.callerId || data.callerId || ''
        const callerAvatar = data.data?.callerAvatar || data.callerAvatar || ''
        const targetUrl = data.data?.url || data.url || (callId ? `/?callId=${encodeURIComponent(callId)}&callerName=${encodeURIComponent(callerName)}` : '/?tab=friends')

        if (clientList.length > 0) {
          // Focus existing client and notify app of call click
          for (const client of clientList) {
            client.postMessage({
              type: 'CALL_NOTIFICATION_CLICK',
              callId,
              callerId,
              callerName,
              callerAvatar,
            })
          }
          const client = clientList[0]
          if ('focus' in client) {
            await client.focus()
          }
          return
        }

        // No open window, open a new window pointing to the call URL
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
        return
      }

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

