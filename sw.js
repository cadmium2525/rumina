// オフライン用 Service Worker。ファイルを更新したら VERSION を上げる
const VERSION = 'rumina-v30';
const ASSETS = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/player.js', 'js/smw_tables.js', 'js/sprites.js', 'js/rumina_frames.js',
  'js/level.js', 'js/level_view.js', 'js/darkness.js', 'js/input.js', 'js/sfx.js',
  'js/world.js', 'js/actors.js', 'js/art.js', 'js/haptics.js',
  'editor.html', 'editor.css', 'js/editor.js', 'js/stages/akihabara.js', 'js/stages/index.js', 'js/stages/stage1_2.js', 'js/stages/stage1_3.js', 'js/stages/stage1_4.js', 'js/stages/stage1_5.js', 'js/stages/stage1_5b.js',
  'js/stages/stage2_1.js', 'js/stages/stage2_2.js', 'js/stages/stage2_3.js', 'js/stages/stage2_4.js', 'js/stages/stage2_5.js', 'js/stages/stage2_5b.js',
  'js/stages/stage3_1.js', 'js/stages/stage3_2.js', 'js/stages/stage3_3.js', 'js/stages/stage3_4.js', 'js/stages/stage3_5.js', 'js/stages/stage3_5b.js', 'js/stages/stage1_s.js', 'js/stages/stage2_s.js', 'js/stages/stage3_s.js',
  'js/stages/stage4_1.js', 'js/stages/stage4_2.js', 'js/stages/stage4_3.js', 'js/stages/stage4_4.js', 'js/stages/stage4_5.js', 'js/stages/stage4_5b.js', 'js/stages/stage4_s.js',
  'js/stages/stage5_1.js', 'js/stages/stage5_2.js', 'js/stages/stage5_2b.js', 'js/stages/stage5_3.js', 'js/stages/stage5_4.js', 'js/stages/stage5_5.js', 'js/stages/stage5_5b.js', 'js/stages/stage5_s.js',
  'js/stages/stage6_1.js', 'js/stages/stage6_2.js', 'js/stages/stage6_3.js', 'js/stages/stage6_4.js', 'js/stages/stage6_5.js', 'js/stages/stage6_5b.js', 'js/stages/stage6_s.js',
  'js/stages/stage7_1.js', 'js/stages/stage7_2.js', 'js/stages/stage7_3.js', 'js/stages/stage7_4.js', 'js/stages/stage7_5.js', 'js/stages/stage7_5b.js', 'js/stages/stage7_s.js',
  'js/stages/stage8_1.js', 'js/stages/stage8_2.js', 'js/stages/stage8_3.js', 'js/stages/stage8_4.js', 'js/stages/stage8_5.js', 'js/stages/stage8_5b.js', 'js/stages/stage8_s.js',
  'js/stages/stage_e1.js', 'js/stages/stage_e2.js', 'js/stages/stage_e3.js', 'js/stages/stage_e4.js', 'js/stages/stage_e5.js', 'js/stages/stage_e6.js', 'js/stages/stage_e7.js', 'js/stages/stage_e8.js', 'js/stages/stage_e9.js', 'js/stages/stage_e10.js',
  'js/stages/stage_home.js', 'js/stages/stage_last1.js', 'js/stages/stage_last2.js', 'js/stages/stage_last3.js',
  'js/overworld/maps.js', 'js/overworld/overworld.js', 'js/overworld/overworld_view.js',
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
