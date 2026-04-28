// Service Worker for Push Notifications
const CACHE_NAME = 'libya-financial-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'إشعار جديد',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'شركة ليبيا للخدمات المالية';
  const options = {
    body: data.body || data.content || 'لديك إشعار جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'notification',
    requireInteraction: false,
    silent: false,
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  event.notification.close();

  const url = event.notification.data?.actionUrl || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // إذا كان التطبيق مفتوحاً، افتح الرابط فيه
      for (const client of clientList) {        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url });
          return client.focus();
        }
      }
      // وإلا افتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
