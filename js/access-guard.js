/**
 * js/access-guard.js
 * Garde d'accès : bloque l'affichage des pages si aucune licence valide.
 *
 * Bypass tests locaux : localhost / 127.0.0.1 ou ?dev=1
 */

(function () {
  'use strict';

  const path = window.location.pathname || '';
  const file = (path.split('/').pop() || '').toLowerCase();

  const PUBLIC_PAGES = new Set([
    '',
    'index.html',
    'index.htm',
    'language-selection.html',
    'choose-access.html',
    'activation.html',
    'activation-manual.html',
    'post-checkout.html',
    'checkout.html',
    'offline.html',
    'mail.html',
  ]);

  if (PUBLIC_PAGES.has(file)) {
    return;
  }

  const isLocalDev =
    /^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(window.location.hostname) ||
    window.location.search.includes('dev=1');
  if (isLocalDev) {
    return;
  }

  const CHOOSE_ACCESS_PAGE = '/choose-access.html';

  function showBlockedPopupAndRedirect() {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999';

    const box = document.createElement('div');
    box.style.cssText =
      'background:#fff;padding:20px;border-radius:10px;max-width:420px;text-align:center;font-family:system-ui,sans-serif';

    box.innerHTML =
      '<p>Cette application touristique est payante.</p>' +
      '<p>Cliquez sur le lien suivant pour accéder à la page d\'achat ou d\'activation.</p>' +
      '<p><a id="clq_back_to_access" href="' +
      CHOOSE_ACCESS_PAGE +
      '">Accéder à la page d\'achat</a></p>' +
      '<p>Bonne ballade&nbsp;!</p>';

    overlay.appendChild(box);

    function insertOverlay() {
      document.body.appendChild(overlay);
      const link = document.getElementById('clq_back_to_access');
      if (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = CHOOSE_ACCESS_PAGE;
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insertOverlay);
    } else {
      insertOverlay();
    }
  }

  function loadAuthSession() {
    return new Promise((resolve) => {
      if (window.clqAuthSession) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'js/auth-session.js';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      (document.head || document.documentElement).appendChild(script);
    });
  }

  async function restoreAuthForPwa() {
    if (!window.storageHelper || typeof window.storageHelper.restorePurchaseData !== 'function') {
      return;
    }
    const pwaMode =
      (window.clqAuthSession && window.clqAuthSession.isInstalledPwa && window.clqAuthSession.isInstalledPwa()) ||
      false;
    if (!pwaMode) return;
    try {
      await window.storageHelper.restorePurchaseData({ forceFromIdb: true });
    } catch (_) {}
  }

  async function runGuard() {
    await loadAuthSession();
    await restoreAuthForPwa();

    const auth = window.clqAuthSession;
    if (!auth || typeof auth.ensureValidAuthOrClear !== 'function') {
      showBlockedPopupAndRedirect();
      return;
    }

    const pwaMode = auth.isInstalledPwa ? auth.isInstalledPwa() : false;

    if (!auth.hasStoredCredentials()) {
      showBlockedPopupAndRedirect();
      return;
    }

    const valid = await auth.ensureValidAuthOrClear(undefined, { pwaMode });
    if (!valid) {
      showBlockedPopupAndRedirect();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runGuard);
  } else {
    runGuard();
  }
})();
