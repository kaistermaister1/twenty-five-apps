const VERSION = 'v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon192.png',
  './icons/icon512.png',
  './assets/rain.gif'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);
  // Runtime cache audio with network-first to avoid stalling playback if updated
  if (request.destination === 'audio' || url.pathname.match(/\.(mp3|m4a)$/)) {
    e.respondWith(
      fetch(request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(request, copy));
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }
  // Cache-first for core
  e.respondWith(caches.match(request).then(r => r || fetch(request)));
});

