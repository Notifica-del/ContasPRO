
const CACHE_NAME = 'contaspro-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Listener for messages from the main app to trigger notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/2845/2845700.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/2845/2845700.png',
      vibrate: [200, 100, 200],
      tag: 'bill-reminder'
    });
  }
});
