/* NEXORA v2 — Service Worker (estructura plana) */
'use strict';
const VERSION = 'nexora-v1';
const CORE = ['./', 'index.html', 'nexora.css', 'nexora.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const IMG = VERSION + '-img';
const IMG_LIMIT = 400;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    e.respondWith(caches.open(IMG).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && (res.type === 'opaque' || res.headers.get('content-type')?.startsWith('image'))) {
        const keys = await c.keys();
        if (keys.length >= IMG_LIMIT) await c.delete(keys[0].request);
        c.put(req, res.clone());
      }
      return res;
    }));
    return;
  }
  const isData = url.pathname.includes('/public/data/') || url.pathname.includes('/data/');
  e.respondWith(
    isData
      ? fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
                  .catch(() => caches.match(req))
      : caches.match(req).then(hit => hit || fetch(req).then(res => {
          const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; }))
  );
});
