/**
 * Formulaire "Proposer un POI" (soumission staff + traduction serveur).
 */
(function () {
  "use strict";

  const FALLBACK = "fr";
  const SUPPORTED = ["fr", "en", "nl", "de", "it", "es", "pl", "ar", "zh", "ja"];
  const CITY_CONFIG = window.CLQ_POI_CITY_CONFIG || {};
  const DEFAULT_CENTER = CITY_CONFIG.center || { lat: 50.4543, lng: 3.9526 };
  const CITY_KEY = CITY_CONFIG.cityKey || "mons";

  const texts = {
    proposeBtn: {
      fr: "Proposer un POI", en: "Suggest a POI", nl: "POI voorstellen", de: "POI vorschlagen",
      it: "Proponi un POI", es: "Proponer un POI", pl: "Zaproponuj POI", ar: "اقتراح نقطة اهتمام",
      zh: "推荐兴趣点", ja: "スポットを提案",
    },
    modalTitle: {
      fr: "Proposer un point d'intérêt", en: "Suggest a point of interest", nl: "Een bezienswaardigheid voorstellen",
      de: "Einen interessanten Ort vorschlagen", it: "Proponi un punto di interesse", es: "Proponer un punto de interés",
      pl: "Zaproponuj punkt zainteresowania", ar: "اقتراح نقطة اهتمام", zh: "推荐一个兴趣点", ja: "見どころを提案",
    },
    nameLabel: { fr: "Nom du lieu", en: "Place name", nl: "Naam van de plaats", de: "Name des Ortes", it: "Nome del luogo", es: "Nombre del lugar", pl: "Nazwa miejsca", ar: "اسم المكان", zh: "地点名称", ja: "場所名" },
    latLabel: { fr: "Latitude", en: "Latitude", nl: "Breedtegraad", de: "Breitengrad", it: "Latitudine", es: "Latitud", pl: "Szerokość geograficzna", ar: "خط العرض", zh: "纬度", ja: "緯度" },
    lngLabel: { fr: "Longitude", en: "Longitude", nl: "Lengtegraad", de: "Längengrad", it: "Longitudine", es: "Longitud", pl: "Długość geograficzna", ar: "خط الطول", zh: "经度", ja: "経度" },
    descLabel: { fr: "Description courte", en: "Short description", nl: "Korte beschrijving", de: "Kurze Beschreibung", it: "Breve descrizione", es: "Descripción breve", pl: "Krótki opis", ar: "وصف قصير", zh: "简短描述", ja: "短い説明" },
    emailLabel: { fr: "Votre e-mail (optionnel)", en: "Your email (optional)", nl: "Uw e-mail (optioneel)", de: "Ihre E-Mail (optional)", it: "La tua e-mail (facoltativa)", es: "Tu e-mail (opcional)", pl: "Twój e-mail (opcjonalnie)", ar: "بريدك الإلكتروني (اختياري)", zh: "你的邮箱（可选）", ja: "メールアドレス（任意）" },
    photoLabel: { fr: "Photo (JPG)", en: "Photo (JPG)", nl: "Foto (JPG)", de: "Foto (JPG)", it: "Foto (JPG)", es: "Foto (JPG)", pl: "Zdjęcie (JPG)", ar: "صورة (JPG)", zh: "照片 (JPG)", ja: "写真 (JPG)" },
    pickMap: { fr: "Choisir sur la carte", en: "Pick on map", nl: "Kies op de kaart", de: "Auf Karte wählen", it: "Scegli sulla mappa", es: "Elegir en el mapa", pl: "Wybierz na mapie", ar: "اختر على الخريطة", zh: "在地图上选择", ja: "地図で選択" },
    myPos: { fr: "Ma position", en: "My location", nl: "Mijn locatie", de: "Mein Standort", it: "La mia posizione", es: "Mi ubicación", pl: "Moja lokalizacja", ar: "موقعي", zh: "我的位置", ja: "現在地" },
    submit: { fr: "Envoyer pour validation", en: "Submit for review", nl: "Verzenden ter controle", de: "Zur Prüfung senden", it: "Invia per revisione", es: "Enviar para revisión", pl: "Wyślij do sprawdzenia", ar: "إرسال للمراجعة", zh: "提交审核", ja: "確認のため送信" },
    cancel: { fr: "Annuler", en: "Cancel", nl: "Annuleren", de: "Abbrechen", it: "Annulla", es: "Cancelar", pl: "Anuluj", ar: "إلغاء", zh: "取消", ja: "キャンセル" },
    hintReview: {
      fr: "Votre proposition sera traduite en 10 langues et publiée après validation.",
      en: "Your suggestion will be translated into 10 languages and published after approval.",
      nl: "Uw voorstel wordt in 10 talen vertaald en na goedkeuring gepubliceerd.",
      de: "Ihr Vorschlag wird in 10 Sprachen übersetzt und nach Prüfung veröffentlicht.",
      it: "La proposta sarà tradotta in 10 lingue e pubblicata dopo la verifica.",
      es: "Tu propuesta se traducirá a 10 idiomas y se publicará tras su validación.",
      pl: "Twoja propozycja zostanie przetłumaczona na 10 języków i opublikowana po zatwierdzeniu.",
      ar: "سيُترجم اقتراحك إلى 10 لغات وينشر بعد المراجعة.",
      zh: "你的建议会被翻译成 10 种语言，并在审核后发布。",
      ja: "提案は10言語に翻訳され、確認後に公開されます。",
    },
    sending: { fr: "Envoi...", en: "Sending...", nl: "Verzenden...", de: "Wird gesendet...", it: "Invio...", es: "Enviando...", pl: "Wysyłanie...", ar: "جارٍ الإرسال...", zh: "正在发送...", ja: "送信中..." },
    success: {
      fr: "Merci ! Votre proposition a été envoyée. Elle apparaîtra sur la carte après validation.",
      en: "Thank you! Your suggestion was sent. It will appear on the map after approval.",
      nl: "Dank u! Uw voorstel is verzonden. Het verschijnt na goedkeuring op de kaart.",
      de: "Danke! Ihr Vorschlag wurde gesendet. Er erscheint nach Prüfung auf der Karte.",
      it: "Grazie! La proposta è stata inviata. Apparirà sulla mappa dopo la verifica.",
      es: "¡Gracias! Tu propuesta se ha enviado. Aparecerá en el mapa tras su validación.",
      pl: "Dziękujemy! Propozycja została wysłana. Pojawi się na mapie po zatwierdzeniu.",
      ar: "شكرًا! تم إرسال اقتراحك وسيظهر على الخريطة بعد الموافقة.",
      zh: "谢谢！你的建议已发送，审核后会显示在地图上。",
      ja: "ありがとうございます！提案を送信しました。承認後に地図に表示されます。",
    },
    errGeneric: { fr: "Envoi impossible. Réessayez plus tard.", en: "Could not send. Try again later.", nl: "Verzenden lukt niet. Probeer later opnieuw.", de: "Senden nicht möglich. Versuchen Sie es später erneut.", it: "Invio impossibile. Riprova più tardi.", es: "No se pudo enviar. Inténtalo más tarde.", pl: "Nie można wysłać. Spróbuj później.", ar: "تعذر الإرسال. حاول لاحقًا.", zh: "无法发送。请稍后再试。", ja: "送信できません。後でもう一度お試しください。" },
    errSmtp: { fr: "Serveur d'envoi non configuré.", en: "Mail server not configured.", nl: "Mailserver niet geconfigureerd.", de: "Mailserver nicht konfiguriert.", it: "Server mail non configurato.", es: "Servidor de correo no configurado.", pl: "Serwer poczty nie jest skonfigurowany.", ar: "خادم البريد غير مهيأ.", zh: "邮件服务器未配置。", ja: "メールサーバーが設定されていません。" },
    errRequired: { fr: "Remplissez tous les champs obligatoires.", en: "Please fill all required fields.", nl: "Vul alle verplichte velden in.", de: "Bitte alle Pflichtfelder ausfüllen.", it: "Compila tutti i campi obbligatori.", es: "Completa todos los campos obligatorios.", pl: "Wypełnij wszystkie wymagane pola.", ar: "املأ جميع الحقول المطلوبة.", zh: "请填写所有必填字段。", ja: "必須項目をすべて入力してください。" },
    errDescShort: { fr: "La description doit contenir au moins 10 caractères.", en: "Description must be at least 10 characters.", nl: "De beschrijving moet minstens 10 tekens bevatten.", de: "Die Beschreibung muss mindestens 10 Zeichen enthalten.", it: "La descrizione deve contenere almeno 10 caratteri.", es: "La descripción debe tener al menos 10 caracteres.", pl: "Opis musi mieć co najmniej 10 znaków.", ar: "يجب أن يتكون الوصف من 10 أحرف على الأقل.", zh: "描述至少需要 10 个字符。", ja: "説明は10文字以上で入力してください。" },
    errCoordsInvalid: { fr: "Latitude ou longitude invalide.", en: "Invalid latitude or longitude.", nl: "Ongeldige breedte- of lengtegraad.", de: "Ungültiger Breiten- oder Längengrad.", it: "Latitudine o longitudine non valida.", es: "Latitud o longitud inválida.", pl: "Nieprawidłowa szerokość lub długość geograficzna.", ar: "خط العرض أو الطول غير صالح.", zh: "纬度或经度无效。", ja: "緯度または経度が無効です。" },
    errCoords: { fr: "Coordonnées hors région.", en: "Coordinates outside the region.", nl: "Coördinaten buiten de regio.", de: "Koordinaten außerhalb der Region.", it: "Coordinate fuori regione.", es: "Coordenadas fuera de la región.", pl: "Współrzędne poza regionem.", ar: "الإحداثيات خارج المنطقة.", zh: "坐标超出区域。", ja: "座標が対象地域外です。" },
    pickMapActive: { fr: "Cliquez sur la carte ci-dessous pour placer le point.", en: "Click the map below to set the location.", nl: "Klik op de kaart hieronder om de locatie te plaatsen.", de: "Klicken Sie auf die Karte unten, um den Punkt zu setzen.", it: "Clicca sulla mappa qui sotto per posizionare il punto.", es: "Haz clic en el mapa inferior para colocar el punto.", pl: "Kliknij mapę poniżej, aby ustawić punkt.", ar: "انقر على الخريطة أدناه لتحديد النقطة.", zh: "点击下方地图放置地点。", ja: "下の地図をクリックして地点を設定してください。" },
    pickMapUnavailable: { fr: "Carte indisponible. Attendez le chargement ou utilisez Ma position.", en: "Map unavailable. Wait for loading or use My location.", nl: "Kaart niet beschikbaar. Wacht tot ze geladen is of gebruik Mijn locatie.", de: "Karte nicht verfügbar. Warten Sie auf das Laden oder nutzen Sie Mein Standort.", it: "Mappa non disponibile. Attendi il caricamento o usa La mia posizione.", es: "Mapa no disponible. Espera a que cargue o usa Mi ubicación.", pl: "Mapa niedostępna. Poczekaj na załadowanie albo użyj Mojej lokalizacji.", ar: "الخريطة غير متاحة. انتظر التحميل أو استخدم موقعي.", zh: "地图不可用。请等待加载或使用我的位置。", ja: "地図を利用できません。読み込みを待つか現在地を使用してください。" },
  };

  let mapPickListener = null;
  let miniMap = null;
  let miniMapMarker = null;

  function lang() {
    let l = (localStorage.getItem("selectedLanguage") || FALLBACK).toLowerCase();
    if (l === "cn") l = "zh";
    if (l === "jp") l = "ja";
    return SUPPORTED.includes(l) ? l : FALLBACK;
  }

  function t(key) {
    const d = texts[key];
    if (!d) return "";
    return d[lang()] || d[FALLBACK] || "";
  }

  function applyLabels() {
    const set = (id, key) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(key);
    };
    set("poi-propose-btn", "proposeBtn");
    set("poi-propose-title", "modalTitle");
    set("poi-propose-name-label", "nameLabel");
    set("poi-propose-lat-label", "latLabel");
    set("poi-propose-lng-label", "lngLabel");
    set("poi-propose-desc-label", "descLabel");
    set("poi-propose-email-label", "emailLabel");
    set("poi-propose-photo-label", "photoLabel");
    set("poi-propose-pick-map", "pickMap");
    set("poi-propose-my-pos", "myPos");
    set("poi-propose-submit", "submit");
    set("poi-propose-cancel", "cancel");
    set("poi-propose-hint", "hintReview");
  }

  function openModal() {
    const modal = document.getElementById("poi-propose-modal");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
    applyLabels();
    const err = document.getElementById("poi-propose-error");
    const ok = document.getElementById("poi-propose-success");
    if (err) err.style.display = "none";
    if (ok) ok.style.display = "none";
    disableMapPick();
  }

  function closeModal() {
    disableMapPick();
    const modal = document.getElementById("poi-propose-modal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function getMapCenter() {
    const main = window.__clqExperimentMap;
    if (main && typeof main.getCenter === "function") {
      const c = main.getCenter();
      if (c) return { lat: c.lat(), lng: c.lng() };
    }
    return { ...DEFAULT_CENTER };
  }

  function waitForGoogleMaps(maxMs) {
    return new Promise((resolve) => {
      if (window.google?.maps?.Map) {
        resolve(true);
        return;
      }
      let elapsed = 0;
      const id = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(id);
          resolve(true);
          return;
        }
        elapsed += 50;
        if (elapsed >= maxMs) {
          clearInterval(id);
          resolve(false);
        }
      }, 50);
    });
  }

  function ensureMiniMap() {
    const el = document.getElementById("poi-propose-mini-map");
    if (!el || !window.google?.maps) return null;
    if (miniMap) return miniMap;
    miniMap = new google.maps.Map(el, {
      center: getMapCenter(),
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    return miniMap;
  }

  function setMiniMapMarker(lat, lng) {
    if (!miniMap || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const pos = { lat, lng };
    if (miniMapMarker) {
      miniMapMarker.setPosition(pos);
    } else {
      miniMapMarker = new google.maps.Marker({ map: miniMap, position: pos, draggable: true });
      miniMapMarker.addListener("dragend", () => {
        const p = miniMapMarker.getPosition();
        if (!p) return;
        document.getElementById("poi-propose-lat").value = p.lat().toFixed(6);
        document.getElementById("poi-propose-lng").value = p.lng().toFixed(6);
      });
    }
    miniMap.panTo(pos);
  }

  function disableMapPick() {
    if (mapPickListener && window.google?.maps?.event) {
      google.maps.event.removeListener(mapPickListener);
      mapPickListener = null;
    }
    const hint = document.getElementById("poi-propose-pick-hint");
    if (hint) hint.style.display = "none";
    const miniEl = document.getElementById("poi-propose-mini-map");
    if (miniEl) miniEl.classList.remove("poi-propose-mini-map--active");
  }

  async function enableMapPick() {
    const hint = document.getElementById("poi-propose-pick-hint");
    const miniEl = document.getElementById("poi-propose-mini-map");
    disableMapPick();

    const ready = await waitForGoogleMaps(8000);
    if (!ready) {
      if (hint) {
        hint.textContent = t("pickMapUnavailable");
        hint.style.display = "block";
      }
      return;
    }

    if (miniEl) {
      miniEl.classList.add("poi-propose-mini-map--active");
      miniEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    const map = ensureMiniMap();
    if (!map) return;

    const latVal = parseCoord(document.getElementById("poi-propose-lat").value);
    const lngVal = parseCoord(document.getElementById("poi-propose-lng").value);
    if (Number.isFinite(latVal) && Number.isFinite(lngVal)) setMiniMapMarker(latVal, lngVal);

    if (hint) {
      hint.textContent = t("pickMapActive");
      hint.style.display = "block";
    }

    mapPickListener = map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      document.getElementById("poi-propose-lat").value = lat.toFixed(6);
      document.getElementById("poi-propose-lng").value = lng.toFixed(6);
      setMiniMapMarker(lat, lng);
    });
  }

  function resizeJpeg(file, maxW, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("image"));
      };
      img.src = url;
    });
  }

  function messageForServerError(code) {
    if (code === "smtp_not_configured" || code === "delivery_failed") return t("errSmtp");
    if (/^coords_outside_/.test(code || "")) return t("errCoords");
    return t("errGeneric");
  }

  function parseCoord(raw) {
    const s = String(raw || "").trim().replace(/\s/g, "").replace(",", ".");
    if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return NaN;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function isImageFile(file) {
    if (!file) return false;
    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    return /\.(jpe?g|png|webp|heic)$/i.test(file.name || "");
  }

  function showError(errEl, message) {
    errEl.textContent = message;
    errEl.style.display = "block";
    errEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  async function submitForm(evt) {
    evt.preventDefault();
    const errEl = document.getElementById("poi-propose-error");
    const okEl = document.getElementById("poi-propose-success");
    const btn = document.getElementById("poi-propose-submit");
    errEl.style.display = "none";
    okEl.style.display = "none";

    const name = document.getElementById("poi-propose-name").value.trim();
    const lat = parseCoord(document.getElementById("poi-propose-lat").value);
    const lng = parseCoord(document.getElementById("poi-propose-lng").value);
    const description = document.getElementById("poi-propose-desc").value.trim();
    const submitterEmail = document.getElementById("poi-propose-email").value.trim();
    const file = document.getElementById("poi-propose-photo")?.files?.[0];

    if (!name) return showError(errEl, t("errRequired"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return showError(errEl, t("errCoordsInvalid"));
    if (description.length < 10) return showError(errEl, t("errDescShort"));
    if (!isImageFile(file)) return showError(errEl, lang() === "fr" ? "Photo requise (JPG de préférence)." : "Photo required (JPG preferred).");

    btn.disabled = true;
    const prevLabel = btn.textContent;
    btn.textContent = t("sending");

    try {
      const photoBase64 = await resizeJpeg(file, 1200, 0.85);
      const res = await fetch("/.netlify/functions/poi-propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lat, lng, cityKey: CITY_KEY, description, submitterEmail, sourceLang: lang(), photoBase64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showError(errEl, messageForServerError(data.error));
      okEl.textContent = t("success");
      okEl.style.display = "block";
      document.getElementById("poi-propose-form").reset();
      miniMapMarker = null;
      setTimeout(closeModal, 3500);
    } catch {
      showError(errEl, t("errGeneric"));
    } finally {
      btn.disabled = false;
      btn.textContent = prevLabel;
    }
  }

  function useMyPosition() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        document.getElementById("poi-propose-lat").value = lat.toFixed(6);
        document.getElementById("poi-propose-lng").value = lng.toFixed(6);
        if (miniMap) setMiniMapMarker(lat, lng);
      },
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  function normalizeCoordInput(evt) {
    const n = parseCoord(evt.target?.value);
    if (Number.isFinite(n)) evt.target.value = n.toFixed(6);
  }

  function init() {
    document.getElementById("poi-propose-btn")?.addEventListener("click", openModal);
    document.getElementById("poi-propose-cancel")?.addEventListener("click", closeModal);
    document.querySelector("#poi-propose-modal .poi-propose-backdrop")?.addEventListener("click", closeModal);
    document.getElementById("poi-propose-pick-map")?.addEventListener("click", enableMapPick);
    document.getElementById("poi-propose-my-pos")?.addEventListener("click", useMyPosition);
    document.getElementById("poi-propose-form")?.addEventListener("submit", submitForm);
    document.getElementById("poi-propose-lat")?.addEventListener("blur", normalizeCoordInput);
    document.getElementById("poi-propose-lng")?.addEventListener("blur", normalizeCoordInput);
    document.addEventListener("languageChanged", applyLabels);
    applyLabels();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
