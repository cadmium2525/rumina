// オフライン用 Service Worker。ファイルを更新したら VERSION を上げる
const VERSION = 'rumina-v10';
const ASSETS = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/player.js', 'js/smw_tables.js', 'js/sprites.js', 'js/rumina_frames.js',
  'js/level.js', 'js/level_view.js', 'js/input.js', 'js/sfx.js',
  'js/world.js', 'js/actors.js', 'js/art.js', 'js/haptics.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
// ネットワーク優先・失敗時にキャッシュ（開発中でも更新が反映されやすい）
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
