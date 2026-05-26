/**
 * Formulaire « Proposer un POI » (soumission staff + traduction serveur).
 */
(function () {
  "use strict";

  const FALLBACK = "fr";
  const SUPPORTED = ["fr", "en", "nl", "de", "it", "es", "pl", "ar", "zh", "ja"];
  const DEFAULT_CENTER = { lat: 50.4543, lng: 3.9526 };

  const texts = {
    proposeBtn: {
      fr: "Proposer un POI",
      en: "Suggest a POI",
      nl: "POI voorstellen",
      de: "POI vorschlagen",
      it: "Proponi un POI",
      es: "Proponer un POI",
      pl: "Zaproponuj POI",
      ar: "اقتراح نقطة اهتمام",
      zh: "提议兴趣点",
      ja: "スポットを提案",
    },
    modalTitle: {
      fr: "Proposer un point d'intérêt",
      en: "Suggest a point of interest",
      nl: "Stel een bezienswaardigheid voor",
      de: "Sehenswürdigkeit vorschlagen",
      it: "Proponi un luogo di interesse",
      es: "Proponer un punto de interés",
      pl: "Zaproponuj miejsce",
      ar: "اقتراح معلم",
      zh: "提议新兴趣点",
      ja: "スポットを提案",
    },
    nameLabel: { fr: "Nom du lieu", en: "Place name", es: "Nombre del lugar", de: "Name des Ortes", nl: "Naam", it: "Nome", pl: "Nazwa", ar: "اسم المكان", zh: "地点名称", ja: "名称" },
    latLabel: { fr: "Latitude", en: "Latitude", es: "Latitud", de: "Breite", nl: "Breedtegraad", it: "Latitudine", pl: "Szerokość", ar: "خط العرض", zh: "纬度", ja: "緯度" },
    lngLabel: { fr: "Longitude", en: "Longitude", es: "Longitud", de: "Länge", nl: "Lengtegraad", it: "Longitudine", pl: "Długość", ar: "خط الطول", zh: "经度", ja: "経度" },
    descLabel: {
      fr: "Description courte (votre langue)",
      en: "Short description (your language)",
      es: "Descripción breve (su idioma)",
      de: "Kurze Beschreibung",
      nl: "Korte beschrijving",
      it: "Breve descrizione",
      pl: "Krótki opis",
      ar: "وصف قصير",
      zh: "简短说明",
      ja: "短い説明",
    },
    emailLabel: {
      fr: "Votre e-mail (optionnel, pour vous prévenir)",
      en: "Your email (optional, for notification)",
      es: "Su correo (opcional)",
      de: "E-Mail (optional)",
      nl: "E-mail (optioneel)",
      it: "Email (opzionale)",
      pl: "E-mail (opcjonalnie)",
      ar: "بريدك (اختياري)",
      zh: "电子邮件（可选）",
      ja: "メール（任意）",
    },
    photoLabel: { fr: "Photo (JPG)", en: "Photo (JPG)", es: "Foto (JPG)", de: "Foto (JPG)", nl: "Foto (JPG)", it: "Foto (JPG)", pl: "Zdjęcie (JPG)", ar: "صورة JPG", zh: "照片 JPG", ja: "写真 JPG" },
    pickMap: { fr: "Choisir sur la carte", en: "Pick on map", es: "Elegir en el mapa", de: "Auf Karte wählen", nl: "Kies op kaart", it: "Scegli sulla mappa", pl: "Wybierz na mapie", ar: "اختر على الخريطة", zh: "在地图上选点", ja: "地図で選択" },
    myPos: { fr: "Ma position", en: "My location", es: "Mi posición", de: "Meine Position", nl: "Mijn locatie", it: "La mia posizione", pl: "Moja pozycja", ar: "موقعي", zh: "我的位置", ja: "現在地" },
    submit: { fr: "Envoyer pour validation", en: "Submit for review", es: "Enviar para validación", de: "Zur Prüfung senden", nl: "Indienen", it: "Invia per revisione", pl: "Wyślij", ar: "إرسال للمراجعة", zh: "提交审核", ja: "送信" },
    cancel: { fr: "Annuler", en: "Cancel", es: "Cancelar", de: "Abbrechen", nl: "Annuleren", it: "Annulla", pl: "Anuluj", ar: "إلغاء", zh: "取消", ja: "キャンセル" },
    hintReview: {
      fr: "Votre proposition sera traduite en 10 langues et publiée après validation par l'équipe (e-mail : cityloopquest@gmail.com).",
      en: "Your suggestion will be translated into 10 languages and published after staff approval (email: cityloopquest@gmail.com).",
      es: "Se traducirá a 10 idiomas y se publicará tras la validación del equipo.",
      de: "Wird in 10 Sprachen übersetzt und nach Freigabe veröffentlicht.",
      nl: "Wordt in 10 talen vertaald na goedkeuring.",
      it: "Sarà tradotto in 10 lingue dopo l'approvazione.",
      pl: "Tłumaczenie na 10 języków po zatwierdzeniu.",
      ar: "سيُترجم إلى 10 لغات بعد الموافقة.",
      zh: "将译为10种语言，经审核后发布。",
      ja: "10言語に翻訳され、承認後に公開されます。",
    },
    sending: { fr: "Envoi…", en: "Sending…", es: "Enviando…", de: "Senden…", nl: "Verzenden…", it: "Invio…", pl: "Wysyłanie…", ar: "جاري الإرسال…", zh: "发送中…", ja: "送信中…" },
    success: {
      fr: "Merci ! Votre proposition a été envoyée à cityloopquest@gmail.com. Elle apparaîtra sur la carte après validation.",
      en: "Thank you! Your suggestion was sent. It will appear on the map after approval.",
      es: "¡Gracias! Enviado. Aparecerá tras la validación.",
      de: "Danke! Nach Freigabe sichtbar.",
      nl: "Bedankt! Na goedkeuring zichtbaar.",
      it: "Grazie! Visibile dopo approvazione.",
      pl: "Dziękujemy! Po zatwierdzeniu na mapie.",
      ar: "شكراً! سيظهر بعد الموافقة.",
      zh: "感谢提交！审核通过后将显示。",
      ja: "送信しました。承認後に表示されます。",
    },
    errGeneric: {
      fr: "Envoi impossible. Réessayez plus tard.",
      en: "Could not send. Try again later.",
      es: "No se pudo enviar.",
      de: "Senden fehlgeschlagen.",
      nl: "Verzenden mislukt.",
      it: "Invio non riuscito.",
      pl: "Nie udało się wysłać.",
      ar: "تعذر الإرسال.",
      zh: "发送失败。",
      ja: "送信できませんでした。",
    },
    errSmtp: {
      fr: "Le serveur d'envoi n'est pas configuré. Contactez l'équipe CLQ ou réessayez plus tard.",
      en: "Mail server not configured. Try again later.",
      es: "Servidor de correo no configurado.",
      de: "E-Mail-Server nicht konfiguriert.",
      nl: "Mailserver niet geconfigureerd.",
      it: "Server e-mail non configurato.",
      pl: "Serwer poczty nie skonfigurowany.",
      ar: "خادم البريد غير مهيأ.",
      zh: "邮件服务器未配置。",
      ja: "メールサーバー未設定。",
    },
    errRequired: {
      fr: "Remplissez tous les champs obligatoires.",
      en: "Please fill all required fields.",
      es: "Complete todos los campos obligatorios.",
      de: "Bitte alle Pflichtfelder ausfüllen.",
      nl: "Vul alle verplichte velden in.",
      it: "Compila tutti i campi obbligatori.",
      pl: "Wypełnij wszystkie wymagane pola.",
      ar: "املأ جميع الحقول المطلوبة.",
      zh: "请填写所有必填项。",
      ja: "必須項目を入力してください。",
    },
    errDescShort: {
      fr: "La description doit contenir au moins 10 caractères.",
      en: "Description must be at least 10 characters.",
      es: "La descripción debe tener al menos 10 caracteres.",
      de: "Beschreibung: mindestens 10 Zeichen.",
      nl: "Beschrijving: minimaal 10 tekens.",
      it: "Descrizione: almeno 10 caratteri.",
      pl: "Opis: co najmniej 10 znaków.",
      ar: "الوصف 10 أحرف على الأقل.",
      zh: "说明至少需 10 个字符。",
      ja: "説明は10文字以上必要です。",
    },
    errCoordsInvalid: {
      fr: "Latitude ou longitude invalide (utilisez un point ou une virgule décimale).",
      en: "Invalid latitude or longitude (use a decimal point or comma).",
      es: "Latitud o longitud no válida.",
      de: "Ungültige Koordinaten.",
      nl: "Ongeldige coördinaten.",
      it: "Coordinate non valide.",
      pl: "Nieprawidłowe współrzędne.",
      ar: "إحداثيات غير صالحة.",
      zh: "坐标无效。",
      ja: "座標が無効です。",
    },
    errCoords: {
      fr: "Coordonnées hors région Mons.",
      en: "Coordinates outside Mons region.",
      es: "Coordenadas fuera de la región.",
      de: "Koordinaten außerhalb der Region.",
      nl: "Coördinaten buiten de regio.",
      it: "Coordinate fuori regione.",
      pl: "Współrzędne poza regionem.",
      ar: "إحداثيات خارج المنطقة.",
      zh: "坐标超出区域。",
      ja: "地域外の座標です。",
    },
    pickMapActive: {
      fr: "Touchez la carte ci-dessous pour placer le point…",
      en: "Tap the map below to set the location…",
      es: "Toque el mapa inferior…",
      de: "Tippen Sie auf die Karte unten…",
      nl: "Tik op de kaart hieronder…",
      it: "Tocca la mappa sotto…",
      pl: "Dotknij mapy poniżej…",
      ar: "المس الخريطة أدناه…",
      zh: "请点击下方地图选点…",
      ja: "下の地図をタップ…",
    },
    pickMapUnavailable: {
      fr: "Carte indisponible. Attendez le chargement de la page ou utilisez « Ma position ».",
      en: "Map unavailable. Wait for the page to load or use « My location ».",
      es: "Mapa no disponible. Use « Mi posición ».",
      de: "Karte nicht verfügbar. « Meine Position » verwenden.",
      nl: "Kaart niet beschikbaar.",
      it: "Mappa non disponibile.",
      pl: "Mapa niedostępna.",
      ar: "الخريطة غير متاحة.",
      zh: "地图不可用。",
      ja: "地図を利用できません。",
    },
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
    return (d && (d[lang()] || d[FALLBACK])) || "";
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
    const m = document.getElementById("poi-propose-modal");
    if (m) {
      m.classList.add("open");
      m.setAttribute("aria-hidden", "false");
    }
    applyLabels();
    document.getElementById("poi-propose-error").style.display = "none";
    document.getElementById("poi-propose-success").style.display = "none";
    disableMapPick();
  }

  function closeModal() {
    disableMapPick();
    const m = document.getElementById("poi-propose-modal");
    if (m) {
      m.classList.remove("open");
      m.setAttribute("aria-hidden", "true");
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
      let n = 0;
      const id = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(id);
          resolve(true);
          return;
        }
        n += 50;
        if (n >= maxMs) {
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
    const center = getMapCenter();
    miniMap = new google.maps.Map(el, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    return miniMap;
  }

  function setMiniMapMarker(lat, lng) {
    if (!miniMap) return;
    const pos = { lat, lng };
    if (miniMapMarker) {
      miniMapMarker.setPosition(pos);
    } else {
      miniMapMarker = new google.maps.Marker({
        map: miniMap,
        position: pos,
        draggable: true,
      });
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
    const errEl = document.getElementById("poi-propose-error");
    if (errEl) errEl.style.display = "none";

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
    if (!map) {
      if (hint) {
        hint.textContent = t("pickMapUnavailable");
        hint.style.display = "block";
      }
      return;
    }

    const latVal = parseCoord(document.getElementById("poi-propose-lat").value);
    const lngVal = parseCoord(document.getElementById("poi-propose-lng").value);
    if (Number.isFinite(latVal) && Number.isFinite(lngVal)) {
      setMiniMapMarker(latVal, lngVal);
    }

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
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
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
    if (code === "blobs_not_configured") {
      return lang() === "fr"
        ? "Stockage serveur indisponible. Réessayez plus tard ou contactez CLQ."
        : t("errGeneric");
    }
    if (code === "coords_outside_mons") return t("errCoords");
    return t("errGeneric");
  }

  /** Nombre décimal : accepte virgule ou point (saisie FR). */
  function parseCoord(raw) {
    const s = String(raw || "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".");
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
    const latRaw = document.getElementById("poi-propose-lat").value;
    const lngRaw = document.getElementById("poi-propose-lng").value;
    const lat = parseCoord(latRaw);
    const lng = parseCoord(lngRaw);
    const description = document.getElementById("poi-propose-desc").value.trim();
    const submitterEmail = document.getElementById("poi-propose-email").value.trim();
    const fileInput = document.getElementById("poi-propose-photo");

    if (!name) {
      showError(errEl, t("errRequired"));
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      showError(errEl, t("errCoordsInvalid"));
      return;
    }
    if (description.length < 10) {
      showError(errEl, t("errDescShort"));
      return;
    }
    const file = fileInput?.files?.[0];
    if (!isImageFile(file)) {
      showError(
        errEl,
        lang() === "fr" ? "Photo requise (JPG de préférence)." : "Photo required (JPG preferred)."
      );
      return;
    }

    btn.disabled = true;
    const prevLabel = btn.textContent;
    btn.textContent = t("sending");

    try {
      const photoBase64 = await resizeJpeg(file, 1200, 0.85);
      const res = await fetch("/.netlify/functions/poi-propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          lat,
          lng,
          description,
          submitterEmail,
          sourceLang: lang(),
          photoBase64,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errEl.textContent = messageForServerError(data.error);
        errEl.style.display = "block";
        return;
      }
      okEl.textContent = t("success");
      okEl.style.display = "block";
      document.getElementById("poi-propose-form").reset();
      miniMapMarker = null;
      setTimeout(closeModal, 3500);
    } catch {
      errEl.textContent = t("errGeneric");
      errEl.style.display = "block";
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

  function init() {
    document.getElementById("poi-propose-btn")?.addEventListener("click", openModal);
    document.getElementById("poi-propose-cancel")?.addEventListener("click", closeModal);
    document.querySelector("#poi-propose-modal .poi-propose-backdrop")?.addEventListener("click", closeModal);
    document.getElementById("poi-propose-pick-map")?.addEventListener("click", () => {
      enableMapPick();
    });
    document.getElementById("poi-propose-my-pos")?.addEventListener("click", useMyPosition);
    document.getElementById("poi-propose-form")?.addEventListener("submit", submitForm);
    document.getElementById("poi-propose-lat")?.addEventListener("blur", normalizeCoordInput);
    document.getElementById("poi-propose-lng")?.addEventListener("blur", normalizeCoordInput);
    document.addEventListener("languageChanged", applyLabels);
    applyLabels();
  }

  function normalizeCoordInput(evt) {
    const el = evt.target;
    if (!el) return;
    const n = parseCoord(el.value);
    if (Number.isFinite(n)) el.value = n.toFixed(6);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
