const PRECACHE = 'precache-v20';
const RUNTIME  = 'runtime-v20';

const PRECACHE_URLS = [
  './',                       // ok si tu sers à la racine du dossier
  './index.html',
  './language-selection.html',
  './style.css',
  './app.js',
  './secure-content.js',
  './content-loader.js',
  './manifest.json',
  // './images/logo.png',      // ❌ supprimé car 404 chez toi
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    const results = await Promise.allSettled(
      PRECACHE_URLS.map(url => cache.add(new Request(url, { cache: 'reload' })))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn('[SW] precache fail:', PRECACHE_URLS[i]);
    });
  })());
});

self.addEventListener('activate', (event) => {
  clients.claim();
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== PRECACHE && k !== RUNTIME).map(k => caches.delete(k)));
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne pas intercepter l'API
  if (url.origin === 'http://localhost:8080') return;

  // CRITIQUE : Ne JAMAIS mettre en cache language-selection.html pour éviter les problèmes Android
  if (url.pathname.includes('language-selection.html')) {
    // Toujours aller chercher la version fraîche, jamais depuis le cache
    event.respondWith(fetch(req).catch(() => {
      // En cas d'erreur réseau, ne pas utiliser le cache
      return new Response('Page non disponible', { status: 503 });
    }));
    return;
  }

  if (req.method === 'GET' && url.origin === self.location.origin) {
    const acceptHeader = req.headers.get('accept') || '';
    const isHtmlDocument = req.destination === 'document' || acceptHeader.includes('text/html');
    const path = url.pathname || '';
    const mustNetworkFirst =
      isHtmlDocument ||
      path.endsWith('/app.js') ||
      path.endsWith('app.js') ||
      path.endsWith('/checkout.js') ||
      path.endsWith('checkout.js') ||
      path.endsWith('/version.js') ||
      path.endsWith('version.js') ||
      path.endsWith('/main.html') ||
      path.endsWith('main.html') ||
      path.endsWith('/api-key.js') ||
      path.endsWith('api-key.js') ||
      path.endsWith('/style.css') ||
      path.endsWith('style.css');

    if (mustNetworkFirst) {
      event.respondWith((async () => {
        try {
          const fresh = await fetch(req, { cache: 'reload' });
          const runtime = await caches.open(RUNTIME);
          runtime.put(req, fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match(req);
          if (cached) return cached;
          throw e;
        }
      })());
      return;
    }

    // Assets statiques: cache-first pour de bonnes performances.
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        const runtime = await caches.open(RUNTIME);
        runtime.put(req, res.clone());
        return res;
      } catch (e) {
        // Optionnel: renvoyer une page offline si tu en as une
        // return caches.match('./offline.html');
        throw e;
      }
    })());
  }
});
