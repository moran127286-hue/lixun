/* 力训 · Service Worker —— 让 App 可安装、可离线 */
const CACHE = 'lixun-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 逐个缓存：任何一个失败都不该让整个安装失败
    // （caches.addAll 是原子的，一个 404 就全盘失败且没有提示）
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const resp = await fetch(url, { cache: 'reload' });
        if (resp && resp.ok) await c.put(url, resp);
      } catch (err) {
        // 忽略单个资源失败，其余资源照常缓存
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // 计划文件必须走网络，不能吃缓存（否则「从网站同步」会拿到旧计划）
  if (url.pathname.indexOf('/plans/') >= 0) return;

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
