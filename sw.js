/* 离线缓存。页面优先走网络，这样有更新时能拿到新版；其他文件优先走缓存。
   SHELL_VER 和 AUDIO_VER 由 build.py 填入，内容变了版本号才变，旧缓存在激活时删掉 */
const SHELL = "shell-fd987ed93a", AUDIO_CACHE = "audio-925443b618", FONTS = "fonts-1";
const FILES = ["./", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => ![SHELL, AUDIO_CACHE, FONTS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
async function cacheFirst(name, request) {
  const cache = await caches.open(name), hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") await cache.put(request, res.clone());
  return res;
}
async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put("./", res.clone());
    return res;
  } catch {
    return (await cache.match("./")) || Response.error();
  }
}
self.addEventListener("fetch", e => {
  const { request } = e, url = new URL(request.url);
  if (request.method !== "GET") return;
  if (request.mode === "navigate") return e.respondWith(networkFirst(request));
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return e.respondWith(cacheFirst(FONTS, request));
  if (url.origin !== location.origin) return;
  e.respondWith(cacheFirst(/\/(audio|slow)-[a-z]\d*\.js$/.test(url.pathname) ? AUDIO_CACHE : SHELL, request));
});
