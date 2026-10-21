// Shows map condition alerts for assets/js/conditions.js (some browsers, Android
// Chrome among them, only show notifications through a service worker) and opens
// the wiki when one is clicked. It caches nothing and handles no requests, so the
// site loads exactly as it would without it. Registered only once a reader has
// set an alert and allowed notifications.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const open = tabs.find((tab) => tab.url === target);
      return open ? open.focus() : self.clients.openWindow(target);
    })
  );
});
