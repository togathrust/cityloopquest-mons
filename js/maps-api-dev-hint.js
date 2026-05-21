(function () {
  function showMapsKeyHint() {
    var mapDiv = document.getElementById('map');
    if (!mapDiv) return;
    var o = location.origin;
    mapDiv.innerHTML =
      '<div style="padding:18px;text-align:left;font-family:system-ui,sans-serif;font-size:14px;line-height:1.45;color:#333;max-width:420px;margin:0 auto">' +
      '<p style="margin:0 0 10px;font-weight:700;color:#b30000">Google Maps bloqué pour cette adresse</p>' +
      '<p style="margin:0 0 8px">Dans <strong>Google Cloud Console</strong> → Clés API → votre clé → <em>Restrictions des applications</em> (référents HTTP), ajoutez&nbsp;:</p>' +
      '<p style="margin:6px 0"><code style="background:#f3f4f6;padding:4px 6px;border-radius:4px;word-break:break-all">http://192.168.100.57:5173/*</code></p>' +
      '<p style="margin:6px 0"><code style="background:#f3f4f6;padding:4px 6px;border-radius:4px;word-break:break-all">https://192.168.100.57:5173/*</code></p>' +
      '<p style="margin:6px 0"><code style="background:#f3f4f6;padding:4px 6px;border-radius:4px;word-break:break-all">https://localhost:5173/*</code></p>' +
      '<p style="margin:10px 0 0;font-size:13px;color:#666">Origine actuelle&nbsp;: <code>' + o + '/*</code><br>Attendre 2–5 min après modification, puis recharger.</p>' +
      '</div>';
  }

  window.gm_authFailure = showMapsKeyHint;
})();
