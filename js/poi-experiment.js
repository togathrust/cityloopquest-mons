/* Experimental POI explorer for CLQ city datasets. */
(function () {
  "use strict";

  const CITY_CONFIGS = {
    mons: {
      label: "CLQ Mons",
      datasetUrl: "data/pois_mons_experiment.json",
      defaultCenter: { lat: 50.4543, lng: 3.9526 },
      lastPosKey: "mons_lastKnownPosition"
    },
    bruxelles: {
      label: "CLQ Bruxelles",
      datasetUrl: "data/pois_bruxelles_experiment.json",
      defaultCenter: { lat: 50.8467, lng: 4.3525 },
      lastPosKey: "bruxelles_lastKnownPosition"
    }
  };
  const params = new URLSearchParams(window.location.search || "");
  const requestedCity = (params.get("city") || params.get("dataset") || "mons").toLowerCase();
  const CITY_CONFIG = CITY_CONFIGS[requestedCity] || CITY_CONFIGS.mons;
  const DEFAULT_CENTER = CITY_CONFIG.defaultCenter;
  const FALLBACK_LANG = "fr";
  const LS_LAST_POS = CITY_CONFIG.lastPosKey;
  const SUPPORTED_LANGS = ["fr", "en", "nl", "de", "it", "es", "pl", "ar", "zh", "ja"];
  window.CLQ_POI_CITY_CONFIG = {
    center: { ...CITY_CONFIG.defaultCenter },
    label: CITY_CONFIG.label,
    datasetUrl: CITY_CONFIG.datasetUrl,
    cityKey: CITY_CONFIG === CITY_CONFIGS.bruxelles ? "bruxelles" : "mons"
  };
  /** Zoom lorsqu'un POI est choisi (liste ou marqueur). */
  const ZOOM_POI_FOCUS = 17;

  const uiTexts = {
    askGo: {
      fr: "Voulez-vous y aller ?",
      en: "Would you like to go there?",
      nl: "Wil je ernaartoe gaan?",
      de: "Mochtest du dorthin gehen?",
      it: "Vuoi andarci?",
      es: "Quieres ir alli?",
      pl: "Czy chcesz tam pojsc?",
      ar: "هل تريد الذهاب إلى هناك؟",
      zh: "是否前往该地点？",
      ja: "ここへ行きますか？"
    },
    walkInterrupt: {
      fr: "Une balade est en cours. Elle va s'interrompre pour lancer le guidage vers ce point d'interet. Continuer ?",
      en: "A walk is currently in progress. It will be paused to start navigation to this point of interest. Continue?",
      nl: "Er is een wandeling bezig. Die wordt onderbroken om navigatie naar dit punt te starten. Doorgaan?",
      de: "Ein Rundgang lauft. Er wird unterbrochen, um die Navigation zu diesem Ort zu starten. Fortfahren?",
      it: "Una visita e in corso. Verra interrotta per avviare la guida verso questo punto di interesse. Continuare?",
      es: "Hay un recorrido en curso. Se interrumpira para iniciar la guia hasta este punto de interes. Continuar?",
      pl: "Spacer jest w toku. Zostanie przerwany, aby uruchomic nawigacje do tego miejsca. Kontynuowac?",
      ar: "هناك جولة جارية. سيتم إيقافها لبدء التوجيه إلى هذه النقطة. هل تريد المتابعة؟",
      zh: "当前有导览进行中。将中断以开始前往此兴趣点的导航。继续吗？",
      ja: "散策が進行中です。このスポットへのナビを開始するため中断します。続けますか？"
    },
    visibleCount: {
      fr: "POI visibles",
      en: "Visible POIs",
      nl: "Zichtbare POIs",
      de: "Sichtbare POIs",
      it: "POI visibili",
      es: "POI visibles",
      pl: "Widoczne POI",
      ar: "نقاط الاهتمام الظاهرة",
      zh: "可见兴趣点",
      ja: "表示中のスポット"
    },
    labelRadius: {
      fr: "Rayon (km)",
      en: "Radius (km)",
      nl: "Straal (km)",
      de: "Radius (km)",
      it: "Raggio (km)",
      es: "Radio (km)",
      pl: "Promien (km)",
      ar: "نصف القطر (كم)",
      zh: "半径（公里）",
      ja: "半径（km）"
    },
    backToMain: {
      fr: "Retour au parcours",
      en: "Back to the tour",
      nl: "Terug naar de route",
      de: "Zuruck zur Tour",
      it: "Torna al percorso",
      es: "Volver al recorrido",
      pl: "Powrot do trasy",
      ar: "العودة إلى الجولة",
      zh: "返回游览路线",
      ja: "ルートに戻る"
    },
    goChosenPoiHeader: {
      fr: "Aller au POI choisi",
      en: "Go to selected POI",
      nl: "Ga naar gekozen POI",
      de: "Zum gewahlten POI",
      it: "Vai al POI selezionato",
      es: "Ir al POI elegido",
      pl: "Idz do wybranego POI",
      ar: "الانتقال إلى نقطة الاهتمام المختارة",
      zh: "前往已选兴趣点",
      ja: "選んだスポットへ行く"
    },
    tourSavedSummary: {
      fr: "Sauvegarde : etape {step} — score {score}{gps}",
      en: "Saved: step {step} — score {score}{gps}",
      nl: "Opgeslagen: stap {step} — score {score}{gps}",
      de: "Gespeichert: Etappe {step} — Punkte {score}{gps}",
      it: "Salvato: tappa {step} — punteggio {score}{gps}",
      es: "Guardado: etapa {step} — puntuacion {score}{gps}",
      pl: "Zapis: etap {step} — wynik {score}{gps}",
      ar: "محفوظ: المرحلة {step} — النقاط {score}{gps}",
      zh: "已保存：第 {step} 站 — 分数 {score}{gps}",
      ja: "保存：ステップ{step} — スコア{score}{gps}"
    },
    tourGpsSaved: {
      fr: " — derniere position GPS enregistree",
      en: " — last GPS position saved",
      nl: " — laatste GPS-positie opgeslagen",
      de: " — letzte GPS-Position gespeichert",
      it: " — ultima posizione GPS salvata",
      es: " — ultima posicion GPS guardada",
      pl: " — ostatnia pozycja GPS zapisana",
      ar: " — آخر موقع GPS محفوظ",
      zh: " — 已保存上次GPS位置",
      ja: " — 最後のGPS位置を保存済み"
    },
    closeDetailView: {
      fr: "Fermer — carte",
      en: "Close — map",
      nl: "Sluiten — kaart",
      de: "Schliessen — Karte",
      it: "Chiudi — mappa",
      es: "Cerrar — mapa",
      pl: "Zamknij — mape",
      ar: "إغلاق — الخريطة",
      zh: "关闭 — 地图",
      ja: "閉じる — 地図"
    },
    mapsReturnHint: {
      fr: "Google Maps s'ouvre dans un nouvel onglet. Pour revenir ici, repassez sur l'onglet de cette page ou utilisez le bouton Retour du navigateur.",
      en: "Google Maps opens in a new tab. To return here, switch back to this tab or use the browser Back control.",
      nl: "Google Maps opent in een nieuw tabblad. Ga terug naar dit tabblad of gebruik de Terug-knop van de browser.",
      de: "Google Maps oeffnet in einem neuen Tab. Kehren Sie zu diesem Tab zurueck oder nutzen Sie die Zurueck-Funktion des Browsers.",
      it: "Google Maps si apre in una nuova scheda. Torna a questa scheda o usa il tasto Indietro del browser.",
      es: "Google Maps se abre en una pestana nueva. Vuelve a esta pestana o usa el boton Atras del navegador.",
      pl: "Google Maps otwiera sie w nowej karcie. Wroc do tej karty lub uzyj przycisku Wstecz w przegladarce.",
      ar: "يفتح Google Maps في علامة تبويب جديدة. للعودة هنا انتقل إلى علامة التبويب هذه أو استخدم زر الرجوع في المتصفح.",
      zh: "Google 地图会在新标签页打开。返回本页请切换回该标签或使用浏览器的后退。",
      ja: "Googleマップは新しいタブで開きます。戻るにはこのタブに切り替えるか、ブラウザの戻るを使ってください。"
    }
  };

  const state = {
    map: null,
    userPos: null,
    userMarker: null,
    allPois: [],
    filteredPois: [],
    markers: [],
    markerPulseInterval: null,
    activePoi: null,
    defaultCenter: { ...DEFAULT_CENTER },
    /** Évite double init si le callback Google est invoqué deux fois (Safari). */
    mapInitLock: false,
    /** Listeners POI déjà branchés. */
    poiActionsBound: false
  };

  const sectionCenters = {};

  function applyCityLabel() {
    const title = `${CITY_CONFIG.label} - POI Explorer`;
    document.title = title;
    const h1 = document.querySelector("header h1");
    if (h1) h1.textContent = title;
    window.CLQ_POI_CITY_CONFIG = {
      center: { ...CITY_CONFIG.defaultCenter },
      label: CITY_CONFIG.label,
      datasetUrl: CITY_CONFIG.datasetUrl,
      cityKey: CITY_CONFIG === CITY_CONFIGS.bruxelles ? "bruxelles" : "mons"
    };
  }

  function rawStoredLanguage() {
    return (localStorage.getItem("selectedLanguage") || FALLBACK_LANG).toLowerCase();
  }

  function currentLang() {
    let lang = rawStoredLanguage();
    if (lang === "cn") lang = "zh";
    if (lang === "jp") lang = "ja";
    return SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
  }

  /** Garde #language-select aligné (évite null si autre script ou cache lit ce nœud). */
  function syncHiddenLanguageSelect() {
    const sel = document.getElementById("language-select");
    if (!sel) return;
    const raw = rawStoredLanguage();
    const pick = sel.querySelector(`option[value="${raw}"]`) ? raw : currentLang();
    if (sel.querySelector(`option[value="${pick}"]`)) sel.value = pick;
  }

  function t(dict) {
    const lang = currentLang();
    return (dict && (dict[lang] || dict[FALLBACK_LANG])) || "";
  }

  function mapCenter() {
    return state.defaultCenter || DEFAULT_CENTER;
  }

  /** Lit un champ monolingue ou un objet { fr, en, cn, ja, ... }. */
  function localizedField(field, lang) {
    if (field == null) return "";
    if (typeof field === "string") return field;
    if (typeof field !== "object") return String(field);
    if (lang === "zh") {
      return field.zh || field.cn || field[FALLBACK_LANG] || field.en || "";
    }
    if (lang === "ja") {
      return field.ja || field.jp || field[FALLBACK_LANG] || field.en || "";
    }
    return field[lang] || field[FALLBACK_LANG] || field.en || "";
  }

  function normalizeDescriptions(raw) {
    const src = raw.descriptions || raw.description;
    if (!src) return {};
    if (typeof src === "string") return { [FALLBACK_LANG]: src };
    const out = { ...src };
    if (out.cn && !out.zh) out.zh = out.cn;
    if (out.jp && !out.ja) out.ja = out.jp;
    if (out.zh && !out.cn) out.cn = out.zh;
    if (out.ja && !out.jp) out.jp = out.ja;
    return out;
  }

  function isPoiIncluded(raw) {
    if (raw.verified === false) return false;
    if (raw.verified === true) return true;
    return Number.isFinite(raw.lat) && Number.isFinite(raw.lng);
  }

  function normalizePoiRecord(raw) {
    const nameLocales = typeof raw.name === "object" && raw.name ? raw.name : null;
    const categoryLocales =
      typeof raw.category === "object" && raw.category && !Array.isArray(raw.category)
        ? raw.category
        : null;
    return {
      ...raw,
      _nameLocales: nameLocales,
      _categoryLocales: categoryLocales,
      descriptions: normalizeDescriptions(raw),
      category: Array.isArray(raw.category) ? raw.category.slice() : [],
      verified: isPoiIncluded(raw),
      needsReview: raw.coordinateStatus === "to_verify" || raw.needsReview === true
    };
  }

  function poiDisplayName(poi) {
    if (!poi) return "";
    if (poi._nameLocales) return localizedField(poi._nameLocales, currentLang());
    return String(poi.name || poi.id || "POI");
  }

  function poiCategoryParts(poi) {
    if (!poi) return [];
    if (poi._categoryLocales) {
      const label = localizedField(poi._categoryLocales, currentLang());
      return label ? [label] : [];
    }
    return Array.isArray(poi.category) ? poi.category.slice() : [];
  }

  function poiDescription(poi) {
    if (!poi || !poi.descriptions) return "";
    const lang = currentLang();
    const d = poi.descriptions;
    if (lang === "zh") return d.zh || d.cn || d[FALLBACK_LANG] || d.en || "";
    if (lang === "ja") return d.ja || d.jp || d[FALLBACK_LANG] || d.en || "";
    return d[lang] || d[FALLBACK_LANG] || d.en || "";
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return Math.abs(h >>> 0);
  }

  function syntheticCoord(base, seed, amplitudeKm) {
    const h1 = hash32(`${seed}-lat`);
    const h2 = hash32(`${seed}-lng`);
    const latOffsetKm = ((h1 % 1000) / 1000 - 0.5) * amplitudeKm;
    const lngOffsetKm = ((h2 % 1000) / 1000 - 0.5) * amplitudeKm;
    const dLat = latOffsetKm / 111;
    const dLng = lngOffsetKm / (111 * Math.cos(base.lat * Math.PI / 180));
    return { lat: base.lat + dLat, lng: base.lng + dLng };
  }

  function selectedRadiusKm() {
    const el = document.getElementById("radius-select");
    return Number(el ? el.value : 10);
  }

  function openGoogleMapsRoute(lat, lng) {
    const opts = { destLat: lat, destLng: lng };
    if (state.userPos && Number.isFinite(state.userPos.lat) && Number.isFinite(state.userPos.lng)) {
      opts.originLat = state.userPos.lat;
      opts.originLng = state.userPos.lng;
    }
    if (typeof window.clqOpenGoogleMapsBridge === "function") {
      window.clqOpenGoogleMapsBridge(opts);
      return;
    }
    let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    if (opts.originLat != null && opts.originLng != null) {
      url += `&origin=${opts.originLat},${opts.originLng}`;
    }
    if (typeof window.clqOpenGoogleMapsFromUrl === "function") {
      window.clqOpenGoogleMapsFromUrl(url);
    } else {
      window.location.assign(url);
    }
  }

  function showMapsReturnBanner() {
    let bar = document.getElementById("clq-maps-return-banner");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "clq-maps-return-banner";
      bar.setAttribute("role", "status");
      document.body.appendChild(bar);
    }
    bar.textContent =
      currentLang() === "fr"
        ? "✓ Vous êtes de retour sur CLQ. Utilisez la carte pour continuer."
        : "✓ Back on CLQ. Continue with the map.";
    bar.classList.add("clq-maps-return-banner--visible");
    clearTimeout(showMapsReturnBanner._t);
    showMapsReturnBanner._t = setTimeout(() => {
      bar.classList.remove("clq-maps-return-banner--visible");
    }, 6000);
  }

  function tryOpenRouteToActivePoi() {
    if (!state.activePoi) return;
    if (isWalkInProgress()) {
      const ok = window.confirm(t(uiTexts.walkInterrupt));
      if (!ok) return;
    }
    openGoogleMapsRoute(state.activePoi.lat, state.activePoi.lng);
  }

  function setHeaderGoPoiButtonState() {
    const btn = document.getElementById("header-go-poi-btn");
    if (btn) btn.disabled = !state.activePoi;
  }

  /** Dedoublonnage insensible aux accents (masterlist vs JSON). */
  function normalizePoiName(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function masterlistCacheKey(sectionId, name) {
    return `${sectionId}::${normalizePoiName(name)}`;
  }

  async function loadGeocodeCache() {
    try {
      const res = await fetch("data/pois_geocoded_cache.json");
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function applyGeocodeCacheToPoi(poi, cacheData) {
    if (!cacheData || !cacheData.entries || !poi.sectionId) return poi;
    const key = masterlistCacheKey(poi.sectionId, poi.name);
    const e = cacheData.entries[key];
    if (!e || e.lat == null || e.lng == null) return poi;

    const urls = (e.photos || [])
      .map((p) => (typeof p === "string" ? p : p && p.url))
      .filter(Boolean);

    return {
      ...poi,
      lat: e.lat,
      lng: e.lng,
      synthetic: false,
      cacheEnriched: true,
      needsReview: e.needsReview !== false,
      displayName: e.displayName || "",
      descriptions:
        e.descriptions && Object.keys(e.descriptions).length ? e.descriptions : poi.descriptions,
      photos: urls.length ? urls : poi.photos,
      photoMeta: Array.isArray(e.photos) ? e.photos : [],
      geocodeSource: e.geocodeSource,
      sourceUrls: e.wikipediaUrl ? [e.wikipediaUrl] : poi.sourceUrls || [],
    };
  }

  function isWalkInProgress() {
    return (
      localStorage.getItem("walkInProgress") === "true" ||
      localStorage.getItem("mons_walkInProgress") === "true" ||
      localStorage.getItem("museumMode") === "true"
    );
  }

  function focusPoiOnMap(poi) {
    if (!state.map || !poi || !Number.isFinite(poi.lat) || !Number.isFinite(poi.lng)) return;
    state.map.setCenter({ lat: poi.lat, lng: poi.lng });
    state.map.setZoom(ZOOM_POI_FOCUS);
  }

  function clearListSelectionHighlight() {
    document.querySelectorAll(".poi-list-item--active").forEach((el) => {
      el.classList.remove("poi-list-item--active");
    });
  }

  function setPoiDetailViewOpen(open) {
    const mainEl = document.querySelector("main");
    const view = document.getElementById("poi-detail-view");
    if (!mainEl || !view) return;
    if (open) {
      mainEl.classList.add("poi-detail-open");
      view.setAttribute("aria-hidden", "false");
    } else {
      mainEl.classList.remove("poi-detail-open");
      view.setAttribute("aria-hidden", "true");
    }
  }

  function highlightListSelection(poi) {
    if (!poi || !poi.id) return;
    clearListSelectionHighlight();
    const list = document.getElementById("poi-list");
    if (!list) return;
    const safeId = String(poi.id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const btn = list.querySelector(`[data-poi-id="${safeId}"]`);
    if (btn) {
      btn.classList.add("poi-list-item--active");
      try {
        btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch (e) {
        try {
          btn.scrollIntoView(false);
        } catch (e2) {
          /* Safari / WebView anciens */
        }
      }
    }
  }

  function selectPoiFromMapOrList(poi) {
    renderPoiDetails(poi);
    highlightMapMarkerForPoi(poi);
    focusPoiOnMap(poi);
    highlightListSelection(poi);
  }

  function defaultPoiIcon(scale) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor: "#b30000",
      fillOpacity: 0.95,
      strokeColor: "#ffffff",
      strokeWeight: 1.8
    };
  }

  function selectedPoiIcon(scale) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor: "#1565c0",
      fillOpacity: 0.98,
      strokeColor: "#ffeb3b",
      strokeWeight: 2.2
    };
  }

  function resetMapMarkerStyles() {
    if (state.markerPulseInterval) {
      clearInterval(state.markerPulseInterval);
      state.markerPulseInterval = null;
    }
    state.markers.forEach((m) => {
      m.setIcon(defaultPoiIcon(7));
    });
  }

  function highlightMapMarkerForPoi(poi) {
    resetMapMarkerStyles();
    if (!poi || poi.id == null) return;
    const marker = state.markers.find((m) => m.__poiId === poi.id);
    if (!marker) return;
    let pulse = false;
    marker.setIcon(selectedPoiIcon(9));
    state.markerPulseInterval = setInterval(() => {
      pulse = !pulse;
      marker.setIcon(selectedPoiIcon(pulse ? 10 : 7));
    }, 520);
  }

  function poiPhotoUrl(src) {
    if (!src) return "";
    if (String(src).includes("://")) return String(src);
    const path = String(src)
      .replace(/^\//, "")
      .split("/")
      .map((part) => {
        try {
          return encodeURIComponent(decodeURIComponent(part));
        } catch {
          return encodeURIComponent(part);
        }
      })
      .join("/");
    return new URL(path, `${window.location.origin}/`).href;
  }

  function photoPathKey(src) {
    if (!src) return "";
    const raw = String(src).trim();
    if (raw.includes("://")) return raw;
    try {
      return raw
        .replace(/^\//, "")
        .split("/")
        .map((part) => decodeURIComponent(part))
        .join("/")
        .toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }

  /** Sources uniques pour l'affichage (image et photos[] pointent souvent vers le même fichier). */
  function photoSourcesForPoi(poi) {
    const list = [];
    const seen = new Set();
    const add = (s) => {
      const k = photoPathKey(s);
      if (!k || seen.has(k)) return;
      seen.add(k);
      list.push(String(s).trim());
    };
    if (poi.image) add(poi.image);
    if (Array.isArray(poi.photos)) poi.photos.forEach(add);
    return list;
  }

  /** Candidats de repli si une variante d'URL échoue (même fichier, encodages différents). */
  function photoFallbackForPoi(poi) {
    const list = [];
    const seenUrl = new Set();
    const add = (s) => {
      const k = String(s || "").trim();
      if (!k) return;
      const url = poiPhotoUrl(k);
      if (seenUrl.has(url)) return;
      seenUrl.add(url);
      list.push(k);
    };
    if (poi.image) add(poi.image);
    if (Array.isArray(poi.photos)) poi.photos.forEach(add);
    return list;
  }

  function renderGallery(poi) {
    const firstWrap = document.getElementById("poi-first-photo");
    const gallery = document.getElementById("poi-gallery");
    if (!firstWrap || !gallery) return;
    firstWrap.innerHTML = "";
    gallery.innerHTML = "";
    const photos = photoSourcesForPoi(poi);
    const meta = (poi && poi.photoMeta) || [];

    function appendPhoto(src, idx, container) {
      const wrap = document.createElement("div");
      wrap.style.marginBottom = container === gallery ? "6px" : "0";
      const img = document.createElement("img");
      const candidates = photoFallbackForPoi(poi);
      let candIdx = Math.max(0, candidates.indexOf(src));
      const setSrc = (i) => {
        if (i >= candidates.length) return;
        img.src = poiPhotoUrl(candidates[i]);
      };
      setSrc(candIdx);
      img.alt = poiDisplayName(poi) || "POI photo";
      img.loading = "lazy";
      img.addEventListener("error", () => {
        candIdx += 1;
        if (candIdx < candidates.length) setSrc(candIdx);
      });
      wrap.appendChild(img);
      const m = meta[idx];
      if (m && (m.credit || m.license)) {
        const cap = document.createElement("div");
        cap.className = "muted";
        cap.style.fontSize = "0.72rem";
        cap.style.lineHeight = "1.2";
        cap.textContent = [m.credit, m.license].filter(Boolean).join(" — ");
        wrap.appendChild(cap);
      }
      container.appendChild(wrap);
    }

    if (!photos.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.style.margin = "0";
      empty.textContent = "Aucune image libre de droits trouvee (Wikipedia) pour ce POI.";
      firstWrap.appendChild(empty);
      return;
    }
    appendPhoto(photos[0], 0, firstWrap);
    for (let i = 1; i < photos.length; i += 1) {
      appendPhoto(photos[i], i, gallery);
    }
  }

  function renderPoiDetails(poi) {
    state.activePoi = poi;
    const title = document.getElementById("poi-title");
    const desc = document.getElementById("poi-desc");
    const cat = document.getElementById("poi-cat");
    const dist = document.getElementById("poi-distance");
    const ask = document.getElementById("poi-ask");
    const hint = document.getElementById("maps-return-hint");

    title.textContent = poiDisplayName(poi);
    desc.textContent = poiDescription(poi);
    const catParts = poiCategoryParts(poi);
    if (poi.needsReview) catParts.push("a reviser (geocodage auto)");
    cat.textContent = catParts.join(", ");
    const origin = state.userPos || mapCenter();
    const km = haversineKm(origin.lat, origin.lng, poi.lat, poi.lng);
    dist.textContent = `${km.toFixed(1)} km`;
    if (poi.synthetic) {
      ask.textContent = "(Coordonnees synthetiques — a verifier avant navigation.)";
    } else {
      ask.textContent = "";
    }
    if (hint) hint.textContent = t(uiTexts.mapsReturnHint);
    renderGallery(poi);
    setPoiDetailViewOpen(true);
    const scrollCol = document.getElementById("poi-detail-scroll");
    if (scrollCol) scrollCol.scrollTop = 0;
    const mediaCol = document.getElementById("poi-detail-media");
    if (mediaCol) mediaCol.scrollTop = 0;
    setHeaderGoPoiButtonState();
  }

  /** Ferme la fiche détail mais garde le POI sélectionné (marqueur bleu + liste). */
  function closePoiDetailViewOnly() {
    setPoiDetailViewOpen(false);
    if (state.activePoi) {
      highlightMapMarkerForPoi(state.activePoi);
      highlightListSelection(state.activePoi);
      focusPoiOnMap(state.activePoi);
    }
    setHeaderGoPoiButtonState();
  }

  function resetPoiDetails() {
    state.activePoi = null;
    clearListSelectionHighlight();
    document.getElementById("poi-title").textContent = "";
    document.getElementById("poi-cat").textContent = "";
    document.getElementById("poi-distance").textContent = "";
    document.getElementById("poi-desc").textContent = "";
    document.getElementById("poi-ask").textContent = "";
    const hint = document.getElementById("maps-return-hint");
    if (hint) hint.textContent = "";
    const firstPh = document.getElementById("poi-first-photo");
    if (firstPh) firstPh.innerHTML = "";
    document.getElementById("poi-gallery").innerHTML = "";
    resetMapMarkerStyles();
    setPoiDetailViewOpen(false);
    setHeaderGoPoiButtonState();
  }

  function clearMarkers() {
    resetMapMarkerStyles();
    state.markers.forEach((m) => m.setMap(null));
    state.markers = [];
  }

  function renderMarkers() {
    clearMarkers();
    const bounds = new google.maps.LatLngBounds();

    state.filteredPois.forEach((poi) => {
      const marker = new google.maps.Marker({
        map: state.map,
        position: { lat: poi.lat, lng: poi.lng },
        title: poiDisplayName(poi),
        icon: defaultPoiIcon(7)
      });
      marker.__poiId = poi.id;
      marker.addListener("click", () => {
        selectPoiFromMapOrList(poi);
      });
      state.markers.push(marker);
      bounds.extend({ lat: poi.lat, lng: poi.lng });
    });

    if (state.userPos) {
      const userIcon = {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 5,
        fillColor: "#0050c8",
        fillOpacity: 0.95,
        strokeColor: "#ffffff",
        strokeWeight: 1
      };
      if (state.userMarker) {
        state.userMarker.setPosition(state.userPos);
        state.userMarker.setMap(state.map);
      } else {
        state.userMarker = new google.maps.Marker({
          map: state.map,
          position: state.userPos,
          title: "Position actuelle",
          icon: userIcon
        });
      }
      bounds.extend(state.userPos);
    } else if (state.userMarker) {
      state.userMarker.setMap(null);
    }

    if (state.filteredPois.length > 0) {
      state.map.fitBounds(bounds);
    } else {
      state.map.setCenter(state.userPos || mapCenter());
      state.map.setZoom(11);
    }

    if (state.activePoi && state.filteredPois.some((p) => p.id === state.activePoi.id)) {
      highlightMapMarkerForPoi(state.activePoi);
    }
  }

  function updateVisibleList() {
    const count = document.getElementById("visible-count");
    const list = document.getElementById("poi-list");
    count.textContent = `${t(uiTexts.visibleCount)}: ${state.filteredPois.length}`;
    list.innerHTML = "";

    state.filteredPois
      .slice()
      .sort((a, b) => poiDisplayName(a).localeCompare(poiDisplayName(b)))
      .forEach((poi) => {
        const item = document.createElement("button");
        item.className = "poi-list-item";
        item.textContent = poiDisplayName(poi);
        item.setAttribute("data-poi-id", poi.id);
        item.addEventListener("click", () => {
          selectPoiFromMapOrList(poi);
        });
        list.appendChild(item);
      });
    if (state.activePoi && state.filteredPois.some((p) => p.id === state.activePoi.id)) {
      highlightListSelection(state.activePoi);
    }
  }

  function applyRadiusFilter() {
    const origin = state.userPos || mapCenter();
    const radius = selectedRadiusKm();
    state.filteredPois = state.allPois.filter((poi) => {
      const km = haversineKm(origin.lat, origin.lng, poi.lat, poi.lng);
      return km <= radius;
    });
    if (!state.activePoi || !state.filteredPois.some((poi) => poi.id === state.activePoi.id)) {
      resetPoiDetails();
    }
    renderMarkers();
    updateVisibleList();
  }

  async function loadCommunityPois() {
    try {
      const res = await fetch("/.netlify/functions/poi-community");
      if (!res.ok) return [];
      const data = await res.json();
      const cityKey = window.CLQ_POI_CITY_CONFIG?.cityKey || "mons";
      const expectedCity = cityKey === "bruxelles" ? "bruxelles" : "mons";
      return (data.pois || []).filter((p) => {
        const city = String(p.city || "").toLowerCase();
        return p.verified === true && city.includes(expectedCity);
      });
    } catch {
      return [];
    }
  }

  async function loadPois() {
    const res = await fetch(CITY_CONFIG.datasetUrl);
    if (!res.ok) throw new Error(`Impossible de charger ${CITY_CONFIG.datasetUrl}`);
    const data = await res.json();
    const center = data.center || data.meta?.center;
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      state.defaultCenter = { lat: center.lat, lng: center.lng };
    }
    const basePois = Array.isArray(data.pois) ? data.pois : [];
    const community = await loadCommunityPois();
    const byId = new Map();
    for (const p of basePois.filter(isPoiIncluded).map(normalizePoiRecord)) {
      byId.set(p.id, p);
    }
    for (const p of community.map(normalizePoiRecord)) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
    state.allPois = Array.from(byId.values());
  }

  /** Recharge les POI communautaires (apres approbation staff). */
  async function refreshCommunityPois() {
    const community = await loadCommunityPois();
    const ids = new Set(state.allPois.map((p) => p.id));
    let added = false;
    for (const p of community) {
      if (!ids.has(p.id)) {
        state.allPois.push(p);
        added = true;
      }
    }
    if (added) applyRadiusFilter();
  }

  async function loadMasterListPois() {
    // Les POI confirmes sont fournis par le dataset ville charge plus haut.
    return [];
  }

  function bindActions() {
    if (state.poiActionsBound) return;
    state.poiActionsBound = true;

    const radiusEl = document.getElementById("radius-select");
    if (radiusEl) radiusEl.addEventListener("change", applyRadiusFilter);

    document.addEventListener("languageChanged", () => {
      syncHiddenLanguageSelect();
      if (state.activePoi) renderPoiDetails(state.activePoi);
      updateVisibleList();
      updateLabels();
    });

    const goBtn = document.getElementById("go-btn");
    if (goBtn) goBtn.addEventListener("click", tryOpenRouteToActivePoi);

    const headerGo = document.getElementById("header-go-poi-btn");
    if (headerGo) headerGo.addEventListener("click", tryOpenRouteToActivePoi);

    const backBtn = document.getElementById("back-to-main-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.location.href = "main.html";
      });
    }

    const closeDetailBtn = document.getElementById("poi-detail-close");
    if (closeDetailBtn) {
      closeDetailBtn.addEventListener("click", () => closePoiDetailViewOnly());
    }
  }

  function updateTourSavedSummary() {
    const el = document.getElementById("tour-saved-summary");
    if (!el) return;
    const idxRaw = localStorage.getItem("mons_currentIndex");
    const scoreRaw = localStorage.getItem("mons_score");
    const idxNum = idxRaw !== null && idxRaw !== "" ? parseInt(idxRaw, 10) : NaN;
    const step = !Number.isNaN(idxNum) ? String(idxNum + 1) : "?";
    const scoreNum = scoreRaw !== null && scoreRaw !== "" ? parseInt(scoreRaw, 10) : NaN;
    const score = !Number.isNaN(scoreNum) ? String(scoreNum) : "0";
    let hasGps = false;
    try {
      const raw = localStorage.getItem(LS_LAST_POS);
      if (raw) {
        const o = JSON.parse(raw);
        hasGps = typeof o.lat === "number" && typeof o.lng === "number";
      }
    } catch (e) {
      hasGps = false;
    }
    const gps = hasGps ? t(uiTexts.tourGpsSaved) : "";
    el.textContent = t(uiTexts.tourSavedSummary)
      .replace("{step}", step)
      .replace("{score}", score)
      .replace("{gps}", gps);
  }

  function updateLabels() {
    const lr = document.getElementById("label-radius");
    if (lr) lr.textContent = t(uiTexts.labelRadius);
    const goBtn = document.getElementById("go-btn");
    if (goBtn) goBtn.textContent = t(uiTexts.askGo);
    const headerGo = document.getElementById("header-go-poi-btn");
    if (headerGo) headerGo.textContent = t(uiTexts.goChosenPoiHeader);
    const backBtn = document.getElementById("back-to-main-btn");
    if (backBtn) backBtn.textContent = t(uiTexts.backToMain);
    const closeDetailBtn = document.getElementById("poi-detail-close");
    if (closeDetailBtn) closeDetailBtn.textContent = t(uiTexts.closeDetailView);
    updateTourSavedSummary();
    try {
      if (window.languageSelector) window.languageSelector.updateSelectorValue();
    } catch (e) {
      console.warn("[CLQ] languageSelector.updateSelectorValue", e);
    }
    syncHiddenLanguageSelect();
  }

  function locateUser() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        // enableHighAccuracy peut retarder ou bloquer certains Safari / WebKit
        { timeout: 8000, maximumAge: 120000, enableHighAccuracy: false }
      );
    });
  }

  /** Attend que l'objet google.maps soit utilisable (Safari peut être en retard sur le callback). */
  function waitForGoogleMapsReady() {
    return new Promise((resolve, reject) => {
      let n = 0;
      const t = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          clearInterval(t);
          resolve();
          return;
        }
        n += 1;
        if (n > 120) {
          clearInterval(t);
          reject(new Error("Google Maps API indisponible (delai depasse)."));
        }
      }, 50);
    });
  }

  async function initExperimentMap() {
    if (state.mapInitLock) return;
    const mapEl = document.getElementById("poi-map");
    if (!mapEl) return;
    state.mapInitLock = true;
    try {
      await waitForGoogleMapsReady();
      await loadPois();
      state.userPos = await locateUser();
      state.map = new google.maps.Map(mapEl, {
        center: state.userPos || mapCenter(),
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
      window.__clqExperimentMap = state.map;
      bindActions();
      syncHiddenLanguageSelect();
      updateLabels();
      applyRadiusFilter();
    } catch (err) {
      state.mapInitLock = false;
      if (mapEl) {
        mapEl.innerHTML = `<p class="error">${String((err && err.message) || err)}</p>`;
      }
      console.error(err);
    }
  }

  function loadGoogleMapsAPI() {
    const apiKey = window.__GOOGLE_MAPS_API_KEY__;
    if (apiKey && /^AIza[A-Za-z0-9_-]+$/.test(apiKey)) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&callback=initExperimentMap`;
      script.defer = true;
      document.head.appendChild(script);
      return;
    }

    fetch("Clé API.txt")
      .then((response) => {
        if (!response.ok) throw new Error("Cle API introuvable (Clé API.txt).");
        return response.text();
      })
      .then((text) => {
        const match = text.match(/AIza[A-Za-z0-9_-]+/);
        if (!match) throw new Error("Format de cle API invalide.");
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${match[0]}&v=weekly&callback=initExperimentMap`;
        script.defer = true;
        document.head.appendChild(script);
      })
      .catch((err) => {
        const map = document.getElementById("poi-map");
        map.innerHTML = `<p class="error">${String(err.message || err)}</p>`;
        console.error(err);
      });
  }

  window.initExperimentMap = initExperimentMap;
  window.clqRefreshCommunityPois = refreshCommunityPois;

  window.addEventListener("pageshow", () => {
    try {
      if (sessionStorage.getItem("clq_maps_went_out") === "1") {
        sessionStorage.removeItem("clq_maps_went_out");
        showMapsReturnBanner();
      }
    } catch {
      /* ignore */
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    applyCityLabel();
    loadGoogleMapsAPI();
  });
})();
