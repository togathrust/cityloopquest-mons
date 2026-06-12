/**
 * Session d'accès payant : validation API et nettoyage des données obsolètes.
 * IndexedDB conserve l'activation pour l'app installée (PWA).
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

  function isInstalledPwa() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('pwa') === '1' || params.get('installed') === 'true') {
        return true;
      }
    } catch (_) {}
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    } catch (_) {}
    if (window.navigator && window.navigator.standalone === true) return true;
    try {
      if (localStorage.getItem('pwa-installed') === 'true') return true;
    } catch (_) {}
    return false;
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

  function applyWhoamiSuccess(me) {
    if (!me) return;
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

  function isNetworkFailure(status, error) {
    if (error) return true;
    if (!status) return true;
    return status >= 500 || status === 408 || status === 429;
  }

  function isAuthFailure(status) {
    return status === 401 || status === 403 || status === 404 || status === 410;
  }

  /**
   * @returns {{ valid: boolean, reason: 'ok'|'network'|'invalid'|'missing' }}
   */
  async function validateAuthWithApi(apiBase) {
    const API_BASE = (apiBase || resolveApiBase()).replace(/\/+$/, '');
    const token = localStorage.getItem('clq_token') || localStorage.getItem('jwt');
    const shortCode = localStorage.getItem('clq_short_code');
    const headers = { 'ngrok-skip-browser-warning': 'true' };

    if (!token && !shortCode) {
      return { valid: false, reason: 'missing' };
    }

    if (token) {
      try {
        const r = await fetch(`${API_BASE}/api/auth/whoami`, {
          method: 'GET',
          headers: Object.assign({ Authorization: `Bearer ${token}` }, headers),
        });
        if (r.ok) {
          const me = await r.json().catch(() => null);
          applyWhoamiSuccess(me);
          return { valid: true, reason: 'ok' };
        }
        if (isNetworkFailure(r.status)) {
          return { valid: false, reason: 'network' };
        }
        if (isAuthFailure(r.status)) {
          // Token rejeté : on tentera le code ci-dessous
        }
      } catch (_) {
        return { valid: false, reason: 'network' };
      }
    }

    if (shortCode) {
      const code = normalizeShortCode(shortCode);
      if (!/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/.test(code)) {
        return { valid: false, reason: 'invalid' };
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
            return { valid: true, reason: 'ok' };
          }
          return { valid: false, reason: 'invalid' };
        }
        if (isNetworkFailure(r.status)) {
          return { valid: false, reason: 'network' };
        }
        return { valid: false, reason: 'invalid' };
      } catch (_) {
        return { valid: false, reason: 'network' };
      }
    }

    return { valid: false, reason: 'invalid' };
  }

  /**
   * @param {{ pwaMode?: boolean }} [options]
   * En PWA : ne jamais purger sur erreur réseau ; conserver l'activation locale.
   */
  async function ensureValidAuthOrClear(apiBase, options) {
    const pwaMode = !!(options && options.pwaMode) || isInstalledPwa();

    if (!hasStoredCredentials()) {
      return false;
    }

    const result = await validateAuthWithApi(apiBase);

    if (result.valid) {
      return true;
    }

    if (pwaMode && result.reason === 'network' && hasStoredCredentials()) {
      return true;
    }

    if (result.reason === 'invalid') {
      clearAuthStorage();
      return false;
    }

    if (result.reason === 'network') {
      return false;
    }

    clearAuthStorage();
    return false;
  }

  window.clqAuthSession = {
    AUTH_KEYS,
    resolveApiBase,
    isInstalledPwa,
    normalizeShortCode,
    hasStoredCredentials,
    clearAuthStorage,
    validateAuthWithApi,
    ensureValidAuthOrClear,
  };
})();
