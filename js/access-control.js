// Récupère la base API injectée par api-base.js, avec fallback Render
const API_BASE =
  (window.API_BASE_URL && window.API_BASE_URL.replace(/\/+$/, '')) ||
  'https://cityloopquest-api.onrender.com';

// 🔹 Helper : savoir si on est sur la page d'accueil / sélection de langue
function isLandingPage() {
  const path = window.location.pathname || '';
  const file = path.split('/').pop() || 'index.html';

  return (
    file === '' ||
    file === 'index.html' ||
    file === 'index.htm'
  );
}

// === Système de contrôle d'accès pour versions LITE et FULL ===

class AccessControl {
  constructor() {
    this.currentVersion = this.getCurrentVersion();
    this.restrictedPages = this.getRestrictedPages();
    this.restrictedFeatures = this.getRestrictedFeatures();
  }

  // Obtenir la version actuelle de l'utilisateur
  getCurrentVersion() {
    const stored = localStorage.getItem('user_version');
    let version;
    if (stored === 'FULL' || stored === 'LITE') {
      version = stored;
    } else {
      // Par défaut : LITE (plus prudent que FULL)
      version = 'LITE';
    }
    return version;
  }

  // Définir les pages restreintes pour la version LITE
  getRestrictedPages() {
    return {
      // Circuits restreints : en LITE → "moyen" et "grand" interdits
      'parcours.html': { type: 'circuit', restricted: ['moyen', 'grand'] },

      // Pages / contenus culturels restreints en LITE
      // "chansons.html" est volontairement NON restreinte
      'histoire-ville.html': { type: 'page', restricted: true },
      'personnalites.html': { type: 'page', restricted: true },
      'folklore.html': { type: 'page', restricted: true },
      'evenements.html': { type: 'page', restricted: true },

      // (ne pas lister les popups ici ; ils sont gérés en "features")
    };
  }

  // "Pages" virtuelles / popups à restreindre en LITE
  getRestrictedFeatures() {
    return {
      // Popup Histoire du doudou → RESTREINT en LITE
      histoire_doudou: true,
      // Note: parler_montois et infos_contacts sont libres (non listés)
    };
  }

  // Vérifier si une page est accessible
  isPageAccessible(pageName, circuitType = null) {
    if (this.currentVersion === 'FULL') {
      return true;
    }

    if (this.currentVersion === 'LITE') {
      const restriction = this.restrictedPages[pageName];

      if (!restriction) {
        return true; // Page non listée = accessible
      }

      if (restriction.type === 'circuit') {
        // Sur un circuit, on doit connaître le type demandé (petit/moyen/grand)
        const type = (circuitType || '').toLowerCase().trim();
        if (!type) {
          // Pas de type = on ne bloque pas ici (la page "parcours.html" peut s’ouvrir,
          // mais les actions internes pourront être protégées au clic)
          return true;
        }
        const isRestricted = restriction.restricted.includes(type);
        return !isRestricted;
      }

      if (restriction.type === 'page') {
        const isRestricted = !!restriction.restricted;
        return !isRestricted;
      }
    }

    return true;
  }

  // Vérifier si une "feature" (popup) est accessible
  isFeatureAccessible(featureKey) {
    if (this.currentVersion === 'FULL') return true;

    if (this.currentVersion === 'LITE') {
      const isRestricted = !!this.restrictedFeatures[featureKey];
      return !isRestricted;
    }
    return true;
  }

  // Vérifier l'accès avant de naviguer vers une page
  checkAccess(pageName, circuitType = null) {
    if (this.isPageAccessible(pageName, circuitType)) {
      return true;
    }

    // Si c'est un utilisateur LITE, afficher le popup de choix
    if (this.currentVersion === 'LITE') {
      this.showLiteChoicePopup(pageName);
      return false;
    }

    // Pour les autres cas, afficher le popup d'upgrade standard
    this.showUpgradePopup();
    return false;
  }

  // Vérifier l'accès pour une feature (popup)
  checkFeatureAccess(featureKey) {
    if (this.isFeatureAccessible(featureKey)) {
      return true;
    }

    if (this.currentVersion === 'LITE') {
      this.showLiteChoicePopup(featureKey);
      return false;
    }

    this.showUpgradePopup();
    return false;
  }

  // Afficher le popup de choix pour les utilisateurs LITE
  showLiteChoicePopup(contextKey) {
    const popup = this.createLiteChoicePopup(contextKey);
    document.body.appendChild(popup);
  }

  // Afficher le popup d'upgrade
  showUpgradePopup() {
    const popup = this.createUpgradePopup();
    document.body.appendChild(popup);
  }

  // Créer le popup d'upgrade (fallback) - style unifié
  createUpgradePopup() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const popup = document.createElement('div');
    popup.className = 'popup-confirm';
    popup.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 24px 28px;
      max-width: min(420px, calc(100vw - 40px));
      width: 90%;
      text-align: center;
      box-shadow: 0 18px 45px rgba(20,54,92,0.35);
      border: 2px solid #14365c;
    `;

    const message = window.translationManager && window.translationManager.isLoaded
      ? window.translationManager.translate('upgrade_required_message')
      : 'L\'accès à ce contenu est réservé aux détenteurs d\'un accès FULL. Voulez-vous une mise à niveau ?';

    popup.innerHTML = `
      <div class="popup-title" style="margin-bottom:18px;color:#14365c;">${message}</div>
      <div class="popup-actions">
        <button id="upgrade-yes" style="
          background:#14365c;color:#fff;border:none;padding:14px 32px;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;box-shadow:0 8px 18px rgba(20,54,92,0.25);">
          ${window.translationManager && window.translationManager.isLoaded ? window.translationManager.translate('yes') : 'OUI'}
        </button>
        <button id="upgrade-no" style="
          background:#14365c;color:#fff;border:none;padding:14px 32px;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;box-shadow:0 8px 18px rgba(20,54,92,0.25);opacity:0.7;">
          ${window.translationManager && window.translationManager.isLoaded ? window.translationManager.translate('no_thanks') : 'NON MERCI'}
        </button>
      </div>
    `;

    popup.querySelector('#upgrade-yes').addEventListener('click', () => {
      this.handleUpgradeFromLite(); // pas de contextKey ici
      document.body.removeChild(overlay);
    });

    popup.querySelector('#upgrade-no').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.appendChild(popup);
    return overlay;
  }

  // Créer le popup de choix pour les utilisateurs LITE - style unifié
  createLiteChoicePopup(contextKey) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const popup = document.createElement('div');
    popup.className = 'popup-confirm';
    popup.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 24px 28px;
      max-width: min(420px, calc(100vw - 40px));
      width: 90%;
      text-align: center;
      box-shadow: 0 18px 45px rgba(20,54,92,0.35);
      border: 2px solid #14365c;
    `;

    const title = window.translationManager && window.translationManager.isLoaded
      ? window.translationManager.translate('lite_access_title')
      : 'Accès LITE détecté';

    const message = window.translationManager && window.translationManager.isLoaded
      ? window.translationManager.translate('lite_access_message')
      : 'Ce contenu est réservé aux détenteurs d\'un accès FULL. Voulez-vous passer à FULL ?';

    const yes = window.translationManager && window.translationManager.isLoaded
      ? window.translationManager.translate('yes')
      : 'OUI';

    const no = window.translationManager && window.translationManager.isLoaded
      ? window.translationManager.translate('no')
      : 'NON';

    popup.innerHTML = `
      <div class="popup-title" style="margin-bottom:18px;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        ${title}
      </div>
      <p style="margin:0 0 20px;color:#2b6cb0;font-size:14px;line-height:1.5;">${message}</p>
      <div class="popup-actions">
        <button id="lite-yes" style="
          background:#14365c;color:#fff;border:none;padding:14px 32px;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;box-shadow:0 8px 18px rgba(20,54,92,0.25);">
          ${yes}
        </button>
        <button id="lite-no" style="
          background:#14365c;color:#fff;border:none;padding:14px 32px;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;box-shadow:0 8px 18px rgba(20,54,92,0.25);opacity:0.7;">
          ${no}
        </button>
      </div>
    `;

    popup.querySelector('#lite-yes').addEventListener('click', () => {
      this.handleUpgradeFromLite(contextKey);
      document.body.removeChild(overlay);
    });

    popup.querySelector('#lite-no').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.appendChild(popup);
    return overlay;
  }

  // 🔧 NOUVELLE VERSION de getApiBase : respecte API_BASE_URL / Render
  getApiBase() {
    // 1) API_BASE via config globale (api-base.js)
    if (window.APP_CONFIG && window.APP_CONFIG.API_BASE) {
      return window.APP_CONFIG.API_BASE.replace(/\/+$/, '');
    }
  
    // 2) Ancienne variable globale éventuelle
    if (window.API_BASE_URL) {
      return window.API_BASE_URL.replace(/\/+$/, '');
    }
  
    // 3) Sauvegarde éventuelle dans localStorage
    const stored = localStorage.getItem('api_base');
    if (stored) {
      return stored.replace(/\/+$/, '');
    }
  
    // 4) Fallback dur vers Render (plutôt que Netlify)
    return 'https://cityloopquest-api.onrender.com';
  }

  // Message d'erreur plus lisible pour l'utilisateur
  getFriendlyUpgradeError(error) {
    const code = error && error.message;
    switch (code) {
      case 'missing_token':
        return 'Votre session a expiré. Merci de relancer l\'application ou de vous reconnecter.';
      case 'whoami_failed':
      case 'whoami_parse_error':
        return 'Impossible de vérifier votre licence LITE. Réessayez dans un instant.';
      case 'no_short_code_found':
        return 'Aucun code de licence LITE trouvé pour cet appareil. Contactez le support si le problème persiste.';
      default:
        return 'Une erreur est survenue lors de la création de la page de paiement. Merci de réessayer.';
    }
  }

  // Gérer l'upgrade depuis le mode LITE → plan UPGRADE_FULL (appel direct Stripe)
  async handleUpgradeFromLite(contextKey = null) {
    this.saveUserState(contextKey);                    // on mémorise l'état exact
    localStorage.setItem('upgrade_type', 'UPGRADE_FULL'); // pour savoir qu'on a une upgrade en cours

    try {
      await this.startUpgradeToFullFromLite();
    } catch (e) {
      console.error('❌ Erreur lors de l\'upgrade FULL depuis LITE:', e);
      const msg = this.getFriendlyUpgradeError(e);
      if (window.alert) {
        alert(msg);
      }
    }
  }

  // Appel API pour créer la session Stripe d'upgrade FULL
  async startUpgradeToFullFromLite() {
    const API_BASE = this.getApiBase();

    const token = localStorage.getItem('clq_token');
    if (!token) {
      throw new Error('missing_token');
    }

    // On prépare les headers communs (skip warning ngrok + Bearer)
    const commonHeaders = {
      'ngrok-skip-browser-warning': 'true',
      Authorization: `Bearer ${token}`
    };

    // 1) whoami pour récupérer la ville et le short_code de la licence LITE
    const whoamiResp = await fetch(`${API_BASE}/api/auth/whoami`, {
      headers: commonHeaders
    });

    if (!whoamiResp.ok) {
      console.error('❌ /whoami a échoué avec le statut', whoamiResp.status);
      throw new Error('whoami_failed');
    }

    let me;
    try {
      me = await whoamiResp.json();
    } catch (e) {
      console.error('❌ Erreur de parsing JSON sur /whoami:', e);
      throw new Error('whoami_parse_error');
    }

    const city = me.city_slug || 'mons';
    const activation_code = (me.short_code || '').toLowerCase(); // short_code de la licence LITE

    if (!activation_code) {
      console.error('❌ Aucun short_code trouvé dans /whoami');
      throw new Error('no_short_code_found');
    }

    // 2) Création de la session Stripe
    const selectedLang =
      localStorage.getItem('selectedLanguage') ||
      localStorage.getItem('lang') ||
      'fr';

    const localeMap = {
      fr: 'fr',
      en: 'en',
      nl: 'nl',
      de: 'de',
      it: 'it',
      es: 'es',
      pl: 'pl',
      ar: 'en',
      cn: 'zh',
      jp: 'ja',
    };
    const stripeLocale = localeMap[selectedLang] || 'fr';

    const emailMap = {
      fr: 'fr',
      en: 'en',
      nl: 'nl',
      de: 'de',
      it: 'it',
      es: 'es',
      pl: 'pl',
      ar: 'ar',
      cn: 'zh',
      jp: 'ja',
    };
    const emailLanguage = emailMap[selectedLang] || 'fr';

    const requestBody = {
      city,
      is_upgrade: true,
      activation_code,
      locale: stripeLocale,
      user_language: emailLanguage,
    };

    const checkoutResp = await fetch(`${API_BASE}/api/checkout/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await checkoutResp.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      console.error(
        '❌ Erreur de parsing JSON sur /checkout/session:',
        e,
        rawText,
      );
      throw new Error('stripe_error');
    }

    if (!checkoutResp.ok || !data?.url) {
      console.error('❌ Réponse /checkout/session invalide:', data);
      throw new Error(data?.error || 'stripe_error');
    }

    window.location.href = data.url; // Stripe Checkout
  }

  // Gérer l'upgrade (cas générique)
  handleUpgrade() {
    this.saveUserState();
    this.handleUpgradeFromLite();
  }

  // Sauvegarder l'état de l'utilisateur
  saveUserState(contextKey = null) {
    const fullUrl = window.location.href;
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;

    const completeUrl = fullUrl || currentPath + currentSearch + currentHash;

    const userState = {
      currentIndex:
        typeof window.currentIndex !== 'undefined'
          ? window.currentIndex
          : null,
      completedQuizQuestions: JSON.parse(
        localStorage.getItem('mons_completedQuizQuestions') || '{}',
      ),
      score: typeof window.score !== 'undefined' ? window.score : null,
      selectedCircuit: localStorage.getItem('selectedCircuit') || null,
      quizEnabled: localStorage.getItem('mons_quizEnabled') === 'true',
      lastUrl: completeUrl,
      currentPath: currentPath,
      currentSearch: currentSearch,
      contextKey: contextKey || null,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      'user_state_before_upgrade',
      JSON.stringify(userState),
    );
  }

  // Restaurer l'état après upgrade
  restoreUserState() {
    const savedState = localStorage.getItem('user_state_before_upgrade');
    if (!savedState) return false;
    try {
      const s = JSON.parse(savedState);

      if (
        typeof window.currentIndex !== 'undefined' &&
        s.currentIndex !== null
      ) {
        window.currentIndex = s.currentIndex;
      }
      if (typeof window.score !== 'undefined' && s.score !== null) {
        window.score = s.score;
      }

      localStorage.setItem(
        'mons_completedQuizQuestions',
        JSON.stringify(s.completedQuizQuestions || {}),
      );

      if (s.selectedCircuit) {
        localStorage.setItem('selectedCircuit', s.selectedCircuit);
      }

      localStorage.setItem(
        'mons_quizEnabled',
        s.quizEnabled ? 'true' : 'false',
      );

      localStorage.removeItem('user_state_before_upgrade');
      return true;
    } catch (e) {
      console.error('❌ Erreur restauration état:', e);
      return false;
    }
  }

  // Vérifier après retour de Stripe si l'upgrade est bien passée en FULL
  async checkPostUpgradeOnLoad() {
    const upgradeType = localStorage.getItem('upgrade_type');
    if (upgradeType !== 'UPGRADE_FULL') {
      return;
    }

    const currentVersion = localStorage.getItem('user_version');
    if (currentVersion === 'FULL') {
      this.upgradeToFull();
      this.restoreUserState();
      localStorage.removeItem('upgrade_type');
      return;
    }

    const API_BASE = this.getApiBase();
    const token = localStorage.getItem('clq_token');
    if (!token) {
      console.warn(
        'Pas de token en retour d\'upgrade, on ne peut pas vérifier le plan.',
      );
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/api/auth/whoami`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!r.ok) {
        console.warn('whoami après upgrade a échoué avec statut', r.status);
        return;
      }

      const me = await r.json();

      const hasFull =
        me.access_type === 'FULL' ||
        me.plan === 'FULL' ||
        me.is_full === true ||
        me.licence_type === 'FULL';

      if (hasFull) {
        this.upgradeToFull();
        this.restoreUserState();
        localStorage.removeItem('upgrade_type');
      } else {
        // rien, l'upgrade n'est pas encore prise en compte
      }
    } catch (e) {
      console.error('❌ Erreur checkPostUpgradeOnLoad:', e);
    }
  }

  // Mettre à jour la version après upgrade
  upgradeToFull() {
    localStorage.setItem('user_version', 'FULL');
    this.currentVersion = 'FULL';
  }
}

// Créer une instance globale
window.accessControl = new AccessControl();

// Vérifier automatiquement après retour de Stripe si un upgrade vient d'avoir lieu
// 👉 On peut laisser ça actif même sur index.html, ça ne montre pas de popup "payant"
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.accessControl.checkPostUpgradeOnLoad();
  });
} else {
  window.accessControl.checkPostUpgradeOnLoad();
}

// Fonctions utilitaires globales
window.checkPageAccess = function (pageName, circuitType = null) {
  return window.accessControl.checkAccess(pageName, circuitType);
};
window.checkFeatureAccess = function (featureKey) {
  return window.accessControl.checkFeatureAccess(featureKey);
};
window.checkCircuitAccess = function (type) {
  return window.accessControl.checkAccess('parcours.html', type);
};

// === Hooks de navigation protégée ===
document.addEventListener('DOMContentLoaded', function () {
  // ⛔️ Si on est sur la page d'accueil / sélection de langue, on ne met AUCUNE protection LITE/FULL
  if (isLandingPage()) {
    return;
  }

  // 1) Liens <a href="...">
  document.addEventListener(
    'click',
    function (e) {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href') || '';
      const url = new URL(href, location.href);
      const page = url.pathname.split('/').pop();

      const restriction = window.accessControl.restrictedPages[page];
      if (!restriction) return;

      if (page === 'parcours.html' && restriction.type === 'circuit') {
        const fromQuery = (url.searchParams.get('type') || '')
          .toLowerCase()
          .trim();
        const fromDataset = (
          link.dataset.circuit || link.dataset.circuitType || ''
        )
          .toLowerCase()
          .trim();
        const fromStorage = (
          localStorage.getItem('selectedCircuit') || ''
        )
          .toLowerCase()
          .trim();

        const circuitType = fromQuery || fromDataset || fromStorage || '';

        const allowed = window.accessControl.checkAccess(
          'parcours.html',
          circuitType,
        );
        if (!allowed) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      const allowed = window.accessControl.checkAccess(page);
      if (!allowed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    },
    true,
  );

  // 2) Boutons avec onclick="location.href='...'"
  document.addEventListener(
    'click',
    function (e) {
      const btn = e.target.closest('button[onclick]');
      if (!btn) return;

      const onclick = btn.getAttribute('onclick') || '';
      const m = onclick.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
      if (!m) return;

      const href = m[1];
      const url = new URL(href, location.href);
      const page = url.pathname.split('/').pop();

      const restriction = window.accessControl.restrictedPages[page];
      if (!restriction) return;

      if (page === 'parcours.html' && restriction.type === 'circuit') {
        const fromQuery = (url.searchParams.get('type') || '')
          .toLowerCase()
          .trim();
        const fromDataset = (
          btn.dataset.circuit || btn.dataset.circuitType || ''
        )
          .toLowerCase()
          .trim();
        const fromStorage = (
          localStorage.getItem('selectedCircuit') || ''
        )
          .toLowerCase()
          .trim();

        const circuitType = fromQuery || fromDataset || fromStorage || '';
        const allowed = window.accessControl.checkAccess(
          'parcours.html',
          circuitType,
        );
        if (!allowed) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      const allowed = window.accessControl.checkAccess(page);
      if (!allowed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    },
    true,
  );

  // 3) Boutons / éléments dédiés au choix de circuit
  document.addEventListener(
    'click',
    function (e) {
      const el = e.target.closest('[data-circuit],[data-circuit-type]');
      if (!el) return;

      const circuitType =
        (el.getAttribute('data-circuit') ||
          el.getAttribute('data-circuit-type') ||
          '')
          .toLowerCase()
          .trim();

      if (!circuitType) return;

      const allowed = window.accessControl.checkAccess(
        'parcours.html',
        circuitType,
      );
      if (!allowed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
});
