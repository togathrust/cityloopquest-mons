// api-base.js — sélection automatique de l'API (DEV/PROD) + override local
// @ts-nocheck
(function () {
  'use strict';

  // === 1) URL d'API de PROD =========================
  // URL publique Render :
  var PROD_API = 'https://cityloopquest-api.onrender.com';

  // === 2) Helpers localStorage sûrs ==================
  function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  // === 3) Si APP_CONFIG.API_BASE est déjà présent (défini ailleurs), on le respecte
  var prewired = (typeof window !== 'undefined' &&
                  window.APP_CONFIG && window.APP_CONFIG.API_BASE) || null;

  // === 4) Détection DEV : si on sert la page en local, pointer API locale:8081
  function devApiIfLocal() {
    try {
      if (typeof location !== 'undefined') {
        var host = String(location.hostname || '').toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1') {
          return 'http://localhost:8081';
        }
      }
    } catch (_) {}
    return null;
  }

  // === 4b) Détection si on est en localhost (pour usage de 'api_base' custom) ==
  var isLocalHost = false;
  try {
    if (typeof location !== 'undefined') {
      var h = String(location.hostname || '').toLowerCase();
      isLocalHost = (h === 'localhost' || h === '127.0.0.1');
    }
  } catch (_) {
    isLocalHost = false;
  }

  var devApi  = devApiIfLocal();
  var stored  = safeGet('api_base');

  // === 5) Priorité de sélection ======================
  // 1) prewired -> 2) dev local -> 3) stockage (UNIQUEMENT en local) -> 4) PROD
  var apiBase = prewired || devApi || (isLocalHost ? stored : null) || PROD_API;

  // === 6) On synchronise toujours 'api_base' avec la valeur retenue ============
  // (Évite les vieilles URLs ngrok / localhost quand on revient sur le site)
  safeSet('api_base', apiBase);

  // === 7) Expose proprement ==========================
  window.APP_CONFIG = window.APP_CONFIG || {};
  window.APP_CONFIG.API_BASE = apiBase;

  // === 8) Helper setApiBase uniquement en local ======
  (function exposeDevSetter(){
    var isLocal = false;
    try {
      var h = (location.hostname || '').toLowerCase();
      isLocal = (h === 'localhost' || h === '127.0.0.1');
    } catch(_) {}

    if (!isLocal) return;

    // > setApiBase('http://localhost:8081'); location.reload();
    window.setApiBase = function (url) {
      if (typeof url !== 'string' || !url.trim()) return;
      var clean = url.trim();
      safeSet('api_base', clean);
      window.APP_CONFIG.API_BASE = clean;
      return clean;
    };
  })();
})();

// === 9) Pré-remplissage du code d’activation depuis ?prefill=... ======
(function prefillActivation() {
  try {
    var qs = new URLSearchParams(location.search);
    var prefill = (qs.get('prefill') || '').trim();
    if (!prefill) return;
    var input = document.querySelector('#code');
    if (input && 'value' in input) {
      input.value = prefill;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
  } catch (_) {}
})();
