/**
 * Ouvre une URL hors WebView (Chrome / Safari) quand c’est possible.
 */
(function () {
    function isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    }

    function isAndroid() {
        return /Android/i.test(navigator.userAgent || "");
    }

    function isRealMobileBrowser() {
        var ua = navigator.userAgent || "";
        if (isAndroid()) {
            return /Chrome\//i.test(ua) && !/; wv\)|\bwv\b/i.test(ua);
        }
        if (isIOS()) {
            return (
                (/Safari/i.test(ua) &&
                    !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) ||
                /CriOS/i.test(ua)
            );
        }
        return true;
    }

    function stripHash(url) {
        return String(url || "").split("#")[0];
    }

    function clickHiddenLink(href, target) {
        var a = document.createElement("a");
        a.href = href;
        if (target) a.target = target;
        a.rel = "noopener noreferrer";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
        }, 0);
    }

    function tryOpenChromeSchemes(url) {
        var u = stripHash(url);
        var hostPath = u.replace(/^https?:\/\//i, "");
        var schemes = [
            "googlechromes://" + hostPath,
            "googlechrome://" + hostPath,
        ];
        schemes.forEach(function (scheme, index) {
            setTimeout(function () {
                clickHiddenLink(scheme);
            }, index * 350);
        });
    }

    function openInChrome(url) {
        var u = stripHash(url);
        if (isAndroid()) {
            var hostPath = u.replace(/^https?:\/\//i, "");
            window.location.href =
                "intent://" +
                hostPath +
                "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
                encodeURIComponent(u) +
                ";end";
            return;
        }
        if (isIOS()) {
            clickHiddenLink(u, "_blank");
            tryOpenChromeSchemes(u);
            return;
        }
        clickHiddenLink(u, "_blank");
    }

    /**
     * Ne pas faire location.href = url dans une WebView (reste piégé, écran noir).
     * Ouvre un nouvel onglet / invite l’utilisateur au menu Partager.
     */
    function openInSafariOrDefault(url) {
        var u = stripHash(url);
        clickHiddenLink(u, "_blank");
    }

    window.clqIsRealMobileBrowser = isRealMobileBrowser;
    window.clqOpenInChrome = openInChrome;
    window.clqOpenInSafariOrDefault = openInSafariOrDefault;
    window.clqClickHiddenLink = clickHiddenLink;
})();
