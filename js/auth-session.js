/**
 * Session d'accès payant : validation API et nettoyage des données obsolètes.
 * IndexedDB peut conserver un ancien achat même après « vider le cache » Chrome.
 */
(function () {
  'use strict';

  const AUTH_KEYS = [
    'clq_token',
    'jwt',
    'clq_has_access',
    'clq_short_code',
    'clq_entitlements',
    'clq_city',
    'clq_last_checkout',
    'user_version',
    'upgrade_type',
    'user_state_before_upgrade',
  ];

  function resolveApiBase() {
    try {
      if (window.APP_CONFIG && window.APP_CONFIG.API_BASE) {
        return String(window.APP_CONFIG.API_BASE).replace(/\/+$/, '');
      }
    } catch (_) {}
    try {
      const stored = localStorage.getItem('api_base');
      if (stored) return stored.replace(/\/+$/, '');
    } catch (_) {}
    return 'https://cityloopquest-api.onrender.com';
  }

  function normalizeShortCode(input) {
    const raw = String(input || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!raw) return '';
    const nine = raw.slice(0, 9);
    return (nine.match(/.{1,3}/g) || [nine]).join('-');
  }

  function hasStoredCredentials() {
    try {
      return !!(
        localStorage.getItem('clq_has_access') === '1' ||
        localStorage.getItem('clq_token') ||
        localStorage.getItem('jwt') ||
        localStorage.getItem('clq_short_code')
      );
    } catch (_) {
      return false;
    }
  }

  function clearAuthStorage() {
    AUTH_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    });
    try {
      sessionStorage.removeItem('payment_successful');
    } catch (_) {}

    try {
      document.cookie =
        'clq_short_code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    } catch (_) {}

    try {
      const request = indexedDB.open('cityloopquest_db', 1);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('app_data')) return;
        const tx = db.transaction(['app_data'], 'readwrite');
        const store = tx.objectStore('app_data');
        AUTH_KEYS.forEach((key) => store.delete(key));
      };
    } catch (_) {}
  }

  async function validateAuthWithApi(apiBase) {
    const API_BASE = (apiBase || resolveApiBase()).replace(/\/+$/, '');
    const token = localStorage.getItem('clq_token') || localStorage.getItem('jwt');
    const shortCode = localStorage.getItem('clq_short_code');
    const headers = { 'ngrok-skip-browser-warning': 'true' };

    if (token) {
      try {
        const r = await fetch(`${API_BASE}/api/auth/whoami`, {
          method: 'GET',
          headers: Object.assign({ Authorization: `Bearer ${token}` }, headers),
        });
        if (r.ok) {
          const me = await r.json().catch(() => null);
          if (me) {
            try {
              localStorage.setItem('clq_has_access', '1');
            } catch (_) {}
            const plan =
              me.plan ||
              me.license_plan ||
              me.access_type ||
              (me.entitlements && me.entitlements.plan);
            if (plan) {
              const normalized = String(plan).toLowerCase();
              localStorage.setItem(
                'user_version',
                normalized.includes('full') ? 'FULL' : 'LITE',
              );
            }
          }
          return true;
        }
      } catch (_) {}
    }

    if (shortCode) {
      const code = normalizeShortCode(shortCode);
      if (!/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/.test(code)) {
        return false;
      }
      try {
        const r = await fetch(`${API_BASE}/api/auth/activate-code`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
          body: JSON.stringify({ code }),
        });
        if (r.ok) {
          const data = await r.json().catch(() => null);
          if (data && data.token) {
            try {
              localStorage.setItem('clq_token', data.token);
              localStorage.setItem('jwt', data.token);
              localStorage.setItem('clq_has_access', '1');
              if (data.short_code) {
                localStorage.setItem('clq_short_code', data.short_code);
              }
            } catch (_) {}
            return true;
          }
        }
      } catch (_) {}
    }

    return false;
  }

  /**
   * Si des identifiants sont présents (localStorage ou IndexedDB), les valide via l'API.
   * En cas d'échec, purge tout pour forcer le flux paiement / code.
   */
  async function ensureValidAuthOrClear(apiBase) {
    if (!hasStoredCredentials()) {
      return false;
    }
    const valid = await validateAuthWithApi(apiBase);
    if (!valid) {
      clearAuthStorage();
      return false;
    }
    return true;
  }

  window.clqAuthSession = {
    AUTH_KEYS,
    resolveApiBase,
    normalizeShortCode,
    hasStoredCredentials,
    clearAuthStorage,
    validateAuthWithApi,
    ensureValidAuthOrClear,
  };
})();
