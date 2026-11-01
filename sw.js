// İnternetsiz çalışma: uygulama dosyaları ilk açılışta telefona kaydedilir.
// Uygulamayı güncellediğinde aşağıdaki sürüm adını değiştir (yds-v2, yds-v3...).
const CACHE = "yds-v1";
const FILES = ["./", "index.html", "style.css", "app.js", "data/phrasal.js", "data/edat.js", "data/cloze.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => hit)));
});
