// Service worker. Cache-first for the app shell, so Hooty works offline
// after the first visit. Never caches anything that identifies a child:
// there is nothing to cache but static files.

const CACHE = 'sparkle-35b666bf81';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/ui.css',
  './engine/activities/concept.js',
  './engine/activities/draglabel.js',
  './engine/activities/dragorder.js',
  './engine/activities/explain.js',
  './engine/activities/explore.js',
  './engine/activities/fillblank.js',
  './engine/activities/flashcard.js',
  './engine/activities/funfact.js',
  './engine/activities/hook.js',
  './engine/activities/index.js',
  './engine/activities/listenpick.js',
  './engine/activities/matchpairs.js',
  './engine/activities/mcq.js',
  './engine/activities/media.js',
  './engine/activities/passage.js',
  './engine/activities/truefalse.js',
  './engine/activities/typeanswer.js',
  './engine/activities/watchanswer.js',
  './engine/activities/worked.js',
  './engine/app.js',
  './engine/core/answers.js',
  './engine/core/bookmaker.js',
  './engine/core/bookwords.js',
  './engine/core/concepts.js',
  './engine/core/dom.js',
  './engine/core/gen.js',
  './engine/core/glossary.js',
  './engine/core/i18n.js',
  './engine/core/icons.js',
  './engine/core/models.js',
  './engine/core/mybooks.js',
  './engine/core/sfx.js',
  './engine/core/srs.js',
  './engine/core/state.js',
  './engine/core/store.js',
  './engine/core/theme.js',
  './engine/core/widgets.js',
  './engine/core/wordtap.js',
  './js/boot.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll fails the whole install if one file 404s, so add individually
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const stale = keys.filter((k) => k !== CACHE);
        return Promise.all(stale.map((k) => caches.delete(k))).then(() => stale.length);
      })
      .then(async (replaced) => {
        await self.clients.claim();
        // An older version was running: reload every open page now, so nobody keeps looking at the old design.
        if (replaced) for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url).catch(() => {});
      }),
  );
});

// The very first visit happens before this worker controls the page, so the app's data (the book, the
// indexes, the theme) is fetched without being cached, and going offline afterwards fails. Once the page is
// controlled it sends the addresses it used; keep them, and the next offline visit works.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'warm' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      let kept = 0;
      for (const url of data.urls.slice(0, 40)) {
        try {
          const res = await fetch(new Request(url, { credentials: 'same-origin' }));
          if (res && res.ok) { await cache.put(new Request(url), res.clone()); kept += 1; }
        } catch {
          // offline or a 404: nothing to keep
        }
      }
      return kept;
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Recorded voice clips are large and played with range requests: leave them to the browser.
  if (url.pathname.includes('/audio/')) return;

  // Content packs and themes are data: always try the network first so a
  // content update shows up, and fall back to the cache when offline.
  const isData = url.pathname.includes('/content/') || url.pathname.includes('/themes/');
  if (isData) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // App shell: network first so a fix shows on the very next load, cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
