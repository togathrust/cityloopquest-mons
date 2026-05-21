/**
 * Affiche le popup TogaThrust au chargement si WebView détectée.
 */
(function () {
    function tryShow() {
        if (
            typeof window.clqNeedsSafariForGeo === "function" &&
            window.clqNeedsSafariForGeo() &&
            typeof window.clqShowInAppSafariOverlay === "function"
        ) {
            window.clqShowInAppSafariOverlay();
        }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tryShow);
    } else {
        tryShow();
    }
})();
