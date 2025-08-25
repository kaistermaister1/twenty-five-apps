const VERSION = 'app18-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon192.png',
  './icons/icon512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});


