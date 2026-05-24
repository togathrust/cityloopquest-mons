/**
 * Géoloc main.html — iOS : watchPosition dans le geste utilisateur (pas getCurrentPosition).
 */
(function () {
    var OVERLAY_ID = "main-geo-activation-overlay";
    var BTN_ID = "main-geo-activation-btn";
    var GEO_OPTS = {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0,
    };
    var geoRequestInFlight = false;
    var geoRequestStartedAt = 0;
    var gestureLockUntil = 0;

    function isMobileDevice() {
        return /iPhone|iPod|iPad|Android.*Mobile/i.test(navigator.userAgent || "");
    }

    function isIosDevice() {
        return /iPhone|iPod|iPad/i.test(navigator.userAgent || "");
    }

    function overlayEl() {
        return document.getElementById(OVERLAY_ID);
    }

    function showPrompt() {
        var el = overlayEl();
        if (!el) return;
        el.removeAttribute("hidden");
        el.style.display = "flex";
    }

    function hidePrompt() {
        var el = overlayEl();
        if (!el) return;
        el.setAttribute("hidden", "hidden");
        el.style.display = "none";
    }

    function translateLabels() {
        var tm = window.translationManager;
        if (!tm || typeof tm.translate !== "function" || !tm.isLoaded) return;
        var title = document.getElementById("main-geo-activation-title");
        var msg = document.getElementById("main-geo-activation-message");
        var btn = document.getElementById(BTN_ID);
        var t = function (key, fb) {
            var v = tm.translate(key);
            return v && v !== key ? v : fb;
        };
        if (title) {
            title.textContent = t(
                "main_geo_activate_title",
                "Activer la géolocalisation"
            );
        }
        if (msg) {
            msg.textContent = t(
                "main_geo_activate_message",
                "Appuyez sur le bouton. Sur iPhone, autorisez la bannière Safari « Autoriser » si elle apparaît."
            );
        }
        if (btn) {
            btn.textContent = t(
                "main_geo_activate_button",
                "Autoriser la localisation"
            );
        }
    }

    function setOverlayError(err) {
        var msg = document.getElementById("main-geo-activation-message");
        var btn = document.getElementById(BTN_ID);
        if (!msg) return;
        var code = err && typeof err.code === "number" ? err.code : -1;
        var text;
        if (code === 1) {
            text =
                "Accès refusé. Réglages → Confidentialité → Localisation → Safari → « Lors de l’utilisation de l’app », puis réessayez.";
        } else if (code === 2) {
            text = "Position indisponible. Activez le GPS du téléphone et réessayez.";
        } else if (code === 3) {
            text = "Délai dépassé. Sortez à l’extérieur si possible et réessayez.";
        } else {
            text =
                "Impossible d’obtenir la position. Vérifiez la localisation pour Safari, puis réessayez.";
        }
        msg.textContent = text;
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Réessayer";
        }
        showPrompt();
    }

    function clearMainGeoOnLeave() {
        geoRequestInFlight = false;
        try {
            sessionStorage.removeItem("clq_pending_geo_position");
        } catch (e) {
            /* ignore */
        }
        if (typeof window.clqResetGeoWrapperState === "function") {
            window.clqResetGeoWrapperState();
        }
    }

    function deliverPositionDesktop(position) {
        try {
            localStorage.setItem("appLaunchedBefore", "true");
        } catch (e) {
            /* ignore */
        }
        hidePrompt();
        if (typeof window.clqResetGeoWrapperState === "function") {
            window.clqResetGeoWrapperState();
        }
        if (typeof window.clqOnMainGeoActivated === "function") {
            window.clqOnMainGeoActivated(position);
        }
        try {
            window.dispatchEvent(
                new CustomEvent("clq:main-geo-activated", { detail: position })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function onGeoError(err) {
        geoRequestInFlight = false;
        window.__clqGeoUserInitiated = false;
        try {
            localStorage.removeItem("geoPermissionGranted");
            sessionStorage.removeItem("clq_geo_session_ok");
        } catch (e) {
            /* ignore */
        }
        setOverlayError(err);
        try {
            window.dispatchEvent(
                new CustomEvent("clq:main-geo-failed", { detail: err || null })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function getNativeGetCurrentPosition() {
        var native = window.__clqGeoNative;
        if (native && typeof native.getCurrentPosition === "function") {
            return native.getCurrentPosition.bind(native);
        }
        if (
            navigator.geolocation &&
            typeof navigator.geolocation.getCurrentPosition === "function"
        ) {
            return navigator.geolocation.getCurrentPosition.bind(
                navigator.geolocation
            );
        }
        return null;
    }

    function setWaitingUi() {
        var btn = document.getElementById(BTN_ID);
        if (btn) {
            btn.disabled = true;
            btn.textContent = "…";
        }
        var msg = document.getElementById("main-geo-activation-message");
        if (msg) {
            msg.textContent = isIosDevice()
                ? "Recherche du GPS… Si une bannière Safari apparaît, touchez « Autoriser ». Ne quittez pas cet écran."
                : "Demande en cours : choisissez « Autoriser » sur le téléphone.";
        }
    }

    function invokeGeolocationRequest() {
        if (
            typeof window.clqNeedsSafariForGeo === "function" &&
            window.clqNeedsSafariForGeo() &&
            typeof window.clqShowInAppSafariOverlay === "function"
        ) {
            window.clqShowInAppSafariOverlay();
            return;
        }

        var now = Date.now();
        if (now < gestureLockUntil) return;
        gestureLockUntil = now + 800;

        if (geoRequestInFlight && now - geoRequestStartedAt < 28000) {
            return;
        }

        geoRequestInFlight = true;
        geoRequestStartedAt = now;
        window.__clqGeoUserInitiated = true;
        setWaitingUi();

        try {
            sessionStorage.removeItem("clq_geo_session_ok");
            localStorage.removeItem("geoPermissionGranted");
        } catch (e) {
            /* ignore */
        }

        if (isMobileDevice()) {
            var startWatch = function () {
                if (typeof window.clqStartGeolocationWatchFromGesture === "function") {
                    window.clqStartGeolocationWatchFromGesture();
                } else {
                    onGeoError({ code: 2 });
                }
            };
            if (typeof window.clqEnsureCompassPermission === "function") {
                window.clqEnsureCompassPermission(startWatch);
            } else {
                startWatch();
            }
            return;
        }

        var getPos = getNativeGetCurrentPosition();
        if (!getPos) {
            onGeoError({ code: 2 });
            return;
        }

        try {
            getPos(
                function (position) {
                    geoRequestInFlight = false;
                    window.__clqGeoUserInitiated = false;
                    deliverPositionDesktop(position);
                },
                function (err) {
                    onGeoError(err || { code: -1 });
                },
                GEO_OPTS
            );
        } catch (e) {
            console.error("[CLQ-GEO] getCurrentPosition:", e);
            onGeoError({ code: 2 });
        }
    }

    function activateFromUserGesture(e) {
        if (e) {
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
        }
        invokeGeolocationRequest();
        return false;
    }

    function bindButton() {
        var btn = document.getElementById(BTN_ID);
        if (!btn) return;
        btn.dataset.clqGeoBound = "1";
        btn.onclick = activateFromUserGesture;
    }

    function showMainGeoButton() {
        geoRequestInFlight = false;
        var btn = document.getElementById(BTN_ID);
        if (btn) btn.disabled = false;
        bindButton();
        translateLabels();
        showPrompt();
    }

    window.clqClearMainGeoOnLeave = clearMainGeoOnLeave;
    window.clqShowMainGeoPrompt = showMainGeoButton;
    window.clqHideMainGeoPrompt = hidePrompt;
    window.clqActivateMainGeolocation = activateFromUserGesture;
    window.clqRequestGeolocationOnMainEnter = showMainGeoButton;

    window.addEventListener("pagehide", clearMainGeoOnLeave);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindButton);
    } else {
        bindButton();
    }

    var tmWait = 0;
    var tmTimer = setInterval(function () {
        if (
            window.translationManager &&
            window.translationManager.isLoaded
        ) {
            translateLabels();
            clearInterval(tmTimer);
        } else if (++tmWait > 40) {
            clearInterval(tmTimer);
        }
    }, 150);
})();
