/* The Applied Word Podcast — app shell cache */
var CACHE = "applied-word-v13";
var SHELL = [
  "./", "./index.html", "./styles.css", "./content.js", "./mcheyne.js",
  "./bible.js", "./app.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon.png",
  "./assets/podcast-cover.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Bible text is several MB and is deliberately imported into IndexedDB,
  // so avoid keeping a second copy in Cache Storage.
  if (url.pathname.indexOf("/data/bsb.txt") >= 0) return;
  // The optional /spurgeon proxy is only a compatibility fallback.
  // The primary Spurgeon collection is cached in IndexedDB by app.js.
  if (url.pathname.indexOf("/spurgeon/") === 0) return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
