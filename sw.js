/* The Applied Word — app shell cache.
   Bump CACHE whenever you edit content.js or any other file, or phones
   will keep showing the old version. */
var CACHE = "applied-word-v9";
var SHELL = [
  "./", "./index.html", "./styles.css", "./content.js", "./mcheyne.js",
  "./bible.js", "./app.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon.png",
  "./assets/devotional/01-suffer-the-children.jpg",
  "./assets/devotional/02-sermon-on-the-mount.jpg",
  "./assets/devotional/03-woman-at-well.jpg",
  "./assets/devotional/04-christ-and-child.jpg",
  "./assets/devotional/05-wedding-at-cana.jpg",
  "./assets/devotional/06-healing-blind-man.jpg",
  "./assets/devotional/07-jesus-in-temple.jpg",
  "./assets/devotional/08-resurrection.jpg",
  "./assets/devotional/09-transfiguration.jpg",
  "./assets/devotional/10-consolator.jpg"
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
  // Never cache the proxied source files or Spurgeon lookups — they're
  // large, and they're fetched deliberately rather than as page assets.
  if (url.pathname.indexOf("/berean/") === 0) return;
  if (url.pathname.indexOf("/spurgeon/") === 0) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
