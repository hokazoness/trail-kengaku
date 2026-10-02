// 見学版の Service Worker（ページと写真をスマホの中に取り込んでおき、電波が無くても出す）。
// scripts/build_kengaku.py が f19b47bef4 を写真の中身から作った版に置き換えて書き出す。
// 版が変われば古い取り込みは消え、新しい写真が入り直る。ここを手で直さない（→ ADR 0052）。
const VERSION = "f19b47bef4";
const CACHE = "kengaku:" + self.registration.scope + ":" + VERSION;
const SHELL = ["./", "index.html", "data.js", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  const mine = "kengaku:" + self.registration.scope + ":";
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k.startsWith(mine) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 取り込んであるものを先に出す。無ければ取りに行き、取れたら取り込んでおく
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const r = await fetch(e.request);
      if (r.ok && new URL(e.request.url).origin === location.origin) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      if (e.request.mode === "navigate") return c.match("index.html");
      throw err;
    }
  }));
});
