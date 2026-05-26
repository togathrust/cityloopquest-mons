(function () {
    "use strict";

    var params = new URLSearchParams(location.search);
    var destLat = parseFloat(params.get("destLat"));
    var destLng = parseFloat(params.get("destLng"));
    var originLat = parseFloat(params.get("originLat"));
    var originLng = parseFloat(params.get("originLng"));
    var travelmode = params.get("travelmode") || "";
    var mode = params.get("mode") || "dir";

    var backBtn = document.getElementById("maps-bridge-back");
    var openBtn = document.getElementById("maps-bridge-open");
    var titleEl = document.getElementById("maps-bridge-title");
    var hintEl = document.getElementById("maps-bridge-hint");

    function t(key, fallback) {
        var tm = window.translationManager;
        if (tm && tm.isLoaded && typeof tm.translate === "function") {
            return tm.translate(key);
        }
        return fallback;
    }

    function applyTranslations() {
        if (backBtn) {
            backBtn.textContent = t("maps_bridge_back", "← Retour à CLQ Mons");
        }
        if (openBtn) {
            openBtn.textContent = t(
                "maps_bridge_open",
                "Continuer vers Google Maps"
            );
        }
        if (titleEl) {
            titleEl.textContent = t(
                "maps_bridge_title",
                "Navigation Google Maps"
            );
        }
        if (hintEl) {
            hintEl.textContent = t(
                "maps_bridge_hint",
                "Pour revenir à l’application : touche Retour du navigateur après la navigation, puis le bouton rouge en haut."
            );
        }
        document.title = t("maps_bridge_title", "CLQ — Google Maps");
    }

    function buildGoogleUrl() {
        if (isNaN(destLat) || isNaN(destLng)) {
            return "https://www.google.com/maps";
        }
        if (mode === "search" && window.clqBuildGoogleMapsSearchUrl) {
            return window.clqBuildGoogleMapsSearchUrl(destLat, destLng);
        }
        if (window.clqBuildGoogleMapsDirUrl) {
            return window.clqBuildGoogleMapsDirUrl({
                destLat: destLat,
                destLng: destLng,
                originLat: isNaN(originLat) ? null : originLat,
                originLng: isNaN(originLng) ? null : originLng,
                travelmode: travelmode || undefined,
            });
        }
        var url =
            "https://www.google.com/maps/dir/?api=1&destination=" +
            destLat +
            "," +
            destLng;
        if (travelmode) {
            url += "&travelmode=" + encodeURIComponent(travelmode);
        }
        if (!isNaN(originLat) && !isNaN(originLng)) {
            url += "&origin=" + originLat + "," + originLng;
        }
        return url;
    }

    function returnToClq() {
        var keys = window.clqMapsReturnStorageKeys || {
            url: "clq_maps_return_url",
            label: "clq_maps_return_label",
        };
        var fallback = "main.html";
        var returnUrl = fallback;
        try {
            returnUrl = sessionStorage.getItem(keys.url) || fallback;
        } catch (e) {
            /* ignore */
        }

        if (window.opener && !window.opener.closed) {
            try {
                window.opener.focus();
            } catch (e) {
                /* cross-origin focus blocked */
            }
            window.close();
            setTimeout(function () {
                if (!window.closed) {
                    location.href = returnUrl;
                }
            }, 400);
            return;
        }
        location.href = returnUrl;
    }

    function openGoogleMaps() {
        location.href = buildGoogleUrl();
    }

    if (backBtn) {
        backBtn.addEventListener("click", returnToClq);
    }
    if (openBtn) {
        openBtn.addEventListener("click", openGoogleMaps);
    }

    function init() {
        applyTranslations();
        if (isNaN(destLat) || isNaN(destLng)) {
            if (openBtn) {
                openBtn.disabled = true;
            }
        }
    }

    if (window.translationManager) {
        document.addEventListener("translationsLoaded", init);
        if (window.translationManager.isLoaded) {
            init();
        } else {
            init();
        }
    } else {
        init();
    }

    window.addEventListener("pageshow", function (ev) {
        if (ev.persisted) {
            applyTranslations();
        }
    });
})();
