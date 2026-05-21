// === checkout.js (global, sans bundler) ===
(function () {
  /**
   * Résout l'API BASE dans cet ordre :
   * 1) window.APP_CONFIG.API_BASE (config explicite)
   * 2) <meta name="api-base" content="https://...">
   * 3) paramètre d'URL ?api_base=https://...
   * 4) localStorage.getItem('api_base')
   * 5) fallback dev: origin en remplaçant :5173 -> :8080 (localhost)
   */
  function getApiBase() {
    try {
      // 1) Config globale (à poser dans index.html si possible)
      if (window.APP_CONFIG && typeof window.APP_CONFIG.API_BASE === 'string' && window.APP_CONFIG.API_BASE.trim()) {
        return window.APP_CONFIG.API_BASE.replace(/\/+$/, '');
      }

      // 2) Meta tag
      const meta = document.querySelector('meta[name="api-base"]');
      if (meta && meta.content) {
        return meta.content.replace(/\/+$/, '');
      }

      // 3) Paramètre d’URL
      const urlApi = new URLSearchParams(location.search).get('api_base');
      if (urlApi) {
        try {
          const u = new URL(urlApi);
          localStorage.setItem('api_base', `${u.protocol}//${u.host}`); // persiste proprement
          return `${u.protocol}//${u.host}`;
        } catch { /* ignore */ }
      }

      // 4) LocalStorage
      const saved = localStorage.getItem('api_base');
      if (saved && /^https?:\/\//i.test(saved)) {
        return saved.replace(/\/+$/, '');
      }

      // 5) Fallback dev (ne sert qu’en local)
      // Sur Netlify, ceci renverra l’origine Netlify -> il FAUT l’une des 1)–4)
      const dev = window.location.origin.replace(':5173', ':8080');
      return dev.replace(/\/+$/, '');
    } catch {
      // Dernier filet
      return window.location.origin.replace(':5173', ':8080').replace(/\/+$/, '');
    }
  }

  const API_BASE = getApiBase();
  // Expose pour debug rapide depuis la console
  window.__API_BASE__ = API_BASE;

  // Helper fetch avec gestion d’erreurs homogène
  async function fetchApi(path, opts) {
    const url = `${API_BASE}${path}`;
    let res;
    try {
      res = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
    } catch (e) {
      throw new Error(`network_error:${(e && e.message) || e}`);
    }

    // Essayer de parser JSON même en cas d'erreur HTTP
    let data = null;
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    try { data = isJson ? await res.json() : null; } catch { /* ignore */ }

    if (!res.ok) {
      const code = data?.error || `http_${res.status}`;
      const msg = data?.message || '';
      throw new Error(`${code}${msg ? ':' + msg : ''}`);
    }
    return data;
  }

  // Anti double-clic global
  let busy = false;

  // Helper pour obtenir les traductions
  function translate(key, fallback, ...args) {
    if (window.translationManager && window.translationManager.translate) {
      let translated = window.translationManager.translate(key);
      if (translated && translated !== key) {
        // Remplacer {0}, {1}, etc. par les arguments
        if (args.length > 0) {
          args.forEach((arg, index) => {
            translated = translated.replace(`{${index}}`, arg);
          });
        }
        return translated;
      }
    }
    // Fallback : remplacer {0}, {1}, etc. dans le fallback
    let result = fallback;
    if (args.length > 0) {
      args.forEach((arg, index) => {
        result = result.replace(`{${index}}`, arg);
      });
    }
    return result;
  }

  // Mapping des codes de langue de l'app vers les codes de locale Stripe
  function mapToStripeLocale(appLang) {
    const localeMap = {
      'fr': 'fr',
      'en': 'en',
      'nl': 'nl',
      'de': 'de',
      'it': 'it',
      'es': 'es',
      'pl': 'pl',
      'ar': 'en',  // Arabe non supporté par Stripe -> fallback sur anglais
      'cn': 'zh',  // Chinois -> zh pour Stripe
      'jp': 'ja'   // Japonais -> ja pour Stripe
    };
    return localeMap[appLang] || 'fr'; // Fallback sur français
  }

  // Mapping des codes de langue de l'app vers les codes attendus par le serveur pour les emails
  // Certains serveurs peuvent utiliser des codes différents (ex: zh au lieu de cn)
  function mapToEmailLanguage(appLang) {
    const emailMap = {
      'fr': 'fr',  // Français
      'en': 'en',  // Anglais
      'nl': 'nl',  // Néerlandais
      'de': 'de',  // Allemand
      'it': 'it',  // Italien
      'es': 'es',  // Espagnol
      'pl': 'pl',  // Polonais
      'ar': 'ar',  // Arabe
      'cn': 'zh',  // Chinois -> zh pour les emails (serveur attend zh au lieu de cn)
      'jp': 'ja'   // Japonais -> ja pour les emails (serveur attend ja au lieu de jp)
    };
    return emailMap[appLang] || 'fr'; // Fallback sur français
  }

  // Expose la fonction globale attendue par choose-access.html
  window.startCheckout = async function (opts) {
    if (busy) return;
    busy = true;

    const options = opts || {};
    const isUpgrade = !!options.is_upgrade;
    
    // Récupérer la langue sélectionnée et la mapper vers Stripe
    const selectedLang = localStorage.getItem('selectedLanguage') || localStorage.getItem('lang') || 'fr';
    const stripeLocale = mapToStripeLocale(selectedLang);
    const emailLanguage = mapToEmailLanguage(selectedLang); // Mapping spécifique pour les emails
    
    // Déterminer la ville (city_slug) à envoyer au backend
    // IMPORTANT : on ne se base que sur le hostname, pour éviter un localStorage
    // (ancien site) qui ferait croire à Mons.
    function resolveCitySlug() {
      const host = String(location.hostname || '').toLowerCase();
      if (host.includes('murcia')) return 'murcia';
      // Sur Netlify le site est nommé "clq-bruxelles"
      // Le backend semble attendre le slug complet "bruxelles".
      if (host.includes('brux') || host.includes('bxl')) return 'bruxelles';
      if (host.includes('mons')) return 'mons';
      return 'mons';
    }
    
    
    const body = { 
      city: resolveCitySlug(),
      locale: stripeLocale, // Envoyer la locale Stripe à l'API pour la page de paiement
      // user_language: code de langue pour les emails (mappé pour correspondre aux attentes du serveur)
      // Le serveur doit utiliser ce code pour envoyer l'email dans la bonne langue
      user_language: emailLanguage // Envoyer la langue mappée pour l'email (zh pour cn, ja pour jp)
    };
    

    try {
      if (isUpgrade) {
        body.is_upgrade = true;
        body.activation_code = (options.activation_code
          || localStorage.getItem('clq_short_code')
          || ''
        ).toLowerCase();

        if (!body.activation_code) {
          alert(translate(
            'checkout_activation_code_required',
            "Code d'activation introuvable. Réactive d'abord ton code."
          ));
          return;
        }
      } else {
        body.plan = options.plan || 'full'; // 'full' | 'lite'
      }

      // Création session Stripe
      const data = await fetchApi('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!data || !data.url) {
        throw new Error('stripe_error:missing_url');
      }

      // Redirection Stripe
      window.location.href = data.url;
    } catch (err) {
      console.error('[checkout] startCheckout error', err);
      const msg = (err && err.message) ? String(err.message) : 'checkout_failed';
      // Messages traduits
      if (msg.startsWith('http_') || msg.startsWith('network_error')) {
        alert(translate(
          'checkout_server_error',
          `Impossible de contacter le serveur (${msg}). Vérifie ta connexion et réessaie.`,
          msg
        ));
      } else if (msg.startsWith('price_not_configured')) {
        alert(translate(
          'checkout_price_not_configured',
          "Prix non configuré pour cette ville/plan. Contacte l'éditeur."
        ));
      } else if (msg.startsWith('activation_code_required')) {
        alert(translate(
          'checkout_activation_code_required',
          "Code d'activation requis pour l'upgrade."
        ));
      } else {
        alert(translate(
          'checkout_payment_unavailable',
          `Paiement indisponible pour le moment (${msg}).`,
          msg
        ));
      }
    } finally {
      // on relâche après un court délai pour éviter les doubles tirs accidentels
      setTimeout(() => { busy = false; }, 600);
    }
  };

  // Expose aussi fetchApi si besoin ailleurs
  window.fetchApi = fetchApi;
})();
