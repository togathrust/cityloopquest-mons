/**
 * iOS Safari / PWA : corrige le décalage initial en paysage
 * (visualViewport.offsetTop) qui désaligne l'affichage et les touches.
 */
(function (global) {
  'use strict';

  var bound = false;
  var afterFixCallbacks = [];
  var scheduleToken = 0;

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !global.MSStream;
  }

  function isFullscreenMapPage() {
    return !!document.querySelector('.corner-buttons') ||
      /parcours\.html/i.test(String(global.location.pathname || ''));
  }

  function isViewportLockPage() {
    var path = String(global.location.pathname || '');
    return isFullscreenMapPage() ||
      /main\.html/i.test(path) ||
      /selfie\.html/i.test(path);
  }

  function isLandscapeEnforcedPage() {
    var path = String(global.location.pathname || '').split('/').pop().toLowerCase();
    if (!path || path === 'index.html') return false;
    return !/^(language-selection|activation|activation-manual|choose-access|checkout|post-checkout|mail|open-browser|offline|maps-bridge)\.html$/i.test(path);
  }

  function isLandscapeNow() {
    try {
      if (global.matchMedia && global.matchMedia('(orientation: landscape)').matches) return true;
    } catch (e) {}
    return global.innerWidth > global.innerHeight;
  }

  function ensureLandscapeWarning() {
    var id = 'clq-global-landscape-warning';
    var overlay = document.getElementById(id);
    if (overlay) return overlay;
    if (!document.body) return null;

    overlay = document.createElement('div');
    overlay.id = id;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'box-sizing:border-box',
      'padding:20px',
      'background:rgba(255,245,245,0.98)',
      'color:#222',
      'font-family:Arial,sans-serif',
      'text-align:center'
    ].join(';');

    var box = document.createElement('div');
    box.style.cssText = [
      'max-width:min(420px,calc(100vw - 40px))',
      'padding:22px',
      'border:2px solid #14365c',
      'border-radius:14px',
      'background:#fff',
      'box-shadow:0 12px 32px rgba(0,0,0,0.25)',
      'font-size:1.15rem',
      'line-height:1.45'
    ].join(';');
    box.textContent = '🔄 Pour une meilleure expérience, veuillez pivoter votre appareil en mode paysage.';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateLandscapeWarning() {
    if (!isLandscapeEnforcedPage()) return;
    var overlay = ensureLandscapeWarning();
    if (!overlay) return;
    var landscape = isLandscapeNow();
    overlay.style.display = landscape ? 'none' : 'flex';
    if (landscape) {
      resetScroll();
    }
  }

  function resetScroll() {
    try {
      global.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } catch (e) {}
  }

  function applyIOSViewportFix() {
    var html = document.documentElement;
    var body = document.body;
    var vv = global.visualViewport;

    var shouldLockViewport = isViewportLockPage();

    if (shouldLockViewport || isLandscapeNow()) {
      resetScroll();
    }

    if (!vv) {
      html.classList.remove('clq-ios-viewport-lock');
      html.style.transform = '';
      html.style.removeProperty('transform-origin');
      return { applied: false };
    }

    var height = Math.round(vv.height || global.innerHeight);
    var width = Math.round(vv.width || global.innerWidth);
    var top = Math.round(vv.offsetTop || 0);
    var left = Math.round(vv.offsetLeft || 0);

    if (height <= 0 || width <= 0) {
      return { applied: false };
    }

    if (isIOS()) {
      html.classList.add('clq-ios-viewport-lock');
    }

    html.style.setProperty('--app-vh', height + 'px');
    html.style.setProperty('--app-vw', width + 'px');

    if (shouldLockViewport) {
      html.style.height = height + 'px';
      html.style.width = width + 'px';
    } else {
      html.style.removeProperty('height');
      html.style.removeProperty('width');
    }

    if (body && shouldLockViewport) {
      body.style.height = height + 'px';
      body.style.width = width + 'px';
    } else if (body) {
      body.style.removeProperty('height');
      body.style.removeProperty('width');
    }

    if (top || left) {
      html.style.transform = 'translate(' + (-left) + 'px,' + (-top) + 'px)';
      html.style.transformOrigin = 'top left';
    } else {
      html.style.transform = '';
      html.style.removeProperty('transform-origin');
    }

    if (isFullscreenMapPage()) {
      var mapEl = document.getElementById('map');
      if (mapEl) {
        mapEl.style.height = height + 'px';
        mapEl.style.width = width + 'px';
      }

      var cornerButtons = document.querySelector('.corner-buttons');
      if (cornerButtons) {
        cornerButtons.style.height = height + 'px';
        cornerButtons.style.width = width + 'px';
      }

      var leafletContainer = document.querySelector('.leaflet-container');
      if (leafletContainer) {
        leafletContainer.style.height = height + 'px';
        leafletContainer.style.width = width + 'px';
      }
    } else {
      var mapElMain = document.getElementById('map');
      if (mapElMain) {
        mapElMain.style.removeProperty('height');
        mapElMain.style.removeProperty('width');
      }
    }

    return { applied: true, height: height, width: width, top: top, left: left };
  }

  function runAfterFixCallbacks() {
    for (var i = 0; i < afterFixCallbacks.length; i++) {
      try {
        afterFixCallbacks[i]();
      } catch (e) {}
    }
  }

  function recalibrate() {
    var result = applyIOSViewportFix();
    updateLandscapeWarning();
    runAfterFixCallbacks();
    return result;
  }

  function scheduleRecalibration() {
    var token = ++scheduleToken;
    [0, 16, 50, 100, 180, 350, 700, 1200, 2000].forEach(function (delay) {
      setTimeout(function () {
        if (token !== scheduleToken) return;
        recalibrate();
      }, delay);
    });

    if (typeof global.requestAnimationFrame === 'function') {
      var frames = 0;
      function onFrame() {
        if (token !== scheduleToken) return;
        recalibrate();
        frames += 1;
        if (frames < 6) global.requestAnimationFrame(onFrame);
      }
      global.requestAnimationFrame(onFrame);
    }
  }

  function bindIOSViewportFix(opts) {
    opts = opts || {};

    if (opts.onRecalibrate && afterFixCallbacks.indexOf(opts.onRecalibrate) === -1) {
      afterFixCallbacks.push(opts.onRecalibrate);
    }

    if (bound) {
      scheduleRecalibration();
      return;
    }
    bound = true;

    var rerun = function () {
      scheduleRecalibration();
    };

    global.addEventListener('resize', rerun, { passive: true });
    global.addEventListener('orientationchange', rerun, { passive: true });
    global.addEventListener('pageshow', rerun, { passive: true });
    global.addEventListener('load', rerun, { passive: true });

    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', rerun, { passive: true });
      global.visualViewport.addEventListener('scroll', rerun, { passive: true });
    }

    if (global.screen && global.screen.orientation && typeof global.screen.orientation.addEventListener === 'function') {
      global.screen.orientation.addEventListener('change', rerun, { passive: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', rerun, { once: true });
    }

    rerun();
  }

  global.CLQViewportFix = {
    isIOS: isIOS,
    apply: applyIOSViewportFix,
    recalibrate: recalibrate,
    schedule: scheduleRecalibration,
    bind: bindIOSViewportFix
  };
})(window);
