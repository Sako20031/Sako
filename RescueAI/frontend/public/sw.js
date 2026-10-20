// RESCUE AI service worker: caches the app shell so the PWA opens without network.
// API responses (patient data) are never cached here. The offline reference bundle is
// stored separately by the app only when the user downloads it.
const SHELL = "rescue-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k.startsWith("rescue-shell-") && k !== SHELL).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    // Network first for the page so updates arrive; cached shell when offline.
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(SHELL).then((c) => c.put("/", copy));
      return r;
    }).catch(() => caches.match("/")));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    // Hashed, immutable assets: cache first, fill on first use (no bulk preloading).
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(e.request, copy)); }
      return r;
    })));
  }
});
