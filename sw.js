/* 力训 · Service Worker —— 让 App 可安装、可离线 */
const CACHE = 'lixun-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] 预缓存部分失败', err))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((resp) => {
        // 只缓存成功的同源响应，避免把 404 也塞进缓存
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      }).catch((err) => {
        // 仅对页面导航兜底到 index.html；
        // 其它资源（尤其是数据文件）失败时必须如实报错，
        // 否则调用方会拿到 HTML 却以为是数据。
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        throw err;
      });
    })
  );
});
