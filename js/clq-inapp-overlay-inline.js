/**
 * Popup TogaThrust — GPS : navigateur complet requis.
 * Bouton bleu Partager/Chrome : affiché mais désactivé (menu Partager natif).
 */
(function () {
    var SK = "clq_inapp_safari_dismissed";
    var SHARE_ICON =
        '<img src="images/partager_ios.png" alt="" aria-hidden="true" style="height:1.2em;width:auto;vertical-align:-0.2em;margin:0 3px;">';

    function appUrl() {
        var u = location.href.split("#")[0];
        return /\/open-browser\.html/i.test(u) ? location.origin + "/" : u;
    }

    function isDismissed() {
        if (window.__clqInAppOverlayDismissed === true) return true;
        try {
            if (sessionStorage.getItem(SK) === "1") return true;
            if (localStorage.getItem(SK) === "1") return true;
        } catch (e) {
            /* ignore */
        }
        return /(?:^|;\s*)clq_inapp_dismissed=1(?:;|$)/.test(
            document.cookie || ""
        );
    }

    window.clqDismissInAppOverlay = function () {
        window.__clqInAppOverlayDismissed = true;
        try {
            sessionStorage.setItem(SK, "1");
            localStorage.setItem(SK, "1");
        } catch (e) {
            /* ignore */
        }
        document.cookie =
            "clq_inapp_dismissed=1; path=/; max-age=604800; SameSite=Lax";
        document.documentElement.classList.add("clq-inapp-overlay-off");
        var el = document.getElementById("clq-inapp-safari-overlay");
        if (el) {
            el.hidden = true;
            el.setAttribute("hidden", "hidden");
            el.style.display = "none";
        }
        var geo = document.getElementById("main-geo-activation-overlay");
        if (geo) {
            geo.hidden = true;
            geo.setAttribute("hidden", "hidden");
            geo.style.display = "none";
        }
        return false;
    };

    window.clqCopyAppLink = function () {
        window.clqDismissInAppOverlay();
        var url = appUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).catch(function () {
                window.prompt("Copiez ce lien :", url);
            });
        } else {
            window.prompt("Copiez ce lien :", url);
        }
        return false;
    };

    window.clqShowInAppSafariOverlay = function () {
        if (isDismissed()) return;
        ensureOverlayDom();
        var el = document.getElementById("clq-inapp-safari-overlay");
        if (!el) return;
        el.hidden = false;
        el.removeAttribute("hidden");
        el.style.display = "flex";
    };

    function isInstalledPwa() {
        try {
            if (window.navigator.standalone === true) return true;
            if (
                window.matchMedia &&
                window.matchMedia("(display-mode: standalone)").matches
            ) {
                return true;
            }
            if (localStorage.getItem("pwa-installed") === "true") return true;
        } catch (e) {
            /* ignore */
        }
        return false;
    }

    /** Popup uniquement pour WebView / navigateur intégré (ex. TogaThrust), pas pour l’app PWA installée. */
    window.clqNeedsSafariForGeo = function () {
        if (isDismissed()) return false;
        if (isInstalledPwa()) return false;

        var ua = navigator.userAgent || "";
        var ios = /iPhone|iPad|iPod/i.test(ua);
        if (
            ios &&
            !/Safari/i.test(ua) &&
            !/CriOS/i.test(ua) &&
            !/FxiOS/i.test(ua)
        ) {
            return true;
        }
        if (/Android/i.test(ua) && /; wv\)|\bwv\b|WebView/i.test(ua)) {
            return true;
        }
        return false;
    };

    window.clqIsInstalledPwa = isInstalledPwa;

    /** Plus d’alerte : le vrai Partager est dans la barre TogaThrust. */
    window.clqInAppChromeHelp = function () {
        return false;
    };

    window.clqIsInAppEmbeddedBrowser = function () {
        return window.clqNeedsSafariForGeo();
    };

    function shareHintButtonHtml() {
        return (
            '<button type="button" id="clq-inapp-share-hint-btn" disabled aria-disabled="true" tabindex="-1" ' +
            'style="display:block;width:100%;margin:0 0 8px;padding:13px 10px;background:#1565c0;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:0.95rem;line-height:1.35;opacity:0.9;cursor:default;pointer-events:none;-webkit-touch-callout:none;" ' +
            'title="Utilisez l’icône Partager en bas de l’application TogaThrust">' +
            SHARE_ICON +
            " Partager → Ouvrir dans Chrome, Safari…" +
            "</button>"
        );
    }

    function overlayInnerHtml() {
        return (
            '<div style="background:#fff;border-radius:14px;padding:22px 18px;max-width:min(400px,92vw);color:#1a1a2e;font-family:system-ui,-apple-system,sans-serif;text-align:center;">' +
            '<h2 id="clq-inapp-safari-title" style="margin:0 0 12px;font-size:1.15rem;color:#b30000;">GPS : navigateur complet requis</h2>' +
            '<p style="margin:0 0 16px;line-height:1.45;font-size:0.95rem;">TogaThrust ne permet pas le GPS. Ouvrez cette page dans <strong>Chrome</strong>, <strong>Safari</strong> ou votre navigateur complet (menu Partager de l’application).</p>' +
            '<button type="button" style="display:block;width:100%;margin:0 0 8px;padding:14px;background:#b30000;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:1rem;" onclick="return window.clqCopyAppLink();">Copier le lien et fermer</button>' +
            shareHintButtonHtml() +
            '<button type="button" style="display:block;width:100%;padding:14px;background:#333;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:1rem;" onclick="return window.clqDismissInAppOverlay();">Fermer</button>' +
            "</div>"
        );
    }

    function ensureShareHintButton() {
        if (document.getElementById("clq-inapp-share-hint-btn")) return;
        var overlay = document.getElementById("clq-inapp-safari-overlay");
        if (!overlay) return;
        var box = overlay.querySelector("div[style*='border-radius:14px']") || overlay.firstElementChild;
        if (!box) return;
        var copyBtn = box.querySelector('button[onclick*="clqCopyAppLink"]');
        var tmp = document.createElement("div");
        tmp.innerHTML = shareHintButtonHtml();
        var shareBtn = tmp.firstChild;
        if (copyBtn && copyBtn.parentNode) {
            copyBtn.parentNode.insertBefore(shareBtn, copyBtn.nextSibling);
        } else {
            var fermer = box.querySelector('button[onclick*="clqDismissInAppOverlay"]');
            if (fermer) {
                box.insertBefore(shareBtn, fermer);
            }
        }
    }

    function ensureOverlayDom() {
        if (document.getElementById("clq-inapp-safari-overlay")) {
            ensureShareHintButton();
            return;
        }
        var root = document.createElement("div");
        root.id = "clq-inapp-safari-overlay";
        root.setAttribute("hidden", "hidden");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-labelledby", "clq-inapp-safari-title");
        root.style.cssText =
            "position:fixed;inset:0;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;z-index:21000;padding:16px;box-sizing:border-box;";
        root.innerHTML = overlayInnerHtml();
        document.body.appendChild(root);
    }

    function boot() {
        ensureOverlayDom();
        if (window.clqNeedsSafariForGeo()) {
            window.clqShowInAppSafariOverlay();
        } else if (isDismissed()) {
            window.clqDismissInAppOverlay();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
