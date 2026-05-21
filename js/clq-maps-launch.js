/**
 * Ouvre Google Maps sans onglet supplémentaire (évite about:blank sur mobile).
 * Mobile : même onglet → bouton Retour du navigateur = retour CLQ.
 * Bureau : page pont maps-bridge.html (même onglet) avec bouton « Retour à CLQ ».
 */
(function (global) {
    "use strict";

    var STORAGE_RETURN_URL = "clq_maps_return_url";
    var STORAGE_RETURN_LABEL = "clq_maps_return_label";
    var STORAGE_WENT_OUT = "clq_maps_went_out";

    function buildGoogleMapsDirUrl(opts) {
        var url =
            "https://www.google.com/maps/dir/?api=1&destination=" +
            opts.destLat +
            "," +
            opts.destLng;
        if (opts.travelmode) {
            url += "&travelmode=" + encodeURIComponent(opts.travelmode);
        }
        if (
            opts.originLat != null &&
            opts.originLng != null &&
            !isNaN(Number(opts.originLat)) &&
            !isNaN(Number(opts.originLng))
        ) {
            url += "&origin=" + opts.originLat + "," + opts.originLng;
        }
        return url;
    }

    function buildGoogleMapsSearchUrl(destLat, destLng) {
        return (
            "https://www.google.com/maps/search/?api=1&query=" +
            destLat +
            "," +
            destLng
        );
    }

    function googleUrlFromOptions(options) {
        if (options.mode === "search") {
            return buildGoogleMapsSearchUrl(options.destLat, options.destLng);
        }
        return buildGoogleMapsDirUrl(options);
    }

    /** Mobile / tablette : un seul onglet suffit pour revenir avec « Retour ». */
    function preferSameTabToMaps() {
        var ua = navigator.userAgent || "";
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            return true;
        }
        if (navigator.maxTouchPoints > 0 && global.matchMedia("(max-width: 1024px)").matches) {
            return true;
        }
        return false;
    }

    function saveReturnContext() {
        try {
            global.sessionStorage.setItem(STORAGE_RETURN_URL, global.location.href);
            global.sessionStorage.setItem(
                STORAGE_RETURN_LABEL,
                document.title || "CLQ"
            );
            global.sessionStorage.setItem(STORAGE_WENT_OUT, "1");
        } catch (e) {
            /* quota / mode privé */
        }
    }

    function navigate(url) {
        global.location.assign(url);
    }

    function openMapsBridge(options) {
        saveReturnContext();

        if (preferSameTabToMaps()) {
            navigate(googleUrlFromOptions(options));
            return;
        }

        var q = new URLSearchParams();
        q.set("destLat", String(options.destLat));
        q.set("destLng", String(options.destLng));
        if (options.originLat != null && options.originLng != null) {
            q.set("originLat", String(options.originLat));
            q.set("originLng", String(options.originLng));
        }
        if (options.travelmode) {
            q.set("travelmode", String(options.travelmode));
        }
        if (options.mode === "search") {
            q.set("mode", "search");
        }

        navigate("maps-bridge.html?" + q.toString());
    }

    function openMapsBridgeFromGoogleUrl(googleUrl) {
        try {
            var u = new URL(googleUrl, global.location.href);
            var params = u.searchParams;
            var dest = params.get("destination") || params.get("query");
            if (!dest) {
                saveReturnContext();
                navigate(googleUrl);
                return;
            }
            var parts = String(dest).split(",");
            var destLat = parseFloat(parts[0]);
            var destLng = parseFloat(parts[1]);
            if (isNaN(destLat) || isNaN(destLng)) {
                saveReturnContext();
                navigate(googleUrl);
                return;
            }
            var opts = { destLat: destLat, destLng: destLng };
            var origin = params.get("origin");
            if (origin) {
                var op = String(origin).split(",");
                opts.originLat = parseFloat(op[0]);
                opts.originLng = parseFloat(op[1]);
            }
            var tm = params.get("travelmode");
            if (tm) {
                opts.travelmode = tm;
            }
            if (u.pathname.indexOf("/search/") !== -1) {
                opts.mode = "search";
            }
            openMapsBridge(opts);
        } catch (err) {
            saveReturnContext();
            navigate(googleUrl);
        }
    }

    global.clqMapsReturnStorageKeys = {
        url: STORAGE_RETURN_URL,
        label: STORAGE_RETURN_LABEL,
        wentOut: STORAGE_WENT_OUT,
    };
    global.clqBuildGoogleMapsDirUrl = buildGoogleMapsDirUrl;
    global.clqBuildGoogleMapsSearchUrl = buildGoogleMapsSearchUrl;
    global.clqOpenGoogleMapsBridge = openMapsBridge;
    global.clqOpenGoogleMapsFromUrl = openMapsBridgeFromGoogleUrl;
})();
