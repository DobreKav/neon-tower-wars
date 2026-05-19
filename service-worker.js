// === FILE: service-worker.js ===
// Cache-first strategy for full offline play

const CACHE_NAME = 'ntw-v15';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './src/constants.js',
  './src/maps.js',
  './src/engine.js',
  './src/game.js',
  './src/renderer.js',
  './src/input.js',
  './src/audio.js',
  './src/saveSystem.js',
  './src/adsManager.js',
  './src/particles.js',
  './src/waveManager.js',
  './src/enemyManager.js',
  './src/towerManager.js',
  './src/upgradeSystem.js',
  './src/uiSystem.js',
  './src/effects.js',
  './src/bossSystem.js',
  './src/achievementSystem.js',
  './src/dailyRewards.js',
  './src/skinsSystem.js',
  './src/progressionSystem.js',
];

// ── Install: pre-cache all assets ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first, fall back to network ──────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin assets
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses for JS/HTML/CSS
        if (
          response.ok &&
          (event.request.url.endsWith('.js') ||
           event.request.url.endsWith('.html') ||
           event.request.url.endsWith('.css') ||
           event.request.url.endsWith('.json'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: serve index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
