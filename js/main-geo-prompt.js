/**
 * Géoloc main.html — Android : clic → getCurrentPosition natif (geste utilisateur).
 */
(function () {
    var OVERLAY_ID = "main-geo-activation-overlay";
    var BTN_ID = "main-geo-activation-btn";
    var GEO_OPTS = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
    };
    var ANDROID_GEO_OPTS = {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
    };
    var geoRequestInFlight = false;
    var androidGeoWatchdogTimer = null;

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
                "Autorisation de localisation"
            );
        }
        if (msg) {
            msg.textContent = t(
                "main_geo_activate_message",
                "Appuyez sur le bouton pour afficher la demande de localisation du navigateur, puis choisissez « Autoriser »."
            );
        }
        if (btn) {
            btn.textContent = t(
                "main_geo_activate_button",
                "Autoriser la localisation"
            );
        }
    }

    function isAndroidDevice() {
        return /android/i.test(navigator.userAgent || "");
    }

    function setPromptMessage(message, buttonText) {
        var msg = document.getElementById("main-geo-activation-message");
        var btn = document.getElementById(BTN_ID);
        if (msg) msg.textContent = message;
        if (btn && buttonText) btn.textContent = buttonText;
    }

    function showAndroidPermissionBlocked() {
        showPrompt();
        setPromptMessage(
            "La localisation est bloquée ou indisponible. Ouvrez Paramètres → Applications → Chrome (ou cette app) → Autorisations → Position, mettez « Autoriser », puis revenez et appuyez sur le bouton.",
            "Réessayer la localisation"
        );
    }

    function showAndroidLocationPending() {
        setPromptMessage(
            "Demande en cours… Si la fenêtre Android « Autoriser la position » apparaît, acceptez-la.",
            "Demande en cours..."
        );
    }

    function getNativeGetCurrentPosition() {
        if (typeof window.clqNativeGetCurrentPosition === "function") {
            return window.clqNativeGetCurrentPosition;
        }
        if (navigator.geolocation) {
            return navigator.geolocation.getCurrentPosition.bind(
                navigator.geolocation
            );
        }
        return null;
    }

    function clearAndroidGeoWatchdog() {
        if (androidGeoWatchdogTimer) {
            clearTimeout(androidGeoWatchdogTimer);
            androidGeoWatchdogTimer = null;
        }
    }

    function startAndroidGeoWatchdog() {
        clearAndroidGeoWatchdog();
        androidGeoWatchdogTimer = setTimeout(function () {
            if (!geoRequestInFlight) return;
            geoRequestInFlight = false;
            showAndroidPermissionBlocked();
            if (typeof window.clqOnMainGeoFailed === "function") {
                try {
                    window.clqOnMainGeoFailed();
                } catch (e) {
                    /* ignore */
                }
            }
            try {
                window.dispatchEvent(new CustomEvent("clq:main-geo-failed"));
            } catch (e) {
                /* ignore */
            }
        }, 9000);
    }

    function clearMainGeoOnLeave() {
        geoRequestInFlight = false;
        clearAndroidGeoWatchdog();
        try {
            localStorage.removeItem("geoPermissionGranted");
            sessionStorage.removeItem("clq_pending_geo_position");
            sessionStorage.setItem("clq_main_geo_reset", "1");
        } catch (e) {
            /* ignore */
        }
        if (typeof window.clqResetGeoWrapperState === "function") {
            window.clqResetGeoWrapperState();
        }
    }

    function persistPosition(position) {
        try {
            sessionStorage.setItem(
                "clq_pending_geo_position",
                JSON.stringify({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    ts: Date.now(),
                })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function deliverPosition(position) {
        clearAndroidGeoWatchdog();
        persistPosition(position);
        hidePrompt();
        try {
            localStorage.setItem("geoPermissionGranted", "true");
            localStorage.setItem("appLaunchedBefore", "true");
            sessionStorage.removeItem("clq_main_geo_reset");
        } catch (e) {
            /* ignore */
        }
        if (typeof window.clqOnMainGeoActivated === "function") {
            try {
                window.clqOnMainGeoActivated(position);
            } catch (e) {
                /* ignore */
            }
        }
        try {
            window.dispatchEvent(
                new CustomEvent("clq:main-geo-activated", { detail: position })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function onGeoError(error) {
        geoRequestInFlight = false;
        clearAndroidGeoWatchdog();
        try {
            localStorage.removeItem("geoPermissionGranted");
        } catch (e) {
            /* ignore */
        }
        if (isAndroidDevice()) {
            showAndroidPermissionBlocked();
        } else {
            showPrompt();
            translateLabels();
        }
        if (typeof window.clqOnMainGeoFailed === "function") {
            try {
                window.clqOnMainGeoFailed();
            } catch (e) {
                /* ignore */
            }
        }
        try {
            window.dispatchEvent(new CustomEvent("clq:main-geo-failed"));
        } catch (e) {
            /* ignore */
        }
    }

    function invokeNativeGetCurrentPosition() {
        var getPos = getNativeGetCurrentPosition();
        if (!getPos) {
            onGeoError();
            return;
        }
        if (isAndroidDevice()) {
            showAndroidLocationPending();
            startAndroidGeoWatchdog();
        }
        if (typeof window.clqResetGeoWrapperState === "function") {
            window.clqResetGeoWrapperState();
        }
        getPos(
            function (position) {
                geoRequestInFlight = false;
                deliverPosition(position);
            },
            function (error) {
                geoRequestInFlight = false;
                onGeoError(error);
            },
            isAndroidDevice() ? ANDROID_GEO_OPTS : GEO_OPTS
        );
    }

    function callGetCurrentPosition() {
        if (geoRequestInFlight) return;
        if (!navigator.geolocation) {
            onGeoError();
            return;
        }
        geoRequestInFlight = true;
        // Android : appel synchrone dans le clic (pas de await/query avant getCurrentPosition)
        invokeNativeGetCurrentPosition();
    }

    function tryAndroidAutoActivateIfGranted() {
        if (!isAndroidDevice()) return;
        if (!navigator.permissions || !navigator.permissions.query) return;
        navigator.permissions
            .query({ name: "geolocation" })
            .then(function (status) {
                if (status && status.state === "granted") {
                    callGetCurrentPosition();
                }
            })
            .catch(function () {});
    }

    function bindButton() {
        var btn = document.getElementById(BTN_ID);
        if (!btn) return;
        if (btn.dataset.clqGeoBound !== "1") {
            btn.dataset.clqGeoBound = "1";
            btn.addEventListener("click", function () {
                callGetCurrentPosition();
            });
        }
    }

    function showMainGeoButton() {
        bindButton();
        translateLabels();
        showPrompt();
        tryAndroidAutoActivateIfGranted();
    }

    window.clqClearMainGeoOnLeave = clearMainGeoOnLeave;
    window.clqShowMainGeoPrompt = showMainGeoButton;
    window.clqHideMainGeoPrompt = hidePrompt;
    window.clqActivateMainGeolocation = callGetCurrentPosition;
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
