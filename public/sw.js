// Basic Service Worker to make the app installable (PWA)
const CACHE_NAME = 'suevo-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now, but required for PWA install prompt
  event.respondWith(fetch(event.request));
});
