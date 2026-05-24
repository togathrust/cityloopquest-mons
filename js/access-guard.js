/**
 * js/access-guard.js
 * Garde d'accès : bloque l'affichage des pages si aucun code d'activation valide (clq_short_code).
 *
 * ⚠️ BYPASS TESTS LOCAUX (désactivation temporaire pour développement) :
 * - Sur localhost / 127.0.0.1 : la garde est automatiquement désactivée
 * - Avec ?dev=1 dans l'URL : désactivation (ex. pour tester depuis mobile sur le réseau)
 * - En production (domaine déployé) : la garde reste ACTIVE, aucune action requise
 *
 * RAPPEL DÉPLOIEMENT : En production (domaine déployé), la garde est automatiquement ACTIVE.
 */

(function () {
  const path = window.location.pathname || '';
  const file = (path.split('/').pop() || '').toLowerCase();

  // Sur Netlify, quand on arrive par la racine, file peut être '' → on considère que c'est index.html
  if (file === '' || file === 'index.html' || file === 'index.htm') {
    return;
  }

  // Bypass pour tests locaux : localhost OU paramètre ?dev=1
  const isLocalDev =
    /^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(window.location.hostname) ||
    window.location.search.includes('dev=1');
  if (isLocalDev) {
    return; // Ne pas bloquer - tests locaux uniquement
  }
(function () {
  const SHORT_CODE_KEY = 'clq_short_code';

  // ⚠ adapte ce chemin à ta vraie page de départ
  // par ex: '/index.html' si c'est la sélection des langues
  const LANGUAGE_PAGE = '/language-selection.html';

  // Même logique que ta fonction existante
  function normalizeShort(input) {
    const raw = String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!raw) return '';
    const nine = raw.slice(0, 9);
    return (nine.match(/.{1,3}/g) || [nine]).join('-'); // xxx-xxx-xxx
  }

  function hasValidAccess() {
    try {
      if (
        localStorage.getItem('clq_has_access') === '1' ||
        localStorage.getItem('clq_token') ||
        localStorage.getItem('jwt')
      ) {
        return true;
      }

      const stored = localStorage.getItem(SHORT_CODE_KEY);
      if (!stored) return false;

      const normalized = normalizeShort(stored);
      if (!normalized) return false;

      // Option : remettre en forme correctement si besoin
      if (normalized !== stored) {
        localStorage.setItem(SHORT_CODE_KEY, normalized);
      }

      // Vérification stricte du format xxx-xxx-xxx
      const isValidFormat = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/.test(normalized);
      return isValidFormat;
    } catch (e) {
      // Si localStorage est désactivé ou plante, on considère que c'est non valable
      console.error('Erreur accès clq_short_code:', e);
      return false;
    }
  }

  function showBlockedPopupAndRedirect() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.background = '#ffffff';
    box.style.padding = '20px';
    box.style.borderRadius = '10px';
    box.style.maxWidth = '420px';
    box.style.textAlign = 'center';
    box.style.fontFamily = 'system-ui, sans-serif';

    box.innerHTML = `
      <p>Cette application touristique est payante.</p>
      <p>Cliquez sur le lien suivant pour revenir à la page d'enregistrement.</p>
      <p>
        <a id="clq_back_to_lang" href="${LANGUAGE_PAGE}">
          Revenir à la page de sélection des langues
        </a>
      </p>
      <p>Bonne ballade&nbsp;!</p>
    `;

    overlay.appendChild(box);

    function insertOverlay() {
      document.body.appendChild(overlay);

      const link = document.getElementById('clq_back_to_lang');
      if (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = LANGUAGE_PAGE;
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insertOverlay);
    } else {
      insertOverlay();
    }
  }

  // Exécution du garde dès le chargement du script
  if (!hasValidAccess()) {
    showBlockedPopupAndRedirect();
  }
})();
})();
