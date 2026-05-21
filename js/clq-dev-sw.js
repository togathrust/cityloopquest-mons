/** En dev (Vite 5173/5174, LAN) : pas de Service Worker → évite CSS/HTML cassés en cache. */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var port = String(location.port || '');
  var host = String(location.hostname || '');
  var isDevPort = port === '5173' || port === '5174';
  var isLocalHost =
    host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host);
  if (!isDevPort || !isLocalHost) return;

  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (r) {
      r.unregister();
    });
  });
  if ('caches' in window) {
    caches.keys().then(function (keys) {
      keys.forEach(function (k) {
        caches.delete(k);
      });
    });
  }
})();
