// 🔧 Debug orientation overlay – true = popup visible, false = jamais affiché
const DEBUG_ORIENTATION_OVERLAY = false;

// PROTECTION CRITIQUE : Ne JAMAIS exécuter app.js sur la page de sélection de langue
// Cette vérification doit être la première chose dans le fichier
(function() {
    try {
        const isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid && window.androidDebug) {
            window.androidDebug('APP.JS: Début vérification');
        }
        
        const currentPath = window.location.pathname || window.location.href || window.location.toString() || '';
        
        if (isAndroid && window.androidDebug) {
            window.androidDebug('APP.JS: currentPath=' + currentPath);
        }
        
        if (currentPath.includes('language-selection.html') || 
            currentPath.includes('language-selection') ||
            currentPath.includes('/language-selection')) {
            // Si on est sur la page de sélection de langue, ne rien faire
            // Empêcher toute exécution ultérieure
            window.__APP_JS_DISABLED__ = true;
            if (isAndroid && window.androidDebug) {
                window.androidDebug('APP.JS: DÉSACTIVÉ (page language-selection)');
            }
            return;
        }
        
        if (isAndroid && window.androidDebug) {
            window.androidDebug('APP.JS: Activé (pas sur language-selection)');
        }
    } catch (e) {
        // En cas d'erreur, ne pas continuer
        window.__APP_JS_DISABLED__ = true;
        const isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid && window.androidDebug) {
            window.androidDebug('APP.JS: ERREUR - ' + e.message);
        }
        return;
    }
})();

// Si app.js est désactivé, ne pas continuer
if (window.__APP_JS_DISABLED__) {
    // Ne rien faire, laisser la page de sélection de langue s'afficher normalement
} else {
    // Code normal de app.js
}

let nextButton, prevButton, homeButton, cultureButton, audioBtn, poiInterestBtn, doudouBtn, pauseBtn, stopBtn, restartBtn;
let activeQuizContainer = null;
let splashAlreadyHidden = false;
let distanceStack = [];  // Stack des distances
let isReturning = false; // Pour savoir si c'est un retour (Previous)
let hasGuidanceStarted = false; // Pour éviter les répétitions du guidage
let mapInitialized = false;
let initializationInProgress = false;
let isUpdating = false;
let score = 0;
let quizEnabled = false;
let map;
let markers = [];
let directionsService;
let directionsRenderer;
let currentIndex = 0;

// Verrouillage du bouton "suivant" : on exige l'écoute de l'audio du point courant
function syncNextButtonState() {
    try {
        if (!nextButton) return;
        // En fin de parcours / mode musée, on laisse les fonctions existantes gérer
        if (localStorage.getItem('tourCompleted') === 'true') {
            nextButton.disabled = true;
            return;
        }
        const audioIdx = localStorage.getItem('mons_audio_clicked_index');
        nextButton.disabled = String(audioIdx) !== String(currentIndex);
    } catch (_) {
        if (nextButton) nextButton.disabled = true;
    }
}
let completedQuizQuestions = (() => {
    const saved = localStorage.getItem("mons_completedQuizQuestions");
    // Si on n'a pas de circuit sélectionné, c'est un nouveau parcours, donc on réinitialise
    const selectedCircuit = localStorage.getItem('selectedCircuit');
    if (!selectedCircuit) {
        return {};
    }
    return saved ? JSON.parse(saved) : {};
})();

console.log('[DEBUG] app.js chargé sur', window.location.href);


// === Config API (via api-base.js) ===
const API_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
  localStorage.getItem('api_base') ||
  window.location.origin.replace(':5173', ':8080');


// === Helpers stockage ===
function getToken() {
  return localStorage.getItem('jwt') || '';
}
function setToken(t) {
  localStorage.setItem('jwt', t);
}
function clearToken() {
  localStorage.removeItem('jwt');
}

// === Gestion deviceId (1 par appareil) ===
function getOrCreateDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || ('DEV-' + Math.random().toString(36).slice(2));
    localStorage.setItem('deviceId', id);
  }
  return id;
}

// === Appel d'activation ===
async function activateLicense(code) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetchApi('/api/auth/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: String(code).trim(), deviceId })
  });

  if (!res.ok) {
    // On remonte le message d'erreur JSON du serveur
    let err = 'activation_failed';
    try { const j = await res.json(); err = j.error || err; } catch {}
    throw new Error(err);
  }

  const data = await res.json();
  // data.token = JWT ; data.entitlements = { plan, city_slug, features, valid_until }
  setToken(data.token);
  // Optionnel: stocker aussi les droits si tu veux y accéder vite côté front
  localStorage.setItem('entitlements', JSON.stringify(data.entitlements));
  return data;
}

// === Test rapide du token (appelle une route protégée) ===
async function probeToken() {
  const token = getToken();
  if (!token) return null;
  const res = await fetchApi('/api/content/plain', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) return null;
  return res.json();
}

// === Brancher le formulaire ===
async function attachActivationForm() {
  const form = document.getElementById('activation-form');
  const input = document.getElementById('code-input');
  const msg = document.getElementById('activation-msg');
  if (!form || !input) return; // le bloc n'est pas sur cette page

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = 'Activation en cours...';
    try {
      const code = input.value;
      const res = await activateLicense(code);
      msg.style.color = 'green';
      msg.textContent = 'Activation réussie ✅';
      // Ici, tu peux rediriger ou charger le contenu chiffré
      // location.href = 'main.html';
    } catch (err) {
      msg.style.color = 'crimson';
      msg.textContent = 'Erreur: ' + err.message;
    }
  });
}

// === Au chargement de la page ===
window.addEventListener('DOMContentLoaded', async () => {
  // Si un token existe déjà, on peut cacher le bloc d'activation (optionnel)
  const probe = await probeToken();
  if (probe) {
    const section = document.getElementById('activation');
    if (section) section.style.display = 'none';
    // Tu peux charger directement le contenu chiffré ici si tu veux
  }
  await attachActivationForm();
});


// Fonction pour calculer le nombre total de questions posées (complétées)
function getTotalQuestionsAsked() {
    let total = 0;
    for (const pointName in completedQuizQuestions) {
        if (completedQuizQuestions[pointName]) {
            total += 3; // Chaque point a 3 questions
        }
    }
    return total;
}

// Variable pour tracker si un quiz est en cours
let currentQuizInProgress = false;

// Fonction pour calculer le score maximum basé sur le nombre de questions posées
function getMaxScoreBasedOnQuestions() {
    let totalQuestions = getTotalQuestionsAsked();
    
    // Si un quiz est en cours, ajouter 3 questions au total
    if (currentQuizInProgress) {
        totalQuestions += 3;
    }
    
    // Si aucune question n'a été posée encore et aucun quiz en cours, retourner 0
    return totalQuestions * 10;
}

let currentAudio = null;
let currentDescriptionText = ""; // Variable pour mémoriser le texte de la description
let isDoudouSongPlaying = false; // Pour savoir si c'est la chanson du Doudou
let steps = [];
let currentStepIndex = 0;
let watchId = null;
let gpsHeading = null; // Heading basé sur le mouvement GPS (plus fiable que le magnétomètre sur Android)
let smoothedAndroidHeading = null; // Heading lissé pour Android (éviter les sauts)
let magnetometerOffset = null; // Offset calibré entre magnétomètre et GPS (pour fusion hybride)
let lastGPSCalibrationTime = 0; // Timestamp de la dernière calibration GPS

// ANDROID : État hybride avec hystérésis
let androidMode = 'STATIONARY'; // 'MOVING' ou 'STATIONARY'
let movingVotes = 0;
let stillVotes = 0;
let bearingTarget = 0; // Cap cible
let bearingSmoothed = 0; // Cap lissé pour affichage
let lastMapUpdateTime = 0; // Timestamp dernière update carte
let headingWindow = []; // Fenêtre glissante pour médiane
let androidStablePosition = null;
let androidStablePositionAt = 0;
const ANDROID_GPS_MAX_ACCURACY_M = 65;
const ANDROID_GPS_MIN_MOVE_M = 3;
const ANDROID_GPS_MIN_JUMP_M = 35;
const ANDROID_GPS_MAX_WALK_SPEED_MPS = 3.2;
const ANDROID_MAP_HEADING_OFFSET_DEG = 90;
let totalDistance = 0; // distance totale parcourue (en mètres)
let currentPointDistance = ''; // distance au point actuel (texte formaté)
let currentPointDuration = ''; // durée au point actuel (texte formaté)
let userPositionMarker = null; // Marqueur pour la position de l'utilisateur
let routeMarkers = []; // Pour stocker les marqueurs de départ/arrivée
let lastRouteCalculationPos = null; // Dernière position utilisée pour le calcul de route
let lastRouteCalculationTime = 0; // Timestamp du dernier calcul de route
let distanceAlreadyAddedForCurrentPoint = false; // Flag pour éviter d'ajouter la distance plusieurs fois
let androidPoiBearingSmoothed = null;   // POI vers le haut (bearing lissé)
let androidHeadingSmoothed = null;      // Direction de marche lissée


// Flag pour éviter le double calcul/affichage en mode musée
let museumRouteAlreadyCalculated = false;
// Flag pour éviter le double guidage vocal musée
let museumGuidanceStarted = false;
let firstInstructionGiven = false;

let mapLoadInitiated = false;
let geoPermissionRequested = false; // Pour éviter les redemandes d'autorisation
let orientationPermissionRequested = false; // Pour éviter les redemandes d'autorisation d'orientation

// Synchroniser la variable de session avec le localStorage
if (localStorage.getItem('geoPermissionGranted') === 'true') {
    geoPermissionRequested = true;
}

/** Android uniquement — ne modifie pas la détection iOS. */
function isAndroidDevice() {
    return /android/i.test(navigator.userAgent || "");
}

function androidVerifyGeoPermission(callback) {
    if (!isAndroidDevice()) {
        callback(true);
        return;
    }
    if (!navigator.permissions || !navigator.permissions.query) {
        callback(localStorage.getItem("geoPermissionGranted") === "true");
        return;
    }
    navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
            if (status.state === "granted") {
                localStorage.setItem("geoPermissionGranted", "true");
                callback(true);
            } else {
                try {
                    localStorage.removeItem("geoPermissionGranted");
                } catch (_) {}
                callback(false);
            }
        })
        .catch(() =>
            callback(localStorage.getItem("geoPermissionGranted") === "true")
        );
}

function requestMainGeolocationWithGesture(successCallback, errorCallback, options) {
    const opts =
        options || { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
    if (!isAndroidDevice()) {
        navigator.geolocation.getCurrentPosition(
            successCallback,
            errorCallback,
            opts
        );
        return;
    }
    window.clqOnMainGeoActivated = function (position) {
        if (typeof window.clqHideMainGeoPrompt === "function") {
            window.clqHideMainGeoPrompt();
        }
        if (successCallback) successCallback(position);
    };
    window.clqOnMainGeoFailed = function () {
        if (errorCallback) errorCallback(new Error("PERMISSION_DENIED"));
    };
    if (typeof window.clqResetGeoWrapperState === "function") {
        window.clqResetGeoWrapperState();
    }
    if (typeof window.clqShowMainGeoPrompt === "function") {
        window.clqShowMainGeoPrompt();
    } else {
        navigator.geolocation.getCurrentPosition(
            successCallback,
            errorCallback,
            opts
        );
    }
}

function beginMainGeolocationFlow() {
    const geoOpts = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
    };
    const onSuccess = (position) => {
        if (isAndroidDevice() && position && position.coords) {
            const pos = getFilteredAndroidPosition(position);
            if (!pos) {
                if (typeof startPoint !== 'undefined' && startPoint) {
                    calculateRouteFromPosition(startPoint, 'Point de départ');
                }
                setTimeout(() => updateLocation(), 500);
                return;
            }
            updateUserMarker(pos);
            resetAndroidMapAndMarkerForGoogleGuidance();
            applyMapViewForGuidance(pos);
            calculateRouteFromPosition(pos, "Votre position");
        }
        setTimeout(() => updateLocation(), 500);
    };
    const onError = () => {
        const display = document.getElementById("location-name");
        if (display) {
            display.textContent =
                "Géolocalisation impossible. Affichage depuis le point de départ.";
        }
        calculateRouteFromPosition(startPoint, "Point de départ");
    };
    geoPermissionRequested = false;
    if (isAndroidDevice()) {
        requestMainGeolocationWithGesture(onSuccess, onError, geoOpts);
    } else {
        getUserPosition(onSuccess, onError, geoOpts);
    }
}

// --- Détection et redirection PWA ---
// Vérifier si l'app est installée et forcer le point d'entrée sur index.html
function checkPWAEntryPoint() {
    // DÉSACTIVÉ - Cette fonction causait des redirections en boucle
    // La logique de redirection PWA est maintenant gérée dans index.html
    return false;
}

// Exécuter la vérification immédiatement
const pwaRedirected = checkPWAEntryPoint();

// Splashscreen : gestion du titre différé
window.splashTitleShown = false;
window.splashTitleMinTime = 6000; // 3s avant + 3s avec le titre

function showSplashTitle() {
  // Vérifier si on est sur index.html (page avec splashscreen)
  const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname.endsWith('/') || 
                       window.location.pathname === '';
  
  if (!isOnIndexPage) {
    return;
  }
  
  const splashTitle = document.getElementById('splash-title');
  if (splashTitle) {
    splashTitle.style.display = '';
    window.splashTitleShown = true;
    window.splashTitleShownAt = Date.now();
  } else {
  }
}

// --- Initialisation à la fin du chargement du DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // PROTECTION CRITIQUE : Ne JAMAIS exécuter si app.js est désactivé
    if (window.__APP_JS_DISABLED__) {
        return;
    }
    
    // Vérification supplémentaire de la page de sélection de langue
    try {
        const currentPath = window.location.pathname || window.location.href || window.location.toString() || '';
        if (currentPath.includes('language-selection.html') || 
            currentPath.includes('language-selection') ||
            currentPath.includes('/language-selection')) {
            window.__APP_JS_DISABLED__ = true;
            return;
        }
    } catch (e) {
        return;
    }
    
    // Si une redirection PWA a eu lieu, ne pas initialiser l'app
    if (pwaRedirected) {
        return;
    }
    
    // Vérifier si on est sur index.html (page avec splashscreen)
    const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                         window.location.pathname.endsWith('/') || 
                         window.location.pathname === '';
    
    // NE PAS initialiser l'app sur index.html car elle a son propre splashscreen
    if (isOnIndexPage) {
        return;
    }
    
    // Réinitialiser les flags de session au démarrage de l'application
    mapLoadInitiated = false;
    geoPermissionRequested = false;
    orientationPermissionRequested = false;
    
    // Initialiser l'application avec le chargement des descriptions multilingues
    try {
        initApp();
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de l\'app:', error);
    }

});



let startPoint = { name: "Grand-place", lat: 50.4546, lng: 3.9524, audio: "audio/grandplace.mp3" };


const storedCircuit = localStorage.getItem('selectedCircuit');
const storedCircuitStart = localStorage.getItem('selectedCircuitStart');
const storedResolvedCircuit = localStorage.getItem('selectedCircuitResolved');

const currentPath = (window.location && window.location.pathname ? window.location.pathname : '').toLowerCase();
const isMainPage = currentPath.endsWith('/main.html') || currentPath.endsWith('main.html');

let shouldForceCircuitSelection = false;

if (isMainPage) {
  const hasUserCircuitSelection = Boolean(
    storedCircuit &&
    storedCircuitStart &&
    storedResolvedCircuit &&
    typeof circuits !== 'undefined' &&
    circuits[storedResolvedCircuit]
  );

  if (!hasUserCircuitSelection) {
    shouldForceCircuitSelection = true;
    const langForRedirect = localStorage.getItem('selectedLanguage') || localStorage.getItem('lang') || '';
    const targetUrl = langForRedirect
      ? `parcours.html?lang=${encodeURIComponent(langForRedirect)}`
      : 'parcours.html';

    window.location.replace(targetUrl);
  }
}

const selectedCircuit = storedCircuit || 'grand';
const selectedCircuitStart = storedCircuitStart || 'grand_place';
const resolvedCircuitFromStorage = storedResolvedCircuit;

function resolveActiveCircuitKey(baseCircuit, startPoint, storedVariant) {
  if (startPoint === 'gare') {
    const variantKey = `${baseCircuit}_gare`;
    if (circuits[variantKey]) {
      return variantKey;
    }
  }

  if (storedVariant && circuits[storedVariant]) {
    return storedVariant;
  }

  if (circuits[baseCircuit]) {
    return baseCircuit;
  }

  const availableKeys = Object.keys(circuits || {});
  if (availableKeys.length > 0) {
    return availableKeys.includes('grand') ? 'grand' : availableKeys[0];
  }

  throw new Error('Aucun circuit disponible pour initialiser le parcours.');
}

const activeCircuitKey = resolveActiveCircuitKey(selectedCircuit, selectedCircuitStart, resolvedCircuitFromStorage);

if (!shouldForceCircuitSelection && activeCircuitKey && circuits[activeCircuitKey]) {
  localStorage.setItem('selectedCircuitResolved', activeCircuitKey);
}

const filteredLocations = circuits[activeCircuitKey].map(i => locations[i - 1]);

if (filteredLocations.length > 0) {
  startPoint = filteredLocations[0];
}

function normalizeFileName(name) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // retire les accents
        .replace(/[^\w\s-]/g, "")        // retire les caractères spéciaux
        .replace(/\s+/g, "_")            // remplace les espaces par _
        .toLowerCase();
}

function stopAllAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    // Vider le texte mémorisé
    currentDescriptionText = "";
    isDoudouSongPlaying = false; // Réinitialiser le flag

    const imageElement = document.getElementById("point-image");
    const textContainer = document.getElementById("media-display");

    if (imageElement && textContainer) {
        imageElement.style.display = "block";
        textContainer.style.display = "none";
        textContainer.innerText = "";
    }

    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
}

// --- Gestionnaire de descriptions multilingues ---
let descriptionsData = null;

// Fonction pour charger les descriptions multilingues
async function loadDescriptions() {
    try {
        const response = await fetch('translations/descriptions.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        descriptionsData = await response.json();
    } catch (error) {
        console.error('❌ Erreur lors du chargement des descriptions:', error);
        descriptionsData = null;
    }
}

// Fonction pour obtenir la description selon la langue
function getDescription(locationName, language = null) {
    if (!descriptionsData) {
        console.warn('⚠️ Descriptions non chargées, utilisation du fichier texte');
        return null; // Retourner null pour utiliser l'ancien système
    }
    
    const lang = language || (window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr');
    const description = descriptionsData[lang]?.[locationName];
    
    if (description) {
        return description;
    } else {
        console.warn(`⚠️ Aucune description trouvée pour ${locationName} en ${lang}`);
        return null;
    }
}

// Fonction pour obtenir le chemin audio selon la langue
function getAudioPath(baseAudioPath, language = null) {
    const lang = language || (window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr');
    
    // L'air du doudou ne change pas selon la langue (élément folklorique)
    if (baseAudioPath === "Chansons/air_doudou.mp3") {
        return "Chansons/air_doudou_fr.mp3";
    }
    
    // Extraire le nom du fichier sans extension
    const pathParts = baseAudioPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace('.mp3', '');
    
    // Construire le nouveau chemin avec le suffixe de langue
    const newFileName = `${nameWithoutExt}_${lang}.mp3`;
    const newPath = pathParts.slice(0, -1).join('/') + '/' + newFileName;
    
    return newPath;
}

// --- Modification de la fonction playExclusiveAudio pour supporter le multilingue ---
function playExclusiveAudio(src, textFile = null, imageElement = null, originalImageSrc = null) {
    const textContainer = document.getElementById("media-display");

    // Si un audio est déjà en cours, on l'arrête et on réaffiche la photo
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;

        // Ne pas modifier l'affichage si c'est l'air du doudou
        if (src !== "Chansons/air_doudou.mp3") {
            if (imageElement && originalImageSrc) {
                imageElement.src = originalImageSrc;
                imageElement.style.display = "block";
            }
            if (textContainer) {
                textContainer.style.display = "none";
                textContainer.innerText = "";
            }
        }
    }

    // Obtenir le chemin audio selon la langue
    const audioPath = getAudioPath(src);
    
    // Sauvegarder la position actuelle si l'audio existe déjà et est en pause
    let savedCurrentTime = 0;
    if (currentAudio && currentAudio.paused && currentAudio.src && currentAudio.readyState > 0) {
        savedCurrentTime = currentAudio.currentTime;
    }
    
    currentAudio = new Audio(audioPath);
    
    // Restaurer la position si on reprend une lecture en pause
    if (savedCurrentTime > 0) {
        // Attendre que l'audio soit chargé avant de restaurer la position
        currentAudio.addEventListener('loadedmetadata', () => {
            if (savedCurrentTime > 0 && savedCurrentTime < currentAudio.duration) {
                currentAudio.currentTime = savedCurrentTime;
            }
        }, { once: true });
    }
    
    // Gestion d'erreur si le fichier audio n'existe pas
    currentAudio.addEventListener('error', (e) => {
        console.warn(`⚠️ Fichier audio ${audioPath} non trouvé, utilisation du fichier original`);
        currentAudio = new Audio(src); // Utiliser le fichier original
        if (savedCurrentTime > 0) {
            currentAudio.addEventListener('loadedmetadata', () => {
                if (savedCurrentTime > 0 && savedCurrentTime < currentAudio.duration) {
                    currentAudio.currentTime = savedCurrentTime;
                }
            }, { once: true });
        }
        currentAudio.play();
    });
    
    currentAudio.play();

    // Mettre à jour le bouton play/pause
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.textContent = "⏸️";
    }

    // Ajouter les événements pour gérer la fin de l'audio
    currentAudio.addEventListener('ended', () => {
        currentAudio = null;
        if (textContainer) {
            textContainer.scrollTop = 0;
        }
        // Mettre à jour le bouton play/pause
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = "▶️";
        }
        // Ne pas modifier l'affichage si c'était l'air du doudou
        if (src !== "Chansons/air_doudou.mp3") {
            const imageElement = document.getElementById("point-image");
            if (imageElement && textContainer) {
                imageElement.style.display = "block";
                textContainer.style.display = "none";
            }
        }
        
        // Enchaîner avec le fichier "continue" si ce n'est pas le dernier point et si ce n'est pas l'air du doudou
        if (src !== "Chansons/air_doudou.mp3" && currentIndex < filteredLocations.length - 1) {
            // Obtenir la langue actuelle
            const currentLang = window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr';
            const continueAudioPath = `audio/continue_${currentLang}.mp3`;
            
            
            // Créer et jouer l'audio "continue"
            const continueAudio = new Audio(continueAudioPath);
            continueAudio.addEventListener('error', (e) => {
                console.warn(`⚠️ Fichier continue ${continueAudioPath} non trouvé`);
            });
            continueAudio.play();
        }
    });

    // Ne pas modifier l'affichage si c'est l'air du doudou
    if (textFile && imageElement && textContainer && src !== "Chansons/air_doudou.mp3") {
        // Essayer d'abord de charger la description depuis le JSON multilingue
        const currentLocation = filteredLocations[currentIndex];
        if (currentLocation) {
            const description = getDescription(currentLocation.name);
            if (description) {
                // Utiliser la description du JSON
                currentDescriptionText = description;
                textContainer.innerText = description;
                imageElement.style.display = "none";
                textContainer.style.display = "block";
                return;
            }
        }
        
        // Fallback : utiliser l'ancien système avec les fichiers .txt
        fetch(textFile)
            .then(response => response.text())
            .then(text => {
                currentDescriptionText = text;
                textContainer.innerText = text;
                imageElement.style.display = "none";
                textContainer.style.display = "block";
            })
            .catch(err => console.error("Erreur de chargement texte :", err));
    }
}

// Modifier hideSplashScreen pour attendre 6s si besoin
function hideSplashScreen() {
    // Vérifier si on est sur index.html (page avec splashscreen)
    const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                         window.location.pathname.endsWith('/') || 
                         window.location.pathname === '';
    
    if (!isOnIndexPage) {
        return;
    }
    
    const splash = document.getElementById('splash-screen');
    if (!splash) {
        return;
    }
    
    splash.style.transition = 'opacity 0.5s ease';
    splash.style.opacity = '0';
    setTimeout(() => {
        splash.style.display = 'none';
    }, 500);
}

function loadGoogleMaps(callback) {
    // Si la carte est déjà chargée, on exécute le callback et on sort
    if (window.google && window.google.maps) {
        if(callback) callback();
        return;
    }

    // Si le chargement a déjà été lancé, on ne fait rien pour éviter les doublons
    if(mapLoadInitiated) return;
    mapLoadInitiated = true;
    
    // Le reste de la fonction de chargement...
    const handleMapError = () => {
        console.error("Erreur de chargement de Google Maps.");
        // Cacher le splash screen même en cas d'erreur (seulement si on est sur index.html)
        hideSplashScreen();
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: #666;"><h3>Carte non disponible</h3><p>Vérifiez votre connexion.</p></div>`;
        }
        updateDisplayFallback();
    };

    const mapLoadTimeout = setTimeout(handleMapError, 8000);

    window.initMap = function () {
        clearTimeout(mapLoadTimeout);
        if (callback) {
            callback();
        }
    };

    // Récupérer la clé API depuis la variable globale (injectée par api-key.js)
    const apiKey = window.__GOOGLE_MAPS_API_KEY__;
    
    if (apiKey && apiKey.match(/AIza[A-Za-z0-9_-]+/)) {
        // Clé disponible depuis api-key.js (production)
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=geometry,places`;
        script.async = true;
        script.onerror = handleMapError;
        document.head.appendChild(script);
    } else {
        // Fallback : essayer de charger depuis le fichier (développement uniquement)
        fetch('Clé API.txt')
            .then(response => response.text())
            .then(apiKeyText => {
                const match = apiKeyText.match(/AIza[A-Za-z0-9_-]+/);
                if (!match) throw new Error('Clé API invalide');
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${match[0]}&callback=initMap&libraries=geometry,places`;
                script.async = true;
                script.onerror = handleMapError;
                document.head.appendChild(script);
            })
            .catch(handleMapError);
    }
}

// --- Transports en commun ---
function buildTransitUrl(originLat, originLng, destLat, destLng) {
  return `https://www.google.com/maps/dir/?api=1` +
    `&origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&travelmode=transit`;
}

function buildDestinationOnlyUrl(destLat, destLng) {
  return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
}

function setupTransitButton(locationsList, getIndexFn) {
  const transitBtn = document.getElementById("transit-btn");
  const modal = document.getElementById("transit-modal");
  const titleEl = document.getElementById("transit-title");
  const statusEl = document.getElementById("transit-status");
  const linkEl = document.getElementById("transit-link");
  const closeBtn = document.getElementById("transit-close");

  if (!transitBtn || !modal || !statusEl || !linkEl || !closeBtn) return;

  const tm = window.translationManager;
  const t = (key, fallback) => (tm && tm.isLoaded ? tm.translate(key) : fallback);

  if (titleEl) titleEl.textContent = t('transit_title', 'Itinéraire en train / tram / bus');
  transitBtn.textContent = '🚋';
  linkEl.textContent = t('transit_open_maps', 'Ouvrir dans Google Maps');
  closeBtn.textContent = t('transit_close', 'Fermer');

  const openModal = () => {
    modal.classList.add("transit-visible");
    modal.classList.remove("transit-hidden");
  };
  const closeModal = () => {
    modal.classList.remove("transit-visible");
    modal.classList.add("transit-hidden");
  };

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  transitBtn.addEventListener("click", () => {
    const idx = typeof getIndexFn === 'function' ? getIndexFn() : 0;
    const poi = locationsList && locationsList[idx];
    if (!poi) return;

    const destLat = poi.lat;
    const destLng = poi.lng;

    openModal();
    statusEl.textContent = t('transit_status_preparing', 'Récupération de ta position…');
    linkEl.href = buildDestinationOnlyUrl(destLat, destLng);
    linkEl.classList.remove("transit-disabled");

    if (!navigator.geolocation) {
      statusEl.textContent = t('transit_status_geo_unavailable', 'Géolocalisation indisponible. Lien désactivé.');
      linkEl.href = "#";
      linkEl.classList.add("transit-disabled");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const originLat = pos.coords.latitude;
        const originLng = pos.coords.longitude;
        const url = buildTransitUrl(originLat, originLng, destLat, destLng);
        linkEl.href = url;
        linkEl.classList.remove("transit-disabled");
        statusEl.textContent = t('transit_status_ready', 'Itinéraire prêt (train/tram/bus).');
      },
      () => {
        statusEl.textContent = t('transit_status_geo_fail', 'Impossible d\'obtenir ta position. Lien désactivé.');
        linkEl.href = "#";
        linkEl.classList.add("transit-disabled");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  });
}

function setupUberButton(locationsList, getIndexFn) {
  const uberBtn = document.getElementById("uber-btn");
  if (!uberBtn) return;
  const tm = window.translationManager;
  const t = (key, fallback) => (tm && tm.isLoaded ? tm.translate(key) : fallback);
  uberBtn.textContent = t('transit_open_uber', 'Uber');

  uberBtn.addEventListener('click', () => {
    const idx = typeof getIndexFn === 'function' ? getIndexFn() : 0;
    const poi = locationsList && locationsList[idx];
    if (!poi) return;
    openUberDeepLink(poi.lat, poi.lng, poi.name || 'Destination');
  });
}

function openUberDeepLink(lat, lng, name) {
  const encodedName = encodeURIComponent(name);
  const latStr = encodeURIComponent(String(lat));
  const lngStr = encodeURIComponent(String(lng));
  // Crochets en %5B %5D : certains parseurs (Safari) rejettent uber://… avec dropoff[…] dans l’URL.
  // On n’utilise plus uber:// : sans app installée, Safari affiche « l’adresse n’est pas valide ».
  // Le lien universel https://m.uber.com/ul/ ouvre l’app si présente, sinon le flux web.
  const q =
    `action=setPickup` +
    `&pickup=my_location` +
    `&dropoff%5Blatitude%5D=${latStr}` +
    `&dropoff%5Blongitude%5D=${lngStr}` +
    `&dropoff%5Bnickname%5D=${encodedName}` +
    `&dropoff%5Bformatted_address%5D=${encodedName}`;
  const url = `https://m.uber.com/ul/?${q}`;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = url;
  }
}

function startMap() {
    // Vérifier si la carte est déjà initialisée et si on revient sur la page
    const wasInitialized = localStorage.getItem('mapInitialized') === 'true';
    
    if (initializationInProgress) {
        return;
    }
    
    if (mapInitialized && wasInitialized) {
        // Cacher le splash screen car la carte est déjà prête
        hideSplashScreen();
        // Restaurer l'état sans réinitialiser la carte
        if (!window.mainLogicInitialized) {
            initializeMainLogic();
            window.mainLogicInitialized = true;
        }
        return;
    }
    
    initializationInProgress = true;

    loadGoogleMaps(() => {
        // Le callback est simple : on initialise la carte et on met à jour l'affichage.
        // PAS d'appel récursif ici.
        
        const mapOptions = {
            zoom: 16,
            center: { lat: 50.4543, lng: 3.9526 },
            mapTypeId: 'roadmap', // Vue classique avec routes
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            rotateControl: true, // Activer le contrôle de rotation
            // Options pour le guidage par rotation
            heading: 0, // Rotation initiale de la carte
            tilt: 0, // Vue de dessus (0 = 2D, 45 = 3D)
            renderingType: google.maps.RenderingType ? google.maps.RenderingType.VECTOR : undefined,
            // Options pour le centrage automatique
            gestureHandling: 'cooperative', // Permet le centrage automatique
            // Désactiver le zoom automatique pour éviter les conflits
            zoomControl: true,
            // Options pour améliorer les performances
            disableDefaultUI: false,
            // Marquer que l'utilisateur n'a pas encore déplacé la carte manuellement
            userHasPanned: false
        };
        
        map = new google.maps.Map(document.getElementById('map'), mapOptions);
        
        // Initialiser les services de directions
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            preserveViewport: true, // Ne pas recentrer automatiquement la carte à chaque mise à jour de route
            polylineOptions: {
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 6
            }
        });
        
        // Écouter les événements de déplacement manuel de la carte
        map.addListener('dragstart', () => {
            map.set('userHasPanned', true);
        });
        
        map.addListener('dragend', () => {
            // Réactiver le centrage automatique après un délai
            setTimeout(() => {
                map.set('userHasPanned', false);
            }, 5000);
        });
        
        mapInitialized = true;
        localStorage.setItem('mapInitialized', 'true');
        initializationInProgress = false;
        
        // Cacher le splash screen maintenant que la carte est prête
        hideSplashScreen();
        
        // Initialiser la logique principale après l'initialisation de la carte
        if (!window.mainLogicInitialized) {
            initializeMainLogic();
            window.mainLogicInitialized = true;
        }
    });
}

// Fonction pour réinitialiser les permissions de géolocalisation
function resetGeoPermissions() {
    localStorage.removeItem('geoPermissionGranted');
    localStorage.removeItem('appLaunchedBefore');
    localStorage.removeItem('orientationPermissionGranted');
    localStorage.removeItem('compassGuidanceActive');
    geoPermissionRequested = false;
    orientationPermissionRequested = false;
    mapLoadInitiated = false;
}

// Fonction pour vérifier si la géolocalisation est autorisée
function isGeoLocationGranted() {
    return localStorage.getItem('geoPermissionGranted') === 'true';
}

const CLQ_TRANSIENT_POSITION_MAX_AGE_MS = 30 * 60 * 1000;
const CLQ_STORED_ARRAY_MAX_ITEMS = 200;

function pruneJsonArrayStorageKey(key, maxItems = CLQ_STORED_ARRAY_MAX_ITEMS) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const value = JSON.parse(raw);
        if (!Array.isArray(value)) {
            localStorage.removeItem(key);
            return;
        }
        if (value.length > maxItems) {
            localStorage.setItem(key, JSON.stringify(value.slice(-maxItems)));
        }
    } catch (e) {
        localStorage.removeItem(key);
    }
}

function prunePendingGeoPosition() {
    try {
        const raw = sessionStorage.getItem('clq_pending_geo_position');
        if (!raw) return;
        const value = JSON.parse(raw);
        const ts = typeof value.ts === 'number' ? value.ts : 0;
        if (!ts || Date.now() - ts > CLQ_TRANSIENT_POSITION_MAX_AGE_MS) {
            sessionStorage.removeItem('clq_pending_geo_position');
        }
    } catch (e) {
        sessionStorage.removeItem('clq_pending_geo_position');
    }
}

function pruneClqNavigationStorage() {
    prunePendingGeoPosition();
    pruneJsonArrayStorageKey('mons_visitedPoints');
    try {
        sessionStorage.removeItem('clq_main_geo_reset');
    } catch (e) {
        /* ignore */
    }
}

function releaseTransientMapResourcesForLeave() {
    pruneClqNavigationStorage();
    try {
        sessionStorage.setItem(
            'clq_guidance_was_active',
            watchId !== null || localStorage.getItem('geoPermissionGranted') === 'true' ? '1' : '0'
        );
    } catch (e) {
        /* ignore */
    }
    if (watchId !== null && navigator.geolocation) {
        try {
            navigator.geolocation.clearWatch(watchId);
        } catch (e) {
            /* ignore */
        }
        watchId = null;
    }
    try {
        routeMarkers.forEach((marker) => marker.setMap(null));
        routeMarkers = [];
        if (directionsRenderer) {
            directionsRenderer.setDirections({ routes: [] });
        }
    } catch (e) {
        /* ignore */
    }
    androidStablePosition = null;
    androidStablePositionAt = 0;
}

// (Suppression de la fonction startGuidance et de tout le guidage vocal)

function updateLocation() {

    // Gestion des flèches de guidage
    if (typeof initGuideArrows === 'function') {
        initGuideArrows();
    }

    // Mettre à jour l'image seulement en mode PARCOURS. En mode musée, l'image est déjà définie.
    if (localStorage.getItem('museumMode') !== 'true') {
        const imageElement = document.getElementById("point-image");
        if (imageElement) {
            const current = filteredLocations[currentIndex];
            if (current) {
                const imageFileName = normalizeFileName(current.name);
                const imagePath = `images/${imageFileName}.jpg`;
                imageElement.src = imagePath;
                imageElement.alt = current.name;
            }
        }
    }

    // Vérifier si on a déjà une position utilisateur
    let initialRouteCalculated = false;
    if (userPositionMarker) {
        const lastKnownPos = userPositionMarker.getPosition();
        if (lastKnownPos) {
            const pos = { lat: lastKnownPos.lat(), lng: lastKnownPos.lng() };
            calculateRouteFromPosition(pos, "Votre position");
            initialRouteCalculated = true;
        }
    }

    // Si c'est le premier lancement et qu'on n'a pas de route initiale, afficher un message d'attente
    if (!initialRouteCalculated) {
        const display = document.getElementById("location-name");
        if (display) {
            const calculating = window.translationManager ? window.translationManager.translate('calculating') : 'Calcul en cours...';
            display.textContent = calculating;
        }
    }

    // Suivre la position GPS en continu pour obtenir le heading basé sur le mouvement (comme Google Maps)
if (navigator.geolocation) {
    // Arrêter un éventuel watchPosition précédent
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            let pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            const isAndroidGPS = /android/i.test(navigator.userAgent);
            const speed   = position.coords.speed;
            const heading = position.coords.heading;

            if (isAndroidGPS) {
                // Hystérésis : seuils TRÈS bas pour réactivité maximale
                if (speed !== null && speed !== undefined) {
                    if (speed > 0.5) {        // ~2 km/h = marche lente
                        movingVotes++;
                        stillVotes = 0;
                    } else if (speed < 0.2) { // ~0.7 km/h = quasi-immobile
                        stillVotes++;
                        movingVotes = 0;
                    }

                    // Activation IMMÉDIATE (1 seul vote suffit)
                    if (movingVotes >= 1) {
                        androidMode = 'MOVING';
                    }
                    if (stillVotes >= 1) {
                        androidMode = 'STATIONARY';
                    }
                }

                if (heading !== null && heading !== undefined && !isNaN(heading)) {
                    // ✅ toujours normaliser / mettre à jour gpsHeading
                    gpsHeading = norm360(heading);

                    // En mode MOVING, on met aussi à jour bearingTarget
                    if (androidMode === 'MOVING') {
                        bearingTarget = gpsHeading;
                    }
                }
            } else {
                // iOS ou autre : comportement classique
                if (heading !== null && heading !== undefined && !isNaN(heading)) {
                    gpsHeading = norm360(heading);
                }
            }

            if (isAndroidGPS) {
                const filteredPos = getFilteredAndroidPosition(position);
                if (!filteredPos) {
                    if (!initialRouteCalculated && typeof startPoint !== 'undefined' && startPoint) {
                        calculateRouteFromPosition(startPoint, "Point de départ");
                    }
                    return;
                }
                pos = filteredPos;
            }

            updateUserMarker(pos);

            // ➜ Sur Android : carte POI vers le haut + flèche = direction de marche
            updateAndroidPoiUpGuidance();


            if (!initialRouteCalculated) {
                calculateRouteFromPosition(pos, "Votre position");
            } else {
                const now = Date.now();
                const shouldRecalculate =
                    !lastRouteCalculationPos ||
                    calculateDistanceBetweenPositions(lastRouteCalculationPos, pos) > 20 ||
                    (now - lastRouteCalculationTime) > 10000;

                if (shouldRecalculate) {
                    lastRouteCalculationPos = { lat: pos.lat, lng: pos.lng };
                    lastRouteCalculationTime = now;
                    calculateRouteFromPosition(pos, "Votre position");
                }
            }
        },
        (error) => {
            console.error("❌ Erreur watchPosition :", error);
            if (!initialRouteCalculated) {
                const display = document.getElementById("location-name");
                if (display) {
                    display.textContent = "Géolocalisation impossible. Affichage depuis le point de départ.";
                }
                calculateRouteFromPosition(startPoint, "Point de départ");
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

}

// --- Filtres pour stabiliser la boussole ---
let lastRawHeading = null;      // Dernière valeur brute du capteur (0–360)
let filteredHeading = null;     // Valeur lissée utilisée pour la carte/flèche
let lastHeadingUpdateTime = 0;  // Pour limiter la fréquence d'update

// Paramètres de filtrage
const HEADING_DEADBAND = 2;     // Ignore les variations < 3° (anti-tremblement)
const HEADING_MAX_STEP = 15;
const HEADING_SMOOTHING = 0.15; // 0.1–0.3 : plus grand = plus réactif mais moins stable
const HEADING_MIN_INTERVAL = 80; // ms entre deux updates (80–120ms conseillé)
const SMOOTHING_ALPHA = 0.2;    // 0.1 = très lisse, 0.3 = plus réactif

function angularDiff(target, current) {
    let diff = normalizeAngle(target) - normalizeAngle(current);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
}

function updateUserMarker(pos) {
    if (userPositionMarker) {
        userPositionMarker.setPosition(pos);
        
        // Restaurer la rotation de la flèche si la boussole est active
        if (isCompassActive) {
            const icon = userPositionMarker.getIcon();
            if (icon) {
                icon.rotation = currentArrowRotation;
                userPositionMarker.setIcon(icon);
            }
        }
        
        // Centrer la carte sur l'utilisateur et adapter le zoom (zoom 17 si proche du point, sinon 16)
        if (map) {
            const now = Date.now();
            if (!lastMapUpdateTime || (now - lastMapUpdateTime) > 3000) { // Maximum toutes les 3 secondes
                applyMapViewForGuidance(pos);
                lastMapUpdateTime = now;
            }
        }
    } else {
        userPositionMarker = new google.maps.Marker({
            position: pos,
            map: map,
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 7,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: 'white',
                rotation: 0 // Flèche toujours vers le haut
            },
            title: 'Votre position'
        });
        
        // Centrer la carte sur l'utilisateur et adapter le zoom selon la distance au point suivant
        if (map) {
            applyMapViewForGuidance(pos);
            lastMapUpdateTime = Date.now();
        }
    }
}

function calculateRouteFromPosition(pos, fromName = "Votre position") {
    let destination;
    if (localStorage.getItem('museumMode') === 'true') {
        try {
            const museum = JSON.parse(localStorage.getItem("museumData"));
            if (museum && museum.lat && museum.lng) {
                destination = museum;
            }
        } catch (e) {
            console.error("Erreur lors du calcul de l'itinéraire vers le musée:", e);
            return;
        }
    } else {
        destination = filteredLocations[currentIndex];
    }

    if (destination) {
        calculateRoute(pos, destination, fromName, destination.name);
    }
}

// Rayon en mètres en dessous duquel on zoome pour le guidage (points proches, ex. Grand-Place)
const GUIDANCE_ZOOM_RADIUS_M = 150;
const ZOOM_LEVEL_NEAR = 17;   // zoom quand distance <= 150 m (~100–150 m visibles)
const ZOOM_LEVEL_DEFAULT = 16;

// Centre la carte sur l'utilisateur et adapte le zoom selon la distance au point suivant
function applyMapViewForGuidance(userPos) {
    if (!map) return;
    if (map.get('userHasPanned')) {
        if (isAndroidDevice() && typeof map.panTo === 'function') {
            map.panTo(userPos);
        } else {
            map.setCenter(userPos);
        }
        return;
    }
    if (isAndroidDevice() && typeof map.panTo === 'function') {
        map.panTo(userPos);
    } else {
        map.setCenter(userPos);
    }
    let destination = null;
    if (localStorage.getItem('museumMode') === 'true') {
        try {
            const museum = JSON.parse(localStorage.getItem("museumData"));
            if (museum && museum.lat && museum.lng) destination = museum;
        } catch (e) { /* ignore */ }
    } else if (typeof filteredLocations !== 'undefined' && Array.isArray(filteredLocations) && currentIndex >= 0 && currentIndex < filteredLocations.length) {
        destination = filteredLocations[currentIndex];
    }
    if (destination) {
        const dist = calculateDistanceBetweenPositions(userPos, destination);
        const nextZoom = dist <= GUIDANCE_ZOOM_RADIUS_M ? ZOOM_LEVEL_NEAR : ZOOM_LEVEL_DEFAULT;
        if (map.getZoom && map.getZoom() !== nextZoom) {
            map.setZoom(nextZoom);
        }
    }
}

function getCurrentUserLatLng() {
    if (!userPositionMarker) return null;
    const p = userPositionMarker.getPosition();
    if (!p) return null;
    return { lat: p.lat(), lng: p.lng() };
}

function resetAndroidMapAndMarkerForGoogleGuidance(heading) {
    if (!isAndroidDevice()) return;
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        const gmStyle = mapDiv.querySelector('.gm-style');
        if (gmStyle) {
            gmStyle.style.transform = '';
            gmStyle.style.transformOrigin = '';
            gmStyle.style.transition = '';
        }
    }
    const headingValue = typeof heading === 'number' && !isNaN(heading)
        ? norm360(heading + ANDROID_MAP_HEADING_OFFSET_DEG)
        : (typeof gpsHeading === 'number' && !isNaN(gpsHeading) ? norm360(gpsHeading + ANDROID_MAP_HEADING_OFFSET_DEG) : null);
    if (headingValue !== null && map && typeof map.setHeading === 'function') {
        androidHeadingSmoothed = androidHeadingSmoothed === null
            ? headingValue
            : emaAngle(androidHeadingSmoothed, headingValue, 0.55);
        try {
            if (typeof map.setTilt === 'function') map.setTilt(0);
            map.setHeading(androidHeadingSmoothed);
        } catch (e) {
            /* Google Maps raster fallback: heading may be ignored. */
        }
    }
    if (userPositionMarker && userPositionMarker.getIcon) {
        const icon = userPositionMarker.getIcon();
        if (icon && icon.rotation !== 0) {
            icon.rotation = 0;
            userPositionMarker.setIcon(icon);
        }
    }
    currentArrowRotation = 0;
}

// Fonction utilitaire pour calculer la distance entre deux positions (en mètres)
function calculateDistanceBetweenPositions(pos1, pos2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

function getFilteredAndroidPosition(position) {
    const raw = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    if (!isAndroidDevice()) return raw;

    const now = Date.now();
    const accuracy = typeof position.coords.accuracy === 'number'
        ? position.coords.accuracy
        : null;

    if (accuracy !== null && accuracy > ANDROID_GPS_MAX_ACCURACY_M) {
        return androidStablePosition;
    }

    if (!androidStablePosition) {
        androidStablePosition = raw;
        androidStablePositionAt = now;
        return raw;
    }

    const distance = calculateDistanceBetweenPositions(androidStablePosition, raw);
    const elapsedSeconds = Math.max((now - androidStablePositionAt) / 1000, 1);
    const impliedSpeed = distance / elapsedSeconds;
    const reportedSpeed = typeof position.coords.speed === 'number'
        ? position.coords.speed
        : null;
    const allowedJump = Math.max(
        ANDROID_GPS_MIN_JUMP_M,
        (accuracy || 20) * 2.5
    );

    if (
        distance > allowedJump &&
        impliedSpeed > ANDROID_GPS_MAX_WALK_SPEED_MPS &&
        (reportedSpeed === null || reportedSpeed < ANDROID_GPS_MAX_WALK_SPEED_MPS)
    ) {
        return androidStablePosition;
    }

    if (distance < ANDROID_GPS_MIN_MOVE_M) {
        return androidStablePosition;
    }

    const alpha = accuracy === null
        ? 0.35
        : accuracy <= 15
            ? 0.65
            : accuracy <= 35
                ? 0.4
                : 0.2;

    androidStablePosition = {
        lat: androidStablePosition.lat + (raw.lat - androidStablePosition.lat) * alpha,
        lng: androidStablePosition.lng + (raw.lng - androidStablePosition.lng) * alpha
    };
    androidStablePositionAt = now;
    return androidStablePosition;
}

function calculateRoute(from, to, fromName, toName) {
    // Éviter les calculs simultanés
    if (isUpdating) {
        return;
    }
    
    isUpdating = true;

    // Effacer les anciens marqueurs de route
    routeMarkers.forEach(marker => marker.setMap(null));
    routeMarkers = [];

    // Supprimer le rendu du trajet précédent
    if (directionsRenderer) {
        directionsRenderer.setDirections({routes: []});
    }

    const request = {
        origin: from,
        destination: to,
        travelMode: 'WALKING'
    };

    directionsService.route(request, (result, status) => {
        if (status == 'OK') {
            directionsRenderer.setDirections(result);

            // Créer uniquement le marqueur d'arrivée
            const leg = result.routes[0].legs[0];
            const destinationMarker = new google.maps.Marker({
                position: leg.end_location,
                map: map,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                },
                title: toName
            });
            routeMarkers.push(destinationMarker);

            // Mise à jour de l'affichage du texte
            const duration = leg.duration.text;
            const distance = leg.distance.text;
            const distanceValue = leg.distance.value;

            // Vérifier si les valeurs semblent correctes (pas les valeurs par défaut de Google Maps)
            const isDistanceReasonable = distanceValue > 10; // Plus de 10 mètres
            const isDurationReasonable = leg.duration.value > 10; // Plus de 10 secondes
            // Sauvegarder les valeurs de distance et durée dans des variables globales
            currentPointDistance = distance;
            currentPointDuration = duration;
            
            // Ajout de la logique de mise à jour du texte
            const isMuseumMode = localStorage.getItem("museumMode") === "true";
            if (!isMuseumMode) {
                // Ne pas ajouter la distance si elle a déjà été ajoutée pour ce point
                // La distance ne doit être ajoutée qu'une seule fois quand on arrive à un nouveau point
                if (currentIndex > 0 && !isReturning && !distanceAlreadyAddedForCurrentPoint) {
                    totalDistance += distanceValue;
                    distanceStack.push(distanceValue);
                    distanceAlreadyAddedForCurrentPoint = true;
                }
                isReturning = false;
                const totalKm = (totalDistance / 1000).toFixed(2);
                const display = document.getElementById('location-name');
                if (display) {
                    const isMuseumMode = localStorage.getItem("museumMode") === "true";
                    const selectedMuseum = localStorage.getItem("selectedMuseum");
                    
                    if (isMuseumMode && selectedMuseum) {
                        const museumTarget = window.translationManager ? window.translationManager.translate('museum_target') : '🎯 Musée :';
                        const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
                        const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
                        display.textContent = `${museumTarget} ${toName} – ${estimatedTime} ${formatDuration(duration)} – ${distanceLabel} ${distance}`;
                    } else {
                        const nextPoint = window.translationManager ? window.translationManager.translate('next_point') : 'Prochain point :';
                        const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
                        const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
                        const totalDistanceLabel = window.translationManager ? window.translationManager.translate('total_distance') : 'Distance totale :';
                        const scoreText = window.translationManager ? window.translationManager.translate('score') : 'Score :';
                        // Calculer le score maximum basé sur le nombre de questions posées
                        const maxScore = getMaxScoreBasedOnQuestions();
                        display.textContent = `${nextPoint} ${toName} – ${estimatedTime} ${formatDuration(duration)} – ${distanceLabel} ${distance} – ${totalDistanceLabel} ${totalKm} km – ${scoreText} ${score}/${maxScore}`;
                    }
                    display.style.opacity = "0.99";
                    void display.offsetHeight;
                    display.style.opacity = "1";
                }
            } else {
                const display = document.getElementById("location-name");
                if (display) {
                    display.textContent = `🎯 Musée : ${toName} – Temps estimé : ${formatDuration(duration)} – Distance : ${distance}`;
                }
            }
        } else {
            console.error("Erreur de calcul d'itinéraire : " + status);
        }
        isUpdating = false;
    });
}

function updateDisplayFallback() {
    const display = document.getElementById('location-name');
    if (!display) return;
    
    const geolocationImpossible = window.translationManager ? window.translationManager.translate('geolocation_impossible') : 'Géolocalisation impossible. Affichage depuis le point de départ.';
    display.textContent = geolocationImpossible;
}

function advanceToNextPoint() {
    // Réinitialiser le flag pour permettre l'ajout de la distance au nouveau point
    distanceAlreadyAddedForCurrentPoint = false;
    
    // Si on est à l'avant-dernier point et qu'on va vers le dernier point, afficher le popup
    if (currentIndex === filteredLocations.length - 2) {
        // Enregistrer le point actuel comme visité
        const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
        if (!visitedPoints.includes(currentIndex)) {
            visitedPoints.push(currentIndex);
            localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
        }
        
        // Afficher le popup de fin de parcours
        showEndOfTourPopup();
        
        // Afficher le bouton selfie
        const selfieBtn = document.getElementById('selfie-btn');
        if (selfieBtn) {
            selfieBtn.style.display = 'block';
        }
        
        // Avancer normalement vers le dernier point
        currentIndex++;
        steps = [];
        currentStepIndex = 0;
        localStorage.setItem("mons_currentIndex", currentIndex);
        localStorage.setItem("mons_score", score);
        updateLocation();
        syncNextButtonState();
        return; 
    }
    
    // Si on est au dernier point, ne rien faire (l'utilisateur peut utiliser le bouton selfie)
    if (currentIndex >= filteredLocations.length - 1) {
        return; 
    }
    
    
    if (currentIndex < filteredLocations.length - 1) {
        
        // Enregistrer le point actuel comme visité
        const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
        if (!visitedPoints.includes(currentIndex)) {
            visitedPoints.push(currentIndex);
            localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
        }
        
        currentIndex++;
        steps = [];
        currentStepIndex = 0;
        // Sauvegarde systématique de l'état
        localStorage.setItem("mons_currentIndex", currentIndex);
        localStorage.setItem("mons_score", score);
        updateLocation();
        syncNextButtonState();
    } else {
        alert("Vous avez atteint la fin du parcours !");
    }
}

// --- showHomeConfirmPopup ---
function showHomeConfirmPopup(onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = '#fffbe6';
    box.style.border = '4px solid #b8860b';
    box.style.borderRadius = '18px';
    box.style.boxShadow = '0 0 24px #0008';
    box.style.padding = '32px 24px 24px 24px';
    box.style.maxWidth = '400px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    const icon = document.createElement('div');
    icon.textContent = '⚔️🐉';
    icon.style.fontSize = '2em';
    icon.style.marginBottom = '16px';
    box.appendChild(icon);

    const title = document.createElement('div');
    const warningText = window.translationManager ? window.translationManager.translate('warning') : 'Avertissement !';
    title.textContent = warningText;
    title.style.fontWeight = 'bold';
    title.style.fontSize = '1.2em';
    title.style.marginBottom = '18px';
    box.appendChild(title);

    const msg = document.createElement('div');
    const resetWarningText = window.translationManager ? window.translationManager.translate('reset_warning') : "Cette action va vous ramener au choix du circuit et l'application va être <b>réinitialisée</b> !!!<br>Êtes-vous sûr ?";
    msg.innerHTML = resetWarningText;
    msg.style.marginBottom = '24px';
    box.appendChild(msg);

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'center';
    btns.style.gap = '18px';

    const btnYes = document.createElement('button');
    const yesResetText = window.translationManager ? window.translationManager.translate('yes_reset') : 'Oui, réinitialiser';
    btnYes.textContent = yesResetText;
    btnYes.style.background = '#2ecc40';
    btnYes.style.color = '#fff';
    btnYes.style.fontWeight = 'bold';
    btnYes.style.border = 'none';
    btnYes.style.borderRadius = '8px';
    btnYes.style.padding = '10px 18px';
    btnYes.style.fontSize = '1em';
    btnYes.style.cursor = 'pointer';
    btnYes.addEventListener('click', () => {
        document.body.removeChild(overlay);
        onConfirm();
    });

    const btnNo = document.createElement('button');
    const noCancelText = window.translationManager ? window.translationManager.translate('no_cancel') : 'Non, annuler';
    btnNo.textContent = noCancelText;
    btnNo.style.background = '#e74c3c';
    btnNo.style.color = '#fff';
    btnNo.style.fontWeight = 'bold';
    btnNo.style.border = 'none';
    btnNo.style.borderRadius = '8px';
    btnNo.style.padding = '10px 18px';
    btnNo.style.fontSize = '1em';
    btnNo.style.cursor = 'pointer';
    btnNo.addEventListener('click', () => {
        document.body.removeChild(overlay);
        onCancel();
    });

    btns.appendChild(btnYes);
    btns.appendChild(btnNo);
    box.appendChild(btns);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// === Fonction pour vérifier si l'app est installée (PWA) ===
function isAppInstalled() {
    const standaloneMatch = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = window.navigator && window.navigator.standalone === true;
    const pwaInstalledFlag = localStorage.getItem('pwa-installed') === 'true';
    return standaloneMatch || iosStandalone || pwaInstalledFlag;
}

// === Fonction pour normaliser le code d'activation ===
function normalizeShortCode(input) {
    const raw = String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!raw) return '';
    const nine = raw.slice(0, 9);
    return (nine.match(/.{1,3}/g) || [nine]).join('-');
}

// === Fonction pour vérifier la validité du code d'activation via l'API ===
async function validateActivationCode(code) {
    try {
        const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
                        localStorage.getItem('api_base') ||
                        window.location.origin.replace(':5173', ':8080');
        
        const normalizedCode = normalizeShortCode(code);
        if (!normalizedCode) {
            return { valid: false, error: 'invalid_format' };
        }

        const response = await fetch(`${API_BASE}/api/auth/activate-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ code: normalizedCode }),
            signal: AbortSignal.timeout(10000) // 10 secondes max
        });

        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            return { valid: false, error: 'parse_error' };
        }

        if (!response.ok || !data || !data.token) {
            const errorMsg = (data && (data.error || data.message)) || 'activation_failed';
            return { valid: false, error: errorMsg };
        }

        // Le code est valide, on peut mettre à jour le token
        localStorage.setItem('clq_token', data.token);
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('clq_has_access', '1');
        localStorage.setItem('clq_short_code', normalizedCode);

        // Déterminer la version
        let plan = 'lite';
        if (data.plan) {
            plan = String(data.plan).toLowerCase();
        } else if (data.entitlements && data.entitlements.plan) {
            plan = String(data.entitlements.plan).toLowerCase();
        }
        const userVersion = plan === 'lite' ? 'LITE' : 'FULL';
        localStorage.setItem('user_version', userVersion);

        return { valid: true, token: data.token };
    } catch (error) {
        console.error('Erreur lors de la validation du code:', error);
        return { valid: false, error: 'network_error' };
    }
}

// === Fonction pour afficher le popup de code invalide ===
function showInvalidCodePopup() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10001';

    const popup = document.createElement('div');
    popup.style.cssText = `
        background: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        padding: 24px 28px;
        max-width: min(420px, calc(100vw - 40px));
        width: 90%;
        text-align: center;
        box-shadow: 0 18px 45px rgba(20,54,92,0.35);
        border: 2px solid #14365c;
    `;

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.style.cssText = 'font-size: 1.45rem; font-weight: 700; margin-bottom: 18px; color: #14365c;';
    
    const titleText = window.translationManager && window.translationManager.isLoaded
        ? window.translationManager.translate('invalid_code_title') || 'Code d\'activation invalide'
        : 'Code d\'activation invalide';
    title.textContent = titleText;
    popup.appendChild(title);

    const message = document.createElement('p');
    message.style.cssText = 'margin: 0 0 20px; color: #666; font-size: 14px; line-height: 1.5;';
    const messageText = window.translationManager && window.translationManager.isLoaded
        ? window.translationManager.translate('invalid_code_message') || 'Votre code d\'activation n\'est plus valide. Veuillez vous rendre sur la page d\'activation pour entrer un nouveau code.'
        : 'Votre code d\'activation n\'est plus valide. Veuillez vous rendre sur la page d\'activation pour entrer un nouveau code.';
    message.textContent = messageText;
    popup.appendChild(message);

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 12px; justify-content: center; margin-top: 15px; flex-wrap: wrap;';

    const btnOk = document.createElement('button');
    btnOk.style.cssText = `
        background: #14365c;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 8px 18px rgba(20,54,92,0.25);
        padding: 14px 32px;
        font-size: 16px;
        cursor: pointer;
        flex: 1 1 120px;
    `;
    const btnText = window.translationManager && window.translationManager.isLoaded
        ? window.translationManager.translate('ok') || 'OK'
        : 'OK';
    btnOk.textContent = btnText;
    btnOk.addEventListener('click', () => {
        const currentLang = localStorage.getItem('selectedLanguage') || 'fr';
        window.location.href = `choose-access.html?lang=${encodeURIComponent(currentLang)}`;
    });

    actions.appendChild(btnOk);
    popup.appendChild(actions);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// === Fonction pour vérifier la validité d'un token ===
async function validateToken(token) {
    try {
        const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
                        localStorage.getItem('api_base') ||
                        window.location.origin.replace(':5173', ':8080');
        
        const response = await fetch(`${API_BASE}/api/auth/whoami`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'ngrok-skip-browser-warning': 'true'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return { valid: false, error: 'token_invalid' };
        }

        const data = await response.json();
        return { valid: true, data: data };
    } catch (error) {
        console.error('Erreur lors de la validation du token:', error);
        return { valid: false, error: 'network_error' };
    }
}

// === Fonction principale pour gérer la réinitialisation avec vérification du code ===
async function handleResetWithCodeCheck() {
    // Sauvegarder la langue avant de nettoyer
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'fr';
    const savedOrientationPerm = localStorage.getItem('orientationPermissionGranted');
    
    // Vérifier si l'app est installée
    const installed = isAppInstalled();
    
    if (installed) {
        // Vérifier si un code d'activation ou un token existe
        const shortCode = localStorage.getItem('clq_short_code');
        const token = localStorage.getItem('clq_token') || localStorage.getItem('jwt');
        
        if (shortCode || token) {
            // Nettoyer le localStorage sauf le code et la langue
            const keysToKeep = ['clq_short_code', 'clq_token', 'jwt', 'clq_has_access', 'user_version', 'selectedLanguage', 'pwa-installed'];
            const savedValues = {};
            keysToKeep.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) savedValues[key] = value;
            });
            
            localStorage.clear();
            
            // Restaurer les valeurs importantes
            Object.keys(savedValues).forEach(key => {
                localStorage.setItem(key, savedValues[key]);
            });
            
            if (savedOrientationPerm) {
                localStorage.setItem('orientationPermissionGranted', savedOrientationPerm);
            }
            
            // Essayer d'abord de valider le token s'il existe
            let isValid = false;
            if (token) {
                const tokenValidation = await validateToken(token);
                if (tokenValidation.valid) {
                    isValid = true;
                }
            }
            
            // Si le token n'est pas valide, essayer de valider/réactiver avec le code
            if (!isValid && shortCode) {
                const codeValidation = await validateActivationCode(shortCode);
                if (codeValidation.valid) {
                    isValid = true;
                }
            }
            
            if (isValid) {
                // Code/token valide, rediriger vers parcours.html avec la langue
                const langParam = savedLanguage ? `?lang=${encodeURIComponent(savedLanguage)}` : '';
                window.location.href = `parcours.html${langParam}`;
                return;
            } else {
                // Code/token invalide, nettoyer complètement et afficher le popup
                localStorage.clear();
                if (savedOrientationPerm) {
                    localStorage.setItem('orientationPermissionGranted', savedOrientationPerm);
                }
                localStorage.setItem('selectedLanguage', savedLanguage);
                showInvalidCodePopup();
                return;
            }
        }
    }
    
    // Si pas installée ou pas de code, comportement normal : nettoyer et rediriger vers language-selection
    localStorage.clear();
    if (savedOrientationPerm) {
        localStorage.setItem('orientationPermissionGranted', savedOrientationPerm);
    }
    window.location.href = "language-selection.html";
}

// === Ajout : fonction showQuizPrompt ===
function showQuizPrompt(callback) {
  if (localStorage.getItem("mons_quizEnabled") !== null) {
    callback(localStorage.getItem("mons_quizEnabled") === "true");
    return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'quiz-prompt-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  const box = document.createElement('div');
  box.style.background = '#fffbe6';
  box.style.border = '4px solid #b8860b';
  box.style.borderRadius = '18px';
  box.style.boxShadow = '0 0 24px #0008';
  box.style.padding = '32px 24px 24px 24px';
  box.style.maxWidth = '400px';
  box.style.textAlign = 'center';
  box.style.position = 'relative';

  const title = document.createElement('div');
  // Utiliser la traduction pour le titre
  const quizPromptText = window.translationManager ? window.translationManager.translate('quiz_prompt') : 'Voulez-vous activer le quiz tout au long du parcours ?';
  title.textContent = quizPromptText;
  title.style.fontWeight = 'bold';
  title.style.fontSize = '1.2em';
  title.style.marginBottom = '18px';
  box.appendChild(title);

  const btns = document.createElement('div');
  btns.style.display = 'flex';
  btns.style.justifyContent = 'center';
  btns.style.gap = '18px';

  const btnYes = document.createElement('button');
  // Utiliser la traduction pour le bouton Oui
  const yesText = window.translationManager ? window.translationManager.translate('yes') : 'Oui';
  const quizOnText = window.translationManager ? window.translationManager.translate('quiz_on') : 'quiz ON';
  btnYes.textContent = `${yesText}, ${quizOnText}`;
  btnYes.style.background = '#2ecc40';
  btnYes.style.color = '#fff';
  btnYes.style.fontWeight = 'bold';
  btnYes.style.border = 'none';
  btnYes.style.borderRadius = '8px';
  btnYes.style.padding = '10px 18px';
  btnYes.style.fontSize = '1em';
  btnYes.style.cursor = 'pointer';
  btnYes.addEventListener('click', () => {
    localStorage.setItem("mons_quizEnabled", "true");
    document.body.removeChild(overlay);
    callback(true);
  });

  const btnNo = document.createElement('button');
  // Utiliser la traduction pour le bouton Non
  const noText = window.translationManager ? window.translationManager.translate('no') : 'Non';
  const withoutQuizText = window.translationManager ? window.translationManager.translate('without_quiz') : 'sans quiz';
  btnNo.textContent = `${noText}, ${withoutQuizText}`;
  btnNo.style.background = '#e74c3c';
  btnNo.style.color = '#fff';
  btnNo.style.fontWeight = 'bold';
  btnNo.style.border = 'none';
  btnNo.style.borderRadius = '8px';
  btnNo.style.padding = '10px 18px';
  btnNo.style.fontSize = '1em';
  btnNo.style.cursor = 'pointer';
  btnNo.addEventListener('click', () => {
    localStorage.setItem("mons_quizEnabled", "false");
    document.body.removeChild(overlay);
    callback(false);
  });

  btns.appendChild(btnYes);
  btns.appendChild(btnNo);
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// === Ajout : gestion du quiz par point ===
function showQuizForCurrentPoint(callback) {
  // Vérifier si le quiz est activé
  if (!quizEnabled) {
    callback();
    return;
  }

  const currentLocation = currentIndex === 0 ? startPoint : filteredLocations[currentIndex];
  const pointName = currentLocation.name;
  
  
  // Log de la langue sélectionnée dans le localStorage
  
  
  // S'assurer que le gestionnaire de traductions est prêt
  if (!window.translationManager) {
    setTimeout(() => showQuizForCurrentPoint(callback), 100);
    return;
  }
  
  // Utiliser le fichier de traductions du quiz
  const currentLang = window.translationManager.getCurrentLanguage();
  const quizTranslations = window.quizTranslations || {};
  const langData = quizTranslations[currentLang] || quizTranslations['fr'] || {};
  let questions = langData[pointName];
  
  // Fallback vers l'ancien système si les traductions ne sont pas disponibles
  if (!questions || questions.length === 0) {
    questions = window.quizData ? window.quizData[pointName] : null;
  }
  
  
  if (!questions || questions.length === 0) {
    callback();
    return;
  }
  if (completedQuizQuestions[pointName]) {
    callback();
    return;
  }
  
  
  // Marquer qu'un quiz est en cours
  currentQuizInProgress = true;
  
  // Mettre à jour l'affichage pour refléter le nouveau maxScore
  updateCurrentDisplay();
  
  // Désactiver tous les boutons sauf quiz
  const btns = [nextButton, prevButton, homeButton, cultureButton, audioBtn, doudouBtn, pauseBtn, stopBtn, restartBtn];
  btns.forEach(btn => { if (btn) btn.disabled = true; });
  let questionIndex = 0;
  let localScore = 0;
  function showQuestion() {
    const q = questions[questionIndex];
    showUniversalPopup({
      title: `Question ${questionIndex + 1} / 3`,
      message: q.question,
      buttons: q.options.map((opt, idx) => ({
        label: opt,
        color: '#b30000',
        onClick: () => {
          const isGood = idx === q.answer;
          if (isGood) localScore += 10;
          
          // Jouer le son de feedback
          let feedbackAudio;
          if (isGood) {
            feedbackAudio = new Audio('audio/correct.mp3');
          } else {
            feedbackAudio = new Audio('audio/incorrect.mp3');
          }
          feedbackAudio.play();

          // Afficher l'icône de feedback centrée avec fond transparent (comme avant)
          const feedbackImg = document.createElement('img');
          feedbackImg.src = `images/${isGood ? 'correct' : 'incorrect'}.png`;
          feedbackImg.alt = isGood ? 'Bonne réponse' : 'Mauvaise réponse';
          feedbackImg.style.position = 'fixed';
          feedbackImg.style.top = '50%';
          feedbackImg.style.left = '50%';
          feedbackImg.style.transform = 'translate(-50%, -50%)';
          feedbackImg.style.width = '120px';
          feedbackImg.style.height = '120px';
          feedbackImg.style.zIndex = '10000';
          document.body.appendChild(feedbackImg);
          
          // Si mauvaise réponse, afficher la bonne réponse dans un conteneur stylisé
          if (!isGood) {
            const correctAnswerContainer = document.createElement('div');
            correctAnswerContainer.style.position = 'fixed';
            correctAnswerContainer.style.top = 'calc(50% + 80px)'; // Positionner sous l'icône
            correctAnswerContainer.style.left = '50%';
            correctAnswerContainer.style.transform = 'translate(-50%, -50%)';
            correctAnswerContainer.style.zIndex = '10000';
            correctAnswerContainer.style.textAlign = 'center';
            correctAnswerContainer.style.background = 'rgba(0, 0, 0, 0.8)';
            correctAnswerContainer.style.borderRadius = '15px';
            correctAnswerContainer.style.padding = '15px';
            correctAnswerContainer.style.color = 'white';
            correctAnswerContainer.style.fontFamily = 'MedievalSharp, Arial, serif';
            correctAnswerContainer.style.fontSize = '16px';
            correctAnswerContainer.style.minWidth = '280px';
            correctAnswerContainer.style.fontWeight = 'bold';
            correctAnswerContainer.style.color = '#FFD700'; // Couleur dorée
            const correctAnswerText = window.translationManager ? window.translationManager.translate('correct_answer') : 'Bonne réponse :';
            correctAnswerContainer.innerHTML = `${correctAnswerText} <br>${q.options[q.answer]}`;
            document.body.appendChild(correctAnswerContainer);
            
            // Supprimer les deux éléments après 3 secondes
            setTimeout(() => {
              document.body.removeChild(feedbackImg);
              document.body.removeChild(correctAnswerContainer);
              questionIndex++;
              // Mettre à jour l'affichage après chaque question
              updateCurrentDisplay();
              if (questionIndex < 3) {
                showQuestion();
              } else {
                // Fin du quiz pour ce point
                score += localScore;
                completedQuizQuestions[pointName] = true;
                currentQuizInProgress = false; // Quiz terminé
                localStorage.setItem('mons_score', score);
                localStorage.setItem('mons_completedQuizQuestions', JSON.stringify(completedQuizQuestions));
                // Mettre à jour l'affichage pour refléter le nouveau score
                updateCurrentDisplay();
                // Réactiver les boutons
                btns.forEach(btn => { if (btn) btn.disabled = false; });
                callback();
              }
            }, 3000);
          } else {
            // Si bonne réponse, supprimer seulement l'icône après 1 seconde
            setTimeout(() => {
              document.body.removeChild(feedbackImg);
              questionIndex++;
              // Mettre à jour l'affichage après chaque question
              updateCurrentDisplay();
              if (questionIndex < 3) {
                showQuestion();
              } else {
                // Fin du quiz pour ce point
                score += localScore;
                completedQuizQuestions[pointName] = true;
                currentQuizInProgress = false; // Quiz terminé
                localStorage.setItem('mons_score', score);
                localStorage.setItem('mons_completedQuizQuestions', JSON.stringify(completedQuizQuestions));
                // Mettre à jour l'affichage pour refléter le nouveau score
                updateCurrentDisplay();
                // Réactiver les boutons
                btns.forEach(btn => { if (btn) btn.disabled = false; });
                callback();
              }
            }, 1000);
          }
        }
      })),
      icon1: '⚔️',
      icon2: '🐉',
    });
  }
  showQuestion();
}

async function initApp() {
    try {
        // Ne pas initialiser sur la page de sélection de langue
        if (window.location.pathname.includes('language-selection.html') || 
            window.location.pathname.includes('language-selection')) {
            return;
        }
        pruneClqNavigationStorage();
        
        // Récupérer la langue choisie dans le localStorage AVANT d'initialiser le gestionnaire
        const lang = localStorage.getItem('selectedLanguage');
        // Ne pas forcer une langue par défaut si aucune n'est sélectionnée
        
        // Charger les descriptions multilingues
        try {
            await loadDescriptions();
        } catch (e) {
            console.error('Erreur lors du chargement des descriptions:', e);
        }
        
        // Charger les traductions du quiz
        try {
            await loadQuizTranslations();
        } catch (e) {
            console.error('Erreur lors du chargement des traductions du quiz:', e);
        }
        
        // Initialiser le gestionnaire de traductions et attendre qu'il soit prêt
        if (window.translationManager && typeof window.translationManager.init === 'function') {
            try {
                await window.translationManager.init();
                window.translationManager.setLanguage(lang);
                window.translationManager.applyTranslations();
                
                // Mettre à jour le splash screen dans la bonne langue (seulement sur index.html)
                const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                                     window.location.pathname.endsWith('/') || 
                                     window.location.pathname === '';
                if (isOnIndexPage) {
                    const splashText = document.getElementById('splash-text');
                    if (splashText) {
                      const translation = window.translationManager.translate('splash_waiting');
                      if (translation !== 'splash_waiting') {
                        splashText.innerHTML = translation;
                      }
                    }
                }
            } catch (e) {
                console.error('Erreur lors de l\'initialisation du gestionnaire de traductions:', e);
            }
        }
        
        // Lancer le chargement de la carte (le splash screen sera caché une fois la carte prête)
        try {
            startMap();
        } catch (e) {
            console.error('Erreur lors du démarrage de la carte:', e);
        }
    } catch (error) {
        console.error('❌ Erreur critique dans initApp():', error);
    }
}

function initializeMainLogic() {
    // Cette fonction contient la logique qui doit s'exécuter après le chargement de la carte
    // (ou son échec)
    
    // Restaurer l'état de l'application depuis le localStorage
    const savedCurrentIndex = localStorage.getItem("mons_currentIndex");
    const savedScore = localStorage.getItem("mons_score");
    const savedQuizEnabled = localStorage.getItem("mons_quizEnabled");
    const savedCompletedQuizQuestions = localStorage.getItem("mons_completedQuizQuestions");
    
    if (savedCurrentIndex !== null) {
        currentIndex = parseInt(savedCurrentIndex);
    }
    
    if (savedScore !== null) {
        score = parseInt(savedScore);
    }
    
    if (savedQuizEnabled !== null) {
        quizEnabled = savedQuizEnabled === 'true';
    }
    
    // Restaurer les questions de quiz déjà traitées
    if (savedCompletedQuizQuestions !== null && Object.keys(completedQuizQuestions).length === 0) {
        try {
            completedQuizQuestions = JSON.parse(savedCompletedQuizQuestions);
        } catch (error) {
            console.error("❌ Erreur lors de la restauration des questions de quiz:", error);
            completedQuizQuestions = {};
        }
    } else {
    }
    
    const forceTarget = localStorage.getItem("mons_forceTarget");

    if (forceTarget) {
        try {
            const museum = JSON.parse(forceTarget);

            if (!museum.name || !museum.lat || !museum.lng) {
                console.error("❌ Données du musée incomplètes:", museum);
            } else {
                localStorage.setItem("museumMode", "true");
                localStorage.setItem("selectedMuseum", museum.name);
                localStorage.setItem("museumData", JSON.stringify(museum));
                
                // Afficher l'image du musée sélectionné
                const imageElement = document.getElementById("point-image");
                if (imageElement && museum.image) {
                    imageElement.src = museum.image;
                    imageElement.alt = museum.name;
                } else {
                    console.warn("⚠️ Image du musée non trouvée ou élément image non trouvé");
                }
                
                // Désactiver les boutons du footer (sauf Home)
                disableFooterButtons();
            }
        } catch (e) {
            console.error("Erreur lors du traitement du mode musée:", e);
        }
    } else {
        
        // Restaurer l'état du bouton selfie
        const selfieBtn = document.getElementById('selfie-btn');
        if (selfieBtn) {
            const tourCompleted = localStorage.getItem('tourCompleted') === 'true';
            if (tourCompleted) {
                selfieBtn.style.display = 'block';
            } else {
                selfieBtn.style.display = 'none';
            }
        }
        
        // Restaurer les points visités
        const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
        
        // S'assurer que le point actuel est marqué comme visité
        if (!visitedPoints.includes(currentIndex)) {
            visitedPoints.push(currentIndex);
            localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
        }
    }
    
    // Mise à jour de l'affichage initial
    
    // Détecter si on vient de language-selection.html
    const referrer = document.referrer;
    const isComingFromLanguageSelection = referrer.includes('language-selection.html') || 
                                        referrer.includes('language-selection') ||
                                        sessionStorage.getItem('comingFromLanguageSelection') === 'true';
    
    // Marquer dans sessionStorage pour la détection
    if (isComingFromLanguageSelection) {
        sessionStorage.setItem('comingFromLanguageSelection', 'true');
    }
    
    // Vérifier si les permissions de géolocalisation ont déjà été accordées
    const geoPermissionGranted = localStorage.getItem('geoPermissionGranted') === 'true';
    const isFirstLaunch = !localStorage.getItem('appLaunchedBefore');
    
    // Marquer que l'app a été lancée au moins une fois
    if (!isFirstLaunch) {
        localStorage.setItem('appLaunchedBefore', 'true');
    }
    
    // Forcer la demande d'autorisation si on vient de language-selection.html
    const shouldForcePermissionRequest = isComingFromLanguageSelection || isFirstLaunch;
    
    if (isAndroidDevice()) {
        geoPermissionRequested = false;
        orientationPermissionRequested = false;

        const promptAndroidGeoWithMapFallback = () => {
            beginMainGeolocationFlow();
            if (typeof startPoint !== 'undefined' && startPoint && map) {
                calculateRouteFromPosition(startPoint, 'Point de départ');
            }
        };

        if (shouldForcePermissionRequest) {
            localStorage.removeItem('geoPermissionGranted');
            localStorage.removeItem('orientationPermissionGranted');
            localStorage.removeItem('compassGuidanceActive');
            promptAndroidGeoWithMapFallback();
        } else {
            androidVerifyGeoPermission((granted) => {
                if (granted) {
                    updateLocation();
                } else {
                    promptAndroidGeoWithMapFallback();
                }
            });
        }
    } else if (geoPermissionGranted && !shouldForcePermissionRequest) {
        updateLocation();
    } else {
        
        // Forcer la réinitialisation des flags
        geoPermissionRequested = false;
        orientationPermissionRequested = false;
        
        // Nettoyer les permissions stockées pour forcer la demande
        if (isComingFromLanguageSelection) {
            localStorage.removeItem('geoPermissionGranted');
            localStorage.removeItem('orientationPermissionGranted');
            localStorage.removeItem('compassGuidanceActive');
        } else {
            // Même si on ne vient pas de language-selection, nettoyer les permissions d'orientation
            // pour forcer la demande de boussole à chaque ouverture
            localStorage.removeItem('orientationPermissionGranted');
            localStorage.removeItem('compassGuidanceActive');
        }
        
        beginMainGeolocationFlow();
    }
    
    // Forcer la demande de boussole immédiatement
    const compassGuidanceActive = localStorage.getItem('compassGuidanceActive') === 'true';
    if (!compassGuidanceActive) {
        setTimeout(() => {
            showCompassHelpPopup();
        }, 2000); // Délai de 2 secondes pour laisser le temps à la page de se charger
    } else {
    }
    
    // Vérifier l'orientation au démarrage
    checkOrientationAndShowPopup();
    
    // Écouter les changements d'orientation
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            checkOrientationAndShowPopup();
        }, 100); // Petit délai pour laisser le temps à l'orientation de se stabiliser
    });
    
    // Écouter les changements de taille d'écran (fallback)
    window.addEventListener('resize', () => {
        setTimeout(() => {
            checkOrientationAndShowPopup();
        }, 100);
    });
    
    // Bouton Transports en commun
    setupTransitButton(filteredLocations, () => currentIndex);
    // Bouton Uber
    setupUberButton(filteredLocations, () => currentIndex);
}

// Fonction pour désactiver les boutons du footer en mode musée
function disableFooterButtons() {
    
    const buttonsToDisable = [
        nextButton, prevButton, audioBtn, pauseBtn, stopBtn, restartBtn
    ];
    
    buttonsToDisable.forEach(button => {
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        }
    });
    
    // Cacher complètement les contrôles audio en mode musée
    const audioControls = document.getElementById('audio-controls-fixed');
    if (audioControls) {
        audioControls.style.display = 'none';
    }
    
    // Cacher le bouton selfie en mode musée
    const selfieBtn = document.getElementById('selfie-btn');
    if (selfieBtn) {
        selfieBtn.style.display = 'none';
    }
    
    // Le bouton Home reste actif mais redirige vers parcours.html
    const homeButton = document.getElementById('home-btn');
    if (homeButton) {
        homeButton.onclick = () => {
            const isMuseumMode = localStorage.getItem("museumMode") === "true";
            
            if (isMuseumMode) {
                // En mode musée, rediriger vers la sélection de langue
                showHomeConfirmPopup(() => {
                    stopAllAudio();
                    const orientationPerm = localStorage.getItem('orientationPermissionGranted');
                    localStorage.clear();
                    if (orientationPerm) localStorage.setItem('orientationPermissionGranted', orientationPerm);
                    window.location.href = "language-selection.html";
                });
            } else {
                // En mode parcours normal, rediriger vers la sélection de langue
                showHomeConfirmPopup(() => {
                    stopAllAudio();
                    localStorage.clear();
                    window.location.href = "language-selection.html";
                });
            }
        };
    } else {
        console.warn("⚠️ Bouton Home non trouvé");
    }
    
}

// Variables globales pour la rotation de la flèche
let currentArrowRotation = 0;
let arrowHeadingSmoothed = null;

let isCompassActive = false;
// === Anti "danse de St-Guy" (v2) ===
let lastHeadingRaw = null;              // Dernier heading accepté (après snapping)
let lastOrientationUpdateTime = 0;      // Dernier timestamp utilisé

// Quand on bouge : réactif, mais pas hystérique
const ORIENT_MIN_DELTA_MOVING = 5;      // Δ minimal (en °) si on bouge

// Quand on est à l'arrêt : beaucoup plus de tolérance
const ORIENT_MIN_DELTA_STOPPED = 25;    // Δ minimal (en °) si on est à l'arrêt

// Intervalle minimal entre deux updates
const ORIENT_MIN_INTERVAL_MS = 300;     // ms

// Différence angulaire minimale (en °), résultat entre -180 et 180
function angleDiff(a, b) {
    let d = (a - b) % 360;
    if (d < -180) d += 360;
    if (d > 180) d -= 360;
    return d;
}




// Fonction pour détecter l'orientation de l'appareil
function getDeviceOrientation() {
    // Détecter Android
    const isAndroid = /android/i.test(navigator.userAgent);
    
    // Méthode 1: screen.orientation (moderne)
    if (screen.orientation && screen.orientation.angle !== undefined) {
        const angle = screen.orientation.angle;
        if (isAndroid) {
        }
        return angle;
    }
    
    // Méthode 2: window.orientation (ancienne, mais largement supportée sur mobile)
    if (window.orientation !== undefined) {
        const angle = window.orientation;
        if (isAndroid) {
        }
        return angle;
    }
    
    // Méthode 3: Media query (fallback)
    if (window.matchMedia) {
        if (window.matchMedia("(orientation: landscape)").matches) {
            if (isAndroid) {
            }
            return 90; // Landscape
        } else {
            if (isAndroid) {
            }
            return 0; // Portrait
        }
    }
    
    if (isAndroid) {
    }
    return 0; // Par défaut
}

// Helper générique : détecter si on est en paysage
function isLandscapeNow() {
    const bySize = window.innerWidth > window.innerHeight;

    let mqLandscape = false;
    if (window.matchMedia) {
        try {
            mqLandscape = window.matchMedia("(orientation: landscape)").matches;
        } catch (e) {
            mqLandscape = false;
        }
    }

    // On considère paysage si l'un des deux est vrai
    return bySize || mqLandscape;
}

// Fonction pour vérifier l'orientation et afficher le popup si nécessaire
function checkOrientationAndShowPopup() {
    const isLandscape = isLandscapeNow();

    // 🔍 Debug (à garder tant que tu testes sur tablette)
    console.log('[ORIENT] isLandscape=', isLandscape,
        ' size=', window.innerWidth + 'x' + window.innerHeight,
        ' mqLandscape=', (window.matchMedia ? window.matchMedia('(orientation: landscape)').matches : 'n/a')
    );

    const existingPopup = document.getElementById('landscape-required-popup');

    if (!isLandscape) {
        // Portrait → popup obligatoire
        if (!existingPopup) {
            showLandscapeRequiredPopup();
        }
    } else {
        // Paysage → on supprime le popup s'il existe
        if (existingPopup) {
            existingPopup.remove(); // ou document.body.removeChild(existingPopup);
        }
    }
}


// Fonction pour afficher le popup de mode paysage obligatoire
function showLandscapeRequiredPopup() {
    // Vérifier si le popup existe déjà
    if (document.getElementById('landscape-required-popup')) {
        return;
    }
    
    
    const overlay = document.createElement('div');
    overlay.id = 'landscape-required-popup';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.fontFamily = 'Arial, sans-serif';
    
    const popup = document.createElement('div');
    popup.style.backgroundColor = '#fff';
    popup.style.borderRadius = '20px';
    popup.style.padding = '40px';
    popup.style.textAlign = 'center';
    popup.style.maxWidth = '90%';
    popup.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    
    const icon = document.createElement('div');
    icon.innerHTML = '<img src="images/partager_ios.png" alt="Rotation" style="height:3em;width:auto;"><span style="font-size:3em;">↻</span>';
    icon.style.fontSize = '4em';
    icon.style.marginBottom = '20px';
    popup.appendChild(icon);
    
    const title = document.createElement('h2');
    title.textContent = 'Mode Paysage Requis';
    title.style.color = '#d32f2f';
    title.style.marginBottom = '20px';
    title.style.fontSize = '1.8em';
    popup.appendChild(title);
    
    const message = document.createElement('p');
    message.textContent = 'Veuillez tourner votre appareil en mode paysage pour utiliser cette application.';
    message.style.fontSize = '1.2em';
    message.style.color = '#333';
    message.style.marginBottom = '30px';
    message.style.lineHeight = '1.5';
    popup.appendChild(message);
    
    const instruction = document.createElement('div');
    instruction.innerHTML = '🔄 <strong>Tournez votre appareil horizontalement</strong>';
    instruction.style.fontSize = '1.1em';
    instruction.style.color = '#666';
    instruction.style.marginBottom = '30px';
    popup.appendChild(instruction);
    
    // Pas de bouton - le popup reste affiché tant que l'appareil est en mode portrait
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// Fonction pour corriger la rotation selon l'orientation de l'appareil
function correctRotationForDeviceOrientation(baseRotation) {
    const deviceOrientation = getDeviceOrientation();
    
    // Détecter le sens de basculement pour Android
    // 0° = portrait normal
    // 90° = basculé vers la gauche (côté long gauche vers le bas)
    // 270° = basculé vers la droite (côté long droit vers le bas)
    
    // Sur Android, quand on tourne vers la droite (270°), 
    // la carte doit tourner vers la gauche pour compenser
    if (deviceOrientation === 270) {
        // Basculement vers la droite : corriger de -90° (rotation vers la gauche)
        return baseRotation - 90;
    } else if (deviceOrientation === 90) {
        // Basculement vers la gauche : corriger de +90° (rotation vers la droite)
        return baseRotation + 90;
    }
    
    return baseRotation;
}

/**
 * Reçoit un heading brut (0–360) venant du capteur, corrige l'orientation
 * de l'appareil, filtre le bruit et applique la rotation à la carte / flèche.
 */
function handleCompassHeading(rawHeading) {
    if (!isCompassActive) return;
    if (typeof rawHeading !== 'number' || isNaN(rawHeading)) return;

    const now = performance.now();
    // On limite la fréquence des mises à jour pour calmer le jitter
    if (now - lastHeadingUpdateTime < HEADING_MIN_INTERVAL) {
        return;
    }
    lastHeadingUpdateTime = now;

    // Normalisation de base 0–360
    let heading = rawHeading % 360;
    if (heading < 0) heading += 360;

    // Corriger en fonction de l'orientation de l'appareil (portrait/paysage, 90/270°)
    heading = correctRotationForDeviceOrientation(heading);

    // Première valeur : on initialise sans filtrage
    if (lastRawHeading === null) {
        lastRawHeading = heading;
        filteredHeading = heading;
        applyHeadingToMap(filteredHeading);
        return;
    }

    // --- 1) Calculer la différence la plus courte (gère 0°/360° proprement) ---
    let diff = heading - lastRawHeading;
    // Normalise la différence dans [-180, +180] pour éviter les tours complets
    diff = ((diff + 540) % 360) - 180;

    // --- 2) Deadband : on ignore les petites variations (bruit) ---
    if (Math.abs(diff) < HEADING_DEADBAND) {
        return;
    }

    // On met à jour la valeur "référence" brute
    lastRawHeading = (lastRawHeading + diff + 360) % 360;

    // --- 3) Lissage exponentiel ---
    filteredHeading = (filteredHeading + HEADING_SMOOTHING * diff + 360) % 360;

    // --- 4) Appliquer au visuel (carte/flèche) ---
    applyHeadingToMap(filteredHeading);
}

/**
 * Applique la rotation finale à la carte et/ou à la flèche.
 * Adapte cette fonction à ton code existant (Leaflet, DOM, etc.).
 */
function applyHeadingToMap(heading) {
    if (!map) return;
    if (isAndroidDevice()) {
        resetAndroidMapAndMarkerForGoogleGuidance();
        const pos = getCurrentUserLatLng();
        if (pos) applyMapViewForGuidance(pos);
        return;
    }

    const mapDiv = document.getElementById('map');
    if (!mapDiv) {
        console.error('❌ mapDiv introuvable');
        return;
    }

    const gmStyle = mapDiv.querySelector('.gm-style');
    if (!gmStyle) {
        console.error('❌ .gm-style introuvable dans mapDiv');
        return;
    }

    // Carte : on la tourne dans le sens inverse du heading
    const rotationAngle = -heading;
    gmStyle.style.transform = `rotate(${rotationAngle}deg)`;
    gmStyle.style.transformOrigin = 'center center';
    gmStyle.style.transition = 'transform 0.12s linear';

    // Flèche utilisateur : on la garde "vers le haut"
    if (userPositionMarker) {
        const icon = userPositionMarker.getIcon && userPositionMarker.getIcon();
        if (icon) {
            currentArrowRotation = heading; // simple, même angle que la boussole
            icon.rotation = currentArrowRotation;
            userPositionMarker.setIcon(icon);
        }
    }
}



// --- Activation du contrôle d'orientation ---
(function () {
    function bindOrientationListeners() {
        // Premier check immédiat
        checkOrientationAndShowPopup();

        // Re-check à chaque changement de taille (rotation, split screen, etc.)
        window.addEventListener('resize', checkOrientationAndShowPopup);

        // Re-check spécifique aux changements d’orientation (si supporté)
        window.addEventListener('orientationchange', checkOrientationAndShowPopup);
    }

    // On attend que le DOM soit prêt avant de toucher à la page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindOrientationListeners);
    } else {
        bindOrientationListeners();
    }
})();


// ========== FONCTION UNIFIÉE POUR CALCULER LE COMPASS HEADING ==========
// Cette fonction calcule correctement le heading à partir des données d'orientation
// Fonctionne de manière identique sur iOS et Android
function computeCompassHeading(alpha, beta, gamma) {
    // Convertir en radians
    const degtorad = Math.PI / 180;
    const x = (beta || 0) * degtorad;  // inclinaison avant/arrière
    const y = (gamma || 0) * degtorad; // inclinaison gauche/droite
    const z = (alpha || 0) * degtorad;  // rotation autour de Z
    
    const cX = Math.cos(x);
    const cY = Math.cos(y);
    const cZ = Math.cos(z);
    const sX = Math.sin(x);
    const sY = Math.sin(y);
    const sZ = Math.sin(z);
    
    // Vecteur "vers le nord" dans le repère device
    const Vx = -cZ * sY - sZ * sX * cY;
    const Vy = -sZ * sY + cZ * sX * cY;
    
    let heading = Math.atan2(Vx, Vy);
    if (heading < 0) heading += 2 * Math.PI;
    
    return heading * 180 / Math.PI; // → degrés [0, 360)
}



// Variable globale pour le lissage du heading
//let lastCompassHeading = null;
//var lastCompassHeading = null;
// Global sécurisé pour la boussole (compatible double chargement du script)
// Gestion globale du cap sans redeclaration
if (typeof window.lastCompassHeading === 'undefined') {
    window.lastCompassHeading = null;
  }
  if (typeof window.bearingSmoothed === 'undefined') {
    window.bearingSmoothed = null;
  }
  


// Petite fonction utilitaire pour normaliser un angle 0–360
function normalizeAngle(angle) {
    if (angle == null || isNaN(angle)) return null;
    let a = angle % 360;
    if (a < 0) a += 360;
    return a;
}

// On suppose que gpsHeading est déjà mis à jour
// quelque part dans ton watchPosition (position.coords.heading)
let lastAndroidHeading = null;

function getCompassHeadingFromEvent(event) {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // 🔹 ANDROID : on NE FAIT PLUS CONFIANCE AUX CAPTEURS MAGNÉTIQUES
    // On utilise UNIQUEMENT le heading GPS pour avoir le même résultat
    // sur téléphone et tablette.
    if (isAndroid) {
        if (typeof gpsHeading === 'number' && !isNaN(gpsHeading)) {
            lastAndroidHeading = normalizeAngle(gpsHeading);
            return lastAndroidHeading;
        }

        // Pas encore de heading GPS → on garde le dernier connu, sinon null
        return lastAndroidHeading;
    }

    // 🔹 iOS : on garde la logique boussole (webkitCompassHeading)
    if (isIOS && typeof event.webkitCompassHeading === 'number') {
        return normalizeAngle(event.webkitCompassHeading);
    }

    // 🔹 Fallback générique (autres plateformes) :
    if (typeof event.alpha === 'number') {
        // Convention classique : 0° = Nord, rotation horaire
        // heading ≈ 360 - alpha
        return normalizeAngle(360 - event.alpha);
    }

    return null;
}



function handleOrientation(event) {
    // Protection CRITIQUE : ne JAMAIS exécuter sur la page de sélection de langue
    // Vérifier d'abord avant toute autre opération - vérification multiple pour être sûr
    try {
        const currentPath = window.location.pathname || window.location.href || window.location.toString() || '';
        const currentHost = window.location.hostname || '';
        const fullUrl = window.location.href || '';
        
        if (currentPath.includes('language-selection') || 
            currentPath.includes('language-selection.html') ||
            fullUrl.includes('language-selection') ||
            fullUrl.includes('language-selection.html')) {
            if (window.isHandlingOrientation !== undefined) {
                window.isHandlingOrientation = false;
            }
            return;
        }
    } catch (e) {
        // En cas d'erreur, ne pas continuer
        if (window.isHandlingOrientation !== undefined) {
            window.isHandlingOrientation = false;
        }
        return;
    }
    
    // Protection : ne pas exécuter si le DOM n'est pas prêt
    try {
        if (document.readyState === 'loading' || !document.body) {
            if (window.isHandlingOrientation !== undefined) {
                window.isHandlingOrientation = false;
            }
            return;
        }
    } catch (e) {
        if (window.isHandlingOrientation !== undefined) {
            window.isHandlingOrientation = false;
        }
        return;
    }
    
    // Init debug ON/OFF : priorité au flag global DEBUG_ORIENTATION_OVERLAY
    if (typeof window.orientationDebugEnabled === 'undefined') {
        if (typeof DEBUG_ORIENTATION_OVERLAY !== 'undefined') {
            // On force depuis la constante en haut du fichier
            window.orientationDebugEnabled = !!DEBUG_ORIENTATION_OVERLAY;
            try {
                localStorage.setItem(
                  'orientationDebug',
                  window.orientationDebugEnabled ? 'true' : 'false'
                );
            } catch (e) {}
        } else {
            // Fallback : ancien comportement basé sur le localStorage
            // Retour au comportement original pour Android
            try {
                const saved = localStorage.getItem('orientationDebug');
                if (saved === null) {
                    // Par défaut : ON pour t'aider à déboguer (comportement original)
                    window.orientationDebugEnabled = true;
                } else {
                    window.orientationDebugEnabled = (saved === 'true');
                }
            } catch (e) {
                window.orientationDebugEnabled = true;
            }
        }
    }
    
    // Éviter la récursion infinie
    if (window.isHandlingOrientation) {
        return;
    }
    window.isHandlingOrientation = true;

    // Détecter Android et iOS
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isAndroid) {
        resetAndroidMapAndMarkerForGoogleGuidance();
        const pos = getCurrentUserLatLng();
        if (pos) applyMapViewForGuidance(pos);
        window.isHandlingOrientation = false;
        return;
    }

    // On sépare :
    // - mapBearing   = orientation de la CARTE (Android : POI vers le haut)
    // - arrowBearing = orientation de la FLÈCHE (direction de l'utilisateur)
    let mapBearing = null;
    let arrowBearing = null;

    // Pour le debug panel
    let debugData = {
        gpsHeading: gpsHeading,
        androidMode: androidMode,
        magnetometerOffset: magnetometerOffset,
        poiBearing: null,
        poiBearingSmoothed: null,
        compassHeading: null,
        userHeading: null,
        arrowBearing: null
    };

    // --- iOS : on garde la logique boussole qui fonctionne bien ---
    if (isIOS && typeof event.webkitCompassHeading === 'number') {
        const deviceOrientation = window.orientation || 0;
        let offset = 95; // empirique, comme avant

        if (deviceOrientation === 90) {
            offset = 95;
        } else if (deviceOrientation === -90 || deviceOrientation === 270) {
            offset = 95;
        } else {
            offset = 95;
        }

        const heading = norm360(event.webkitCompassHeading + offset);

        // iOS : carte et flèche suivent la boussole
        mapBearing = heading;
        arrowBearing = heading;

    // --- ANDROID : CARTE = POI vers le haut, FLÈCHE = heading GPS uniquement ---
    } else if (isAndroid) {

        // 1) Calcul du bearing vers le POI / musée pour orienter la CARTE
        (function () {
            // Vérifications de sécurité : ne pas exécuter si les éléments ne sont pas prêts
            if (!map) return;
            if (typeof filteredLocations === 'undefined') return;
            if (typeof currentIndex === 'undefined') return;

            let from = null;
            let destination = null;

            // FROM : position utilisateur si disponible, sinon point de départ
            if (userPositionMarker && userPositionMarker.getPosition) {
                const pos = userPositionMarker.getPosition();
                if (pos) {
                    from = { lat: pos.lat(), lng: pos.lng() };
                }
            }
            if (!from && startPoint && typeof startPoint.lat === 'number' && typeof startPoint.lng === 'number') {
                from = { lat: startPoint.lat, lng: startPoint.lng };
            }

            // DESTINATION : musée ou POI courant
            if (localStorage.getItem('museumMode') === 'true') {
                try {
                    const museum = JSON.parse(localStorage.getItem('museumData'));
                    if (museum && typeof museum.lat === 'number' && typeof museum.lng === 'number') {
                        destination = { lat: museum.lat, lng: museum.lng };
                    }
                } catch (e) {
                    console.error("Erreur museumData pour orientation Android :", e);
                }
            } else {
                try {
                    if (typeof filteredLocations !== 'undefined' &&
                        Array.isArray(filteredLocations) &&
                        typeof currentIndex === 'number' &&
                        currentIndex >= 0 &&
                        currentIndex < filteredLocations.length) {
                        const loc = filteredLocations[currentIndex];
                        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                            destination = { lat: loc.lat, lng: loc.lng };
                        }
                    }
                } catch (e) {
                    console.error("Erreur filteredLocations/currentIndex pour orientation Android :", e);
                }
            }

            if (!from || !destination) return;

            const poiBearing = calculateAzimuth(from, destination); // direction utilisateur → POI
            debugData.poiBearing = poiBearing;

            if (typeof window.poiBearingSmoothed !== 'number' || isNaN(window.poiBearingSmoothed)) {
                window.poiBearingSmoothed = poiBearing;
            } else {
                window.poiBearingSmoothed = emaAngle(window.poiBearingSmoothed, poiBearing, 0.25);
            }
            debugData.poiBearingSmoothed = window.poiBearingSmoothed;

            // ➜ CARTE tournée pour mettre la direction vers le POI vers le haut
            mapBearing = window.poiBearingSmoothed;
        })();

        // 2) Direction de l'utilisateur = UNIQUEMENT heading GPS quand on est en mouvement
        let userHeading = null;

        if (gpsHeading != null && !isNaN(gpsHeading) && androidMode === 'MOVING') {
            // heading GPS déjà en degrés par rapport au nord
            userHeading = norm360(gpsHeading);
        } else {
            // Pas de heading GPS fiable → on fige la flèche sur la dernière valeur connue
            if (typeof bearingSmoothed === 'number' && !isNaN(bearingSmoothed)) {
                userHeading = bearingSmoothed;
            } else {
                userHeading = null;
            }
        }

        debugData.userHeading = userHeading;

        // Lissage de la flèche : assez réa// Lissage de la flèche : dynamique selon l'ampleur du virage
if (userHeading != null) {
    if (typeof bearingSmoothed !== 'number' || isNaN(bearingSmoothed)) {
        // Première valeur : on se cale directement dessus
        bearingSmoothed = userHeading;
    } else {
        // Différence angulaire entre la direction actuelle et la nouvelle
        const diff = Math.abs(angDiff(bearingSmoothed, userHeading)); // angDiff doit déjà exister chez toi

        // Plus le virage est important, plus on réagit vite
        let alpha;
        if (diff > 60) {
            // GROS virage → on suit presque directement
            alpha = 0.9;
        } else if (diff > 25) {
            // Virage net mais pas extrême
            alpha = 0.75;
        } else {
            // Petites variations → lissage plus doux
            alpha = 0.55;
        }

        bearingSmoothed = emaAngle(bearingSmoothed, userHeading, alpha);
    }

    arrowBearing = bearingSmoothed;
    debugData.arrowBearing = arrowBearing;
} else {
    arrowBearing = null;
}


    } else {
        // Fallback autres plateformes : carte + flèche suivent event.alpha
        const h = (typeof event.alpha === 'number') ? norm360(event.alpha) : null;
        mapBearing = h;
        arrowBearing = h;
    }

    const hasMap = !!map;
    const hasMarker = !!(userPositionMarker && userPositionMarker.getPosition && userPositionMarker.getPosition());

    if (!hasMap) {
        window.isHandlingOrientation = false;
        return;
    }

    const userPos = hasMarker ? userPositionMarker.getPosition() : null;

    // --- Rotation de la carte ---
    try {
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            const gmStyle =
                mapDiv.querySelector('.gm-style') ||
                mapDiv.querySelector('[style*="transform"]') ||
                mapDiv;

            if (gmStyle) {
                gmStyle.style.transformOrigin = 'center center';

                if (mapBearing !== null && !isNaN(mapBearing)) {
                    // iOS : heading boussole
                    // Android : direction vers le POI → POI vers le haut
                    const rotationAngle = -mapBearing;
                    gmStyle.style.transform = `rotate(${rotationAngle}deg)`;
                } else if (isAndroid) {
                    gmStyle.style.transform = 'rotate(0deg)';
                }
            }
        }
    } catch (error) {
        console.error("❌ Erreur rotation carte:", error);
    }

    // --- Rotation de la flèche (userPositionMarker) ---
    if (hasMarker && arrowBearing !== null && !isNaN(arrowBearing)) {
        const icon = userPositionMarker.getIcon();
        if (icon) {
            currentArrowRotation = arrowBearing;
            icon.rotation = currentArrowRotation;
            userPositionMarker.setIcon(icon);
        }
    }

    // Centrer la carte sur l'utilisateur et adapter le zoom (zoom 17 si proche du point)
    if (hasMarker && userPos) {
        applyMapViewForGuidance(userPos);
    }

    // --- DEBUG PANEL ANDROID (activable) ---
    // DÉSACTIVÉ TEMPORAIREMENT pour éviter les problèmes sur Android
    // Le panneau de débogage est désactivé via DEBUG_ORIENTATION_OVERLAY = false

    window.isHandlingOrientation = false;
}











// ========== ANDROID : Fonctions utilitaires pour filtrage ========== 
// Normaliser angle 0-360
const norm360 = (a) => ((a % 360) + 360) % 360;

// Différence angulaire (gère le passage 0-360)
const angDiff = (a, b) => {
    const d = norm360(a) - norm360(b);
    return ((d + 540) % 360) - 180;
};

// EMA (Exponential Moving Average) angulaire
const emaAngle = (prev, next, alpha = 0.15) => {
    return norm360(prev + alpha * angDiff(next, prev));
};

function shortestAngleDiff(a, b) {
    let diff = (b - a + 540) % 360 - 180;
    return diff; // dans [-180, +180]
}

function smallestAngleDiff(a, b) {
    // renvoie la différence entre a et b dans [-180, +180]
    let diff = ((b - a + 540) % 360) - 180;
    return diff;
}


// Médiane glissante (anti-spike)
const pushHeadingMedian = (h) => {
    headingWindow.push(norm360(h));
    if (headingWindow.length > 5) headingWindow.shift();
    const sorted = [...headingWindow].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[mid];
    return norm360((sorted[mid - 1] + sorted[mid]) / 2);
};

// Fonction pour calculer l'azimuth entre deux points
function calculateAzimuth(from, to) {
    // Vérifier que les paramètres sont valides
    if (!from || !to || 
        typeof from.lat === 'undefined' || typeof from.lng === 'undefined' ||
        typeof to.lat === 'undefined' || typeof to.lng === 'undefined') {
        console.error("Paramètres invalides pour calculateAzimuth:", { from, to });
        return 0; // Retourner 0 au lieu de NaN
    }
    
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const lng1 = from.lng * Math.PI / 180;
    const lng2 = to.lng * Math.PI / 180;
    
    const dLng = lng2 - lng1;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let azimuth = Math.atan2(y, x) * 180 / Math.PI;
    
    // Normaliser entre 0 et 360
    while (azimuth < 0) azimuth += 360;
    while (azimuth >= 360) azimuth -= 360;
    
    // Vérifier que le résultat est valide
    if (isNaN(azimuth)) {
        console.error("Azimuth calculé est NaN:", { from, to, lat1, lat2, lng1, lng2, dLng, x, y });
        return 0; // Retourner 0 au lieu de NaN
    }
    
    return azimuth;
}

function updateAndroidPoiUpGuidance() {
    const isAndroid = /android/i.test(navigator.userAgent);
    if (!isAndroid || !map || !userPositionMarker) return;
    resetAndroidMapAndMarkerForGoogleGuidance(gpsHeading);
    const userPos = userPositionMarker.getPosition();
    if (!userPos) return;
    applyMapViewForGuidance({ lat: userPos.lat(), lng: userPos.lng() });
}


function getUserPosition(successCallback, errorCallback, options) {
    if (navigator.geolocation) {
        // Si l'autorisation a déjà été demandée dans cette session, utiliser directement getCurrentPosition
        if (geoPermissionRequested) {
            navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
            return;
        }
        
        // Marquer que l'autorisation va être demandée
        geoPermissionRequested = true;
        
        // Vérifier d'abord l'état de l'autorisation via l'API Permissions si disponible
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
                
                if (permissionStatus.state === 'granted') {
                    // Autorisation déjà accordée, utiliser directement getCurrentPosition
                    localStorage.setItem('geoPermissionGranted', 'true');
                    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
                } else if (permissionStatus.state === 'denied') {
                    // Autorisation refusée
                    localStorage.setItem('geoPermissionGranted', 'false');
                    errorCallback(new Error("Autorisation de géolocalisation refusée"));
                } else {
                    // État 'prompt' - demander l'autorisation
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            // Autorisation accordée, mémoriser
                            localStorage.setItem('geoPermissionGranted', 'true');
                            successCallback(position);
                        },
                        (error) => {
                            // Autorisation refusée, mémoriser aussi
                            localStorage.setItem('geoPermissionGranted', 'false');
                            errorCallback(error);
                        },
                        options
                    );
                }
            }).catch(() => {
                // Fallback si l'API Permissions n'est pas disponible
                fallbackGetUserPosition(successCallback, errorCallback, options);
            });
        } else {
            // Fallback pour les navigateurs qui ne supportent pas l'API Permissions
            fallbackGetUserPosition(successCallback, errorCallback, options);
        }
    } else {
        console.error("La géolocalisation n'est pas supportée par ce navigateur.");
        if(errorCallback) errorCallback(new Error("Géolocalisation non supportée."));
    }
}

// Fonction de fallback pour les navigateurs sans API Permissions
function fallbackGetUserPosition(successCallback, errorCallback, options) {
    const geoPermissionGranted = localStorage.getItem('geoPermissionGranted');
    const isFirstLaunch = !localStorage.getItem('appLaunchedBefore');
    
    // Si l'autorisation a déjà été demandée dans cette session, utiliser directement getCurrentPosition
    if (geoPermissionRequested) {
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
        return;
    }
    
    // Au premier lancement ou si pas d'autorisation, forcer la demande
    if (geoPermissionGranted === 'true' && !isFirstLaunch) {
        // L'autorisation a déjà été donnée, utiliser directement getCurrentPosition
        geoPermissionRequested = true; // Marquer comme demandée
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
    } else {
        // Première fois ou autorisation non accordée, demander l'autorisation et la mémoriser
        geoPermissionRequested = true; // Marquer comme demandée
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Autorisation accordée, mémoriser
                localStorage.setItem('geoPermissionGranted', 'true');
                successCallback(position);
            },
            (error) => {
                // Autorisation refusée, mémoriser aussi
                localStorage.setItem('geoPermissionGranted', 'false');
                errorCallback(error);
            },
            options
        );
    }
}

// Nouvelle fonction popup harmonisée
function showStyledPopup(title, message, onClose, closeTextOverride) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = 'url("images/parchemin.jpg") center/cover';
    box.style.border = '4px solid #b8860b';
    box.style.borderRadius = '18px';
    box.style.boxShadow = '0 0 24px #0008';
    box.style.color = '#4b2e05';
    box.style.fontFamily = 'MedievalSharp, Arial, serif';
    box.style.padding = '32px 24px 24px 24px';
    box.style.maxWidth = '90vw';
    box.style.width = '400px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    const titleElem = document.createElement('h2');
    titleElem.textContent = title;
    titleElem.style.fontWeight = 'bold';
    titleElem.style.fontSize = '1.3em';
    titleElem.style.color = '#b30000';
    titleElem.style.marginBottom = '15px';
    box.appendChild(titleElem);

    const msgElem = document.createElement('div');
    msgElem.innerHTML = message;
    msgElem.style.marginBottom = '25px';
    msgElem.style.color = '#4b2e05';
    msgElem.style.lineHeight = '1.5';
    box.appendChild(msgElem);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = closeTextOverride || (window.translationManager ? window.translationManager.translate('close') : 'FERMER');
    closeBtn.style.background = '#b30000';
    closeBtn.style.color = 'white';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.padding = '12px 28px';
    closeBtn.style.fontSize = '1.1rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontFamily = 'MedievalSharp, Arial, serif';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        if (onClose) onClose();
    });
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// Utilisation pour le début du parcours
// Remplacer : showInfoPopup("Premier point", "Vous êtes déjà au début du parcours !");
// Par :
// showStyledPopup("Premier point", "Vous êtes déjà au début du parcours !");

// Utilisation pour l'aide boussole
// Remplacer l'appel showInfoPopup("Boussole", ...) par showStyledPopup("Boussole", ...);

function showInfoPopup(title, message, onClose) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  const box = document.createElement('div');
  box.style.background = '#fffbe6';
  box.style.padding = '32px 24px 24px 24px';
  box.style.borderRadius = '18px';
  box.style.boxShadow = '0 4px 32px #0005';
  box.style.textAlign = 'center';
  box.style.maxWidth = '90vw';
  box.style.fontSize = '1.1em';

  const titleElem = document.createElement('h2');
  titleElem.textContent = title;
  titleElem.style.marginBottom = '16px';
  titleElem.style.color = '#b30000';
  box.appendChild(titleElem);

  const msgElem = document.createElement('div');
  msgElem.innerHTML = message;
  msgElem.style.marginBottom = '24px';
  box.appendChild(msgElem);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'FERMER';
  closeBtn.style.background = '#b30000';
  closeBtn.style.color = 'white';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.fontSize = '1.1em';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.padding = '10px 28px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onClose) onClose();
  };
  box.appendChild(closeBtn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// === Fonction pour afficher le popup de fin de parcours ===
function showEndOfTourPopup() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = 'url("images/parchemin.jpg") center/cover';
    box.style.border = '6px solid #b8860b';
    box.style.borderRadius = '20px';
    box.style.boxShadow = '0 0 32px #000a';
    box.style.color = '#4b2e05';
    box.style.fontFamily = 'MedievalSharp, Arial, serif';
    box.style.padding = '40px 32px 32px 32px';
    box.style.maxWidth = '500px';
    box.style.textAlign = 'center';
    box.style.position = 'relative';

    const icon = document.createElement('div');
    icon.textContent = '⚔️🐉🏆';
    icon.style.fontSize = '3em';
    icon.style.marginBottom = '16px';
    box.appendChild(icon);

    const title = document.createElement('div');
    const victoryText = window.translationManager ? window.translationManager.translate('victory') : 'Victoire !';
    title.textContent = victoryText;
    title.style.fontWeight = 'bold';
    title.style.fontSize = '1.5em';
    title.style.color = '#b30000';
    title.style.marginBottom = '20px';
    box.appendChild(title);

    const msg = document.createElement('div');
    const victoryMessage = window.translationManager ? window.translationManager.translate('victory_message') : "C'est la dernière étape de votre parcours !<br><br>Bravo, vous avez vaincu le Dragon !<br>La bête est terrassée !<br><br><strong>Ein V'la co pou ein an !</strong><br><br>À l'arrivée, si vous le souhaitez, vous pourrez prendre un selfie avec Saint Georges !";
    msg.innerHTML = victoryMessage;
    msg.style.marginBottom = '28px';
    msg.style.color = '#222';
    box.appendChild(msg);

    const btnCompris = document.createElement('button');
    const understoodText = window.translationManager ? window.translationManager.translate('understood') : 'COMPRIS';
    btnCompris.textContent = understoodText;
    btnCompris.style.background = '#b30000';
    btnCompris.style.color = '#fff';
    btnCompris.style.fontWeight = 'bold';
    btnCompris.style.border = 'none';
    btnCompris.style.borderRadius = '10px';
    btnCompris.style.padding = '12px 24px';
    btnCompris.style.fontSize = '1.1em';
    btnCompris.style.cursor = 'pointer';
    btnCompris.style.fontFamily = 'MedievalSharp, Arial, serif';
    btnCompris.addEventListener('click', () => {
        document.body.removeChild(overlay);
        // Afficher le bouton selfie
        const selfieBtn = document.getElementById('selfie-btn');
        if (selfieBtn) {
            selfieBtn.style.display = 'block';
        }
    });

    box.appendChild(btnCompris);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

document.addEventListener("DOMContentLoaded", () => {
    nextButton = document.getElementById('next-btn');
    prevButton = document.getElementById('prev-btn');
    homeButton = document.getElementById('home-btn');
    cultureButton = document.getElementById('culture-btn');
    audioBtn = document.getElementById('audio-btn');
    poiInterestBtn = document.getElementById('poi-interest-btn');
    doudouBtn = document.getElementById('doudou-btn');
    pauseBtn = document.getElementById('pause-btn');
    stopBtn = document.getElementById('stop-btn');
    restartBtn = document.getElementById('restart-btn');
    const selfieBtn = document.getElementById('selfie-btn');
    const pwaInstallBtn = document.getElementById('pwa-install-btn');

    // Par défaut : le bouton "suivant" est verrouillé jusqu'à écoute de l'audio du point courant
    if (nextButton) nextButton.disabled = true;
    syncNextButtonState();

    // Lancer le processus (le splash screen sera caché une fois la carte prête)
    startMap();

    // Vérifier si le tour est terminé (après refus du selfie ou retour depuis selfie)
    if (localStorage.getItem('tourCompleted') === 'true') {
        disableAllControls();
    }

    // --- Ajout des écouteurs d'événements ---
    
    // Écouteur pour le bouton selfie
    if (selfieBtn) {
        selfieBtn.addEventListener('click', () => {
            // Arrêter tous les flux caméra ouverts
            if (window.stream) {
                try {
                    window.stream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    console.error('Erreur lors de l\'arrêt du flux caméra', e);
                }
            } else {
            }
            // Redirection vers la page selfie
            window.location.href = 'selfie.html';
        });
    }
    
    // Écouteur pour le bouton d'installation PWA
    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', () => {
            if (window.showManualInstructions) {
                window.showManualInstructions();
            } else {
            }
        });
    }
    
    nextButton.addEventListener('click', () => {
        // Force : écouter l'audio du point courant avant de passer au suivant
        const audioIdx = localStorage.getItem('mons_audio_clicked_index');
        if (String(audioIdx) !== String(currentIndex)) {
            if (nextButton) nextButton.disabled = true;
            const titleKey = 'audio_required_title';
            const msgKey = 'audio_required_message';
            const titleTranslated = window.translationManager ? window.translationManager.translate(titleKey) : null;
            const msgTranslated = window.translationManager ? window.translationManager.translate(msgKey) : null;
            showStyledPopup(
                (titleTranslated && titleTranslated !== titleKey) ? titleTranslated : "Audio requis",
                (msgTranslated && msgTranslated !== msgKey) ? msgTranslated : "Avant de passer au point suivant, appuie sur le bouton audio (🎧).",
                null
            );
            return;
        }
        
        // Masquer la flèche de guidage 2 si elle est visible
        if (typeof hideGuideArrow2 === 'function') {
            hideGuideArrow2();
        }
        
        stopAllAudio();
        if (localStorage.getItem("mons_quizEnabled") === null) {
            showQuizPrompt((wantsQuiz) => {
                quizEnabled = wantsQuiz;
                if (quizEnabled) {
                    showQuizForCurrentPoint(() => advanceToNextPoint());
                } else {
                    advanceToNextPoint();
                }
            });
        } else {
            quizEnabled = localStorage.getItem("mons_quizEnabled") === "true";
            if (quizEnabled) {
                showQuizForCurrentPoint(() => advanceToNextPoint());
            } else {
                advanceToNextPoint();
            }
        }
    });

    prevButton.addEventListener('click', () => {
        stopAllAudio();
        if (currentIndex > 0) {
            isReturning = true;
            if (distanceStack.length > 0) {
                const lastDistance = distanceStack.pop();
                totalDistance -= lastDistance;
            }
            // Enregistrer le point actuel comme visité avant de reculer
            const visitedPoints = JSON.parse(localStorage.getItem('mons_visitedPoints') || '[]');
            if (!visitedPoints.includes(currentIndex)) {
                visitedPoints.push(currentIndex);
                localStorage.setItem('mons_visitedPoints', JSON.stringify(visitedPoints));
            }
            currentIndex--;
            // Réinitialiser le flag pour permettre l'ajout de la distance au point précédent
            distanceAlreadyAddedForCurrentPoint = false;
            steps = [];
            currentStepIndex = 0;
            localStorage.setItem("mons_currentIndex", currentIndex);
            localStorage.setItem("mons_score", score);
            updateLocation();
            syncNextButtonState();
        } else {
            showStyledPopup(
                window.translationManager ? window.translationManager.translate('first_point_title') : "Premier point",
                window.translationManager ? window.translationManager.translate('first_point_message') : "Vous êtes déjà au début du parcours !"
            );
        }
    });

    homeButton.addEventListener("click", () => {
        const isMuseumMode = localStorage.getItem("museumMode") === "true";
        
        if (isMuseumMode) {
            // En mode musée, rediriger vers la sélection de langue
            showHomeConfirmPopup(() => {
                stopAllAudio();
                const orientationPerm = localStorage.getItem('orientationPermissionGranted');
                localStorage.clear();
                if (orientationPerm) localStorage.setItem('orientationPermissionGranted', orientationPerm);
                window.location.href = "language-selection.html";
            });
        } else {
            // En mode parcours normal, vérifier si l'app est installée et si un code valide existe
            showHomeConfirmPopup(() => {
                stopAllAudio();
                handleResetWithCodeCheck();
            });
        }
    });

    if (poiInterestBtn) {
        poiInterestBtn.addEventListener('click', () => {
            stopAllAudio();
            try {
                sessionStorage.setItem('clq_guidance_was_active', localStorage.getItem('geoPermissionGranted') === 'true' ? '1' : '0');
                localStorage.setItem('mons_currentIndex', String(currentIndex));
                localStorage.setItem('mons_score', String(score));
            } catch (e) {
                /* ignore */
            }
            window.location.href = "poi-experiment.html";
        });
    }

    audioBtn.addEventListener('click', () => {
        // Masquer la flèche de guidage 1 si elle est visible
        if (typeof hideGuideArrow1 === 'function') {
            hideGuideArrow1();
        }
        
        stopAllAudio();
        const current = filteredLocations[currentIndex];
        const imageElement = document.getElementById("point-image");
        if(current && current.audio) {
            const textFile = `data/${normalizeFileName(current.name)}.txt`;
            playExclusiveAudio(current.audio, textFile, imageElement);
            // Verrouillage levé pour le point courant une fois l'audio (point) lancé
            localStorage.setItem('mons_audio_clicked_index', String(currentIndex));
            syncNextButtonState();
            // Initialiser lastAudioLang lors du premier lancement
            if (lastAudioLang === null) {
                const currentLang = window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr';
                lastAudioLang = currentLang;
            }
        } else {
            // Si le point n'a pas d'audio (rare), on évite de bloquer le "suivant"
            localStorage.setItem('mons_audio_clicked_index', String(currentIndex));
            syncNextButtonState();
        }
    });

    doudouBtn.addEventListener('click', () => {
        stopAllAudio();
        const imageElement = document.getElementById("point-image");
        const textContainer = document.getElementById("media-display");
        
        fetch('data/Texte_chanson_doudou.txt')
            .then(response => response.text())
            .then(text => {
                if (textContainer) {
                    currentDescriptionText = text; // Mémoriser les paroles
                    isDoudouSongPlaying = true;    // Activer le flag
                    textContainer.innerText = text;
                    textContainer.style.display = "block";
                }
                if (imageElement) imageElement.style.display = "none";
            });
        
        playExclusiveAudio("Chansons/air_doudou.mp3");
        // Initialiser lastAudioLang lors du premier lancement (pour l'air du doudou, on garde la langue actuelle)
        if (typeof lastAudioLang === 'undefined' || lastAudioLang === null) {
            const currentLang = window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr';
            lastAudioLang = currentLang;
        }
    });

    // --- Ajout : mémorisation de la langue de la dernière lecture audio ---
    let lastAudioLang = null;

    pauseBtn.addEventListener('click', () => {
        const currentLang = window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr';
        if (currentAudio) {
            if (!currentAudio.paused) {
                currentAudio.pause();
                pauseBtn.textContent = "▶️";
            } else {
                // Si la langue a changé depuis la dernière lecture, relancer l'audio dans la nouvelle langue
                // MAIS seulement si lastAudioLang est déjà défini (pas null lors du premier play)
                if (lastAudioLang !== null && lastAudioLang !== currentLang) {
                    const current = filteredLocations[currentIndex];
                    const imageElement = document.getElementById("point-image");
                    if(current && current.audio) {
                        const textFile = `data/${normalizeFileName(current.name)}.txt`;
                        playExclusiveAudio(current.audio, textFile, imageElement);
                        lastAudioLang = currentLang;
                    }
                    pauseBtn.textContent = "⏸️";
                } else {
                    // Si lastAudioLang est null, c'est la première fois, on initialise et on reprend simplement
                    if (lastAudioLang === null) {
                        lastAudioLang = currentLang;
                    }
                    currentAudio.play();
                    pauseBtn.textContent = "⏸️";
                    // Restaurer le texte (description ou chanson) si on reprend la lecture
                    if (currentDescriptionText) {
                        const imageElement = document.getElementById("point-image");
                        const textContainer = document.getElementById("media-display");
                        if (imageElement && textContainer) {
                            imageElement.style.display = "none";
                            textContainer.style.display = "block";
                            textContainer.innerText = currentDescriptionText;
                        }
                    }
                }
            }
        } else {
            // Si aucun audio n'est chargé (après stop ou fin), relancer la description et l'audio dans la langue courante
            const current = filteredLocations[currentIndex];
            const imageElement = document.getElementById("point-image");
            if(current && current.audio) {
                const textFile = `data/${normalizeFileName(current.name)}.txt`;
                playExclusiveAudio(current.audio, textFile, imageElement);
                lastAudioLang = currentLang;
            }
            pauseBtn.textContent = "⏸️";
        }
    });

    stopBtn.addEventListener('click', () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            pauseBtn.textContent = "▶️";

            // Revert UI to image view, mais SANS vider le texte mémorisé
            const imageElement = document.getElementById("point-image");
            const textContainer = document.getElementById("media-display");
            if (imageElement && textContainer) {
                imageElement.style.display = "block";
                textContainer.style.display = "none";
                textContainer.innerText = "";
            }
        }
    });

    restartBtn.addEventListener('click', () => {
        if (currentAudio) {
            currentAudio.currentTime = 0;
            currentAudio.play();
            pauseBtn.textContent = "⏸️";

            // Ré-afficher le texte (description ou chanson) au redémarrage
            if (currentDescriptionText) {
                const imageElement = document.getElementById("point-image");
                const textContainer = document.getElementById("media-display");
                if (imageElement && textContainer) {
                    imageElement.style.display = "none";
                    textContainer.style.display = "block";
                    textContainer.innerText = currentDescriptionText;
                }
            }
        }
    });

    cultureButton.addEventListener("click", () => {
        stopAllAudio();
        localStorage.setItem("mons_currentIndex", currentIndex);
        localStorage.setItem("mons_score", score);
        window.location.href = "culture.html?v=" + Date.now();
    });

    // Popup d'aide pour la boussole au premier démarrage
    const compassHelpShown = localStorage.getItem('compassHelpShown');
    const orientationPermissionGranted = localStorage.getItem('orientationPermissionGranted') === 'true';

   
    // Afficher le popup si l'aide n'a pas déjà été montrée et si l'autorisation n'est pas accordée
    if (!compassHelpShown && !orientationPermissionGranted) {
        showTranslatedPopup('compass_title', 'compass_message');
    }

    // Affichage temporaire du bouton selfie pour les tests
    if (selfieBtn) {
        selfieBtn.style.display = 'block';
    }
});

function disableAllControls() {
    // Désactiver seulement les boutons de navigation et l'audio du point
    const buttonsToDisable = [
        nextButton, prevButton, audioBtn
    ];
    
    buttonsToDisable.forEach(button => {
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        }
    });

    // Cacher le bouton selfie
    const selfieBtn = document.getElementById('selfie-btn');
    if (selfieBtn) {
        selfieBtn.style.display = 'none';
    }

    if (map) {
        map.setOptions({ gestureHandling: 'none', zoomControl: false });
    }
}

// Fonction universelle pour tous les popups harmonisés
function showUniversalPopup({
  title = '',
  message = '',
  buttons = [{ label: 'FERMER', color: '#b30000', onClick: null }],
  icon1 = '⚔️',
  icon2 = '🐉',
  id = ''
}) {
  // Empêcher les doublons
  if (id && document.getElementById(id)) return;

  const overlay = document.createElement('div');
  if (id) overlay.id = id;
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  const box = document.createElement('div');
  box.style.background = 'url("images/parchemin.jpg") center/cover';
  box.style.border = '4px solid #b8860b';
  box.style.borderRadius = '18px';
  box.style.boxShadow = '0 0 24px #0008';
  box.style.color = '#4b2e05';
  box.style.fontFamily = 'MedievalSharp, Arial, serif';
  box.style.padding = '32px 24px 24px 24px';
  box.style.maxWidth = '90vw';
  box.style.width = '420px';
  box.style.textAlign = 'center';
  box.style.position = 'relative';

  // Icônes
  const icons = document.createElement('div');
  icons.style.fontSize = '2.5em';
  icons.style.marginBottom = '8px';
  icons.innerHTML = `<span>${icon1}</span> <span>${icon2}</span>`;
  box.appendChild(icons);

  // Titre
  const titleElem = document.createElement('div');
  titleElem.textContent = title;
  titleElem.style.fontWeight = 'bold';
  titleElem.style.fontSize = '1.4em';
  titleElem.style.color = '#b30000';
  titleElem.style.marginBottom = '12px';
  box.appendChild(titleElem);

  // Message
  const msgElem = document.createElement('div');
  msgElem.innerHTML = message;
  msgElem.style.marginBottom = '28px';
  msgElem.style.color = '#222';
  msgElem.style.fontFamily = 'MedievalSharp, Arial, serif';
  msgElem.style.fontSize = '1.08em';
  box.appendChild(msgElem);

  // Boutons
  const btns = document.createElement('div');
  btns.style.display = 'flex';
  btns.style.justifyContent = 'center';
  btns.style.gap = '18px';
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.label;
    button.style.background = btn.color;
    button.style.color = '#fff';
    button.style.fontWeight = 'bold';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.padding = '12px 28px';
    button.style.fontSize = '1.1rem';
    button.style.cursor = 'pointer';
    button.style.fontFamily = 'MedievalSharp, Arial, serif';
    button.addEventListener('click', () => {
      document.body.removeChild(overlay);
      if (btn.onClick) btn.onClick();
    });
    btns.appendChild(button);
  });
  box.appendChild(btns);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// Remplacer tous les anciens popups par showUniversalPopup avec les bons paramètres (titre, message, boutons, callbacks)

// --- Correction du popup boussole - style unifié ---
function showCompassHelpPopup() {
    if (isAndroidDevice() && localStorage.getItem('geoPermissionGranted') !== 'true') {
        return;
    }
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 10002;

    // Créer la boîte du popup - style unifié (centré via CSS popup-confirm)
    const box = document.createElement('div');
    box.className = 'popup-confirm';
    // Le centrage est géré par la classe popup-confirm via position: fixed, top: 50%, left: 50%, transform: translate(-50%, -50%)
    // On garde seulement les styles essentiels qui peuvent être overridés si nécessaire
    box.style.textAlign = 'center';

    // Icône
    const icon = document.createElement('div');
    icon.textContent = '🧭';
    icon.style.fontSize = '3em';
    icon.style.marginBottom = '16px';
    box.appendChild(icon);

    // Titre - style unifié
    const title = document.createElement('div');
    title.className = 'popup-title';
    const compassTitle = window.translationManager && window.translationManager.isLoaded ? 
        window.translationManager.translate('compass_title') : 'Boussole';
    title.textContent = compassTitle;
    title.style.fontWeight = '700';
    title.style.fontSize = '1.45rem';
    title.style.marginBottom = '18px';
    title.style.color = '#14365c';
    title.style.textShadow = '0 2px 4px rgba(0,0,0,0.25)';
    box.appendChild(title);

    // Message - couleur plus claire pour les explications (identique à parcours.html)
    const msg = document.createElement('div');
    const compassMsg = window.translationManager && window.translationManager.isLoaded ? 
        window.translationManager.translate('compass_message') : "APPUYER SUR L'ICONE BOUSSOLE AUTANT DE FOIS QUE NECESSAIRE POUR BENEFICIER DU GUIDAGE FLECHE";
    msg.innerHTML = compassMsg;
    msg.style.marginBottom = '24px';
    msg.style.color = '#2b6cb0';
    msg.style.fontSize = '14px';
    msg.style.lineHeight = '1.5';
    box.appendChild(msg);

    // Bouton boussole - style unifié
    const compassBtnPopup = document.createElement('button');
    compassBtnPopup.innerHTML = '🧭';
    compassBtnPopup.style.background = '#14365c';
    compassBtnPopup.style.color = 'white';
    compassBtnPopup.style.fontWeight = '600';
    compassBtnPopup.style.fontSize = '2em';
    compassBtnPopup.style.border = 'none';
    compassBtnPopup.style.borderRadius = '12px';
    compassBtnPopup.style.padding = '14px 32px';
    compassBtnPopup.style.cursor = 'pointer';
    compassBtnPopup.style.marginTop = '10px';
    compassBtnPopup.style.boxShadow = '0 8px 18px rgba(20,54,92,0.25)';
    compassBtnPopup.title = compassTitle;
    compassBtnPopup.addEventListener('click', (event) => {
        // Empêcher la propagation de l'événement
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Désactiver le bouton pour éviter les clics multiples
        compassBtnPopup.disabled = true;
        compassBtnPopup.style.opacity = '0.5';
        compassBtnPopup.style.cursor = 'not-allowed';
        
        
        // Nettoyer les permissions d'orientation pour forcer la demande
        localStorage.removeItem('orientationPermissionGranted');
        localStorage.removeItem('compassGuidanceActive');
        orientationPermissionRequested = false;
        
        
        // Fermer le popup immédiatement pour éviter les problèmes de timing
        setTimeout(() => {
            try {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                } else {
                }
            } catch (error) {
                console.error("🧭 Erreur lors de la fermeture du popup:", error);
            }
        }, 100); // Petit délai pour s'assurer que l'événement est traité
        
        // Demander l'autorisation d'orientation et activer le guidage fléché
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        localStorage.setItem('orientationPermissionGranted', 'true');
                        activateCompass();
                    } else {
                        // Autorisation refusée, mémoriser aussi
                        localStorage.setItem('orientationPermissionGranted', 'false');
                    }
                })
                .catch(error => {
                    console.error("Erreur lors de la demande d'autorisation d'orientation:", error);
                });
        } else {
            // Navigateur qui ne nécessite pas d'autorisation explicite
            localStorage.setItem('orientationPermissionGranted', 'true');
            activateCompass();
        }
    });
    box.appendChild(compassBtnPopup);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}



// --- Correction de la ligne d'info (heure/minutes, etc.) ---
function formatDuration(duration, lang) {
    // duration est une string comme "1 heure 12 min" ou "1 hour 12 min"
    // On veut remplacer les unités par la traduction
    if (!duration) return '';
    lang = lang || (window.translationManager ? window.translationManager.getCurrentLanguage() : 'fr');
    
    // Nettoyer d'abord le texte des traductions précédentes
    // Supprimer toutes les traductions possibles des unités de temps
    let cleanedDuration = duration
        .replace(/(Temps|Time|Tijd)\s*/g, '') // Supprimer les labels de temps traduits
        .replace(/(estimé|estimated|geschat)\s*:\s*/g, '') // Supprimer "estimé :"
        .replace(/(heures?|hours?|uren?)\s*/g, 'HEURE_PLACEHOLDER') // Remplacer temporairement
        .replace(/(heure|hour|uur)\s*/g, 'HEURE_PLACEHOLDER') // Remplacer temporairement
        .replace(/(minutes?|minuten?)\s*/g, 'MINUTE_PLACEHOLDER') // Remplacer temporairement
        .replace(/(min)\s*/g, 'MINUTE_PLACEHOLDER'); // Remplacer temporairement
    
    // Maintenant appliquer les nouvelles traductions
    let hKey = 'hour', hsKey = 'hours', mKey = 'minute', msKey = 'minutes';
    if (window.translationManager) {
        hKey = window.translationManager.translate('hour');
        hsKey = window.translationManager.translate('hours');
        mKey = window.translationManager.translate('minute');
        msKey = window.translationManager.translate('minutes');
    }
    
    // Remplacer les placeholders par les vraies traductions
    return cleanedDuration
        .replace(/HEURE_PLACEHOLDER/g, hKey)
        .replace(/MINUTE_PLACEHOLDER/g, mKey);
}

// --- Correction de l'affichage dynamique de la ligne d'info ---
// Dans la fonction qui affiche la ligne d'info (ex: calculateRoute, updateDisplayFallback, etc.),
// remplacer l'affichage de duration par formatDuration(duration)
// Exemple :
// const durationText = formatDuration(duration);
// ... puis utiliser durationText dans la ligne d'info

// --- Synchronisation du sélecteur de langue sur main.html ---
document.addEventListener('DOMContentLoaded', function() {
    if (window.languageSelector) {
        window.languageSelector.updateSelectorValue && window.languageSelector.updateSelectorValue();
    }
    
    // Écouter les changements de langue via un événement personnalisé
    document.addEventListener('languageChanged', function(event) {
        
        // Réinitialiser l'audio si un audio est en cours de lecture
        if (currentAudio && !currentAudio.paused) {
            
            // Mémoriser les informations de l'audio en cours
            const currentAudioSrc = currentAudio.src;
            const currentLocation = filteredLocations[currentIndex];
            
            // Arrêter l'audio actuel
            currentAudio.pause();
            currentAudio.currentTime = 0;
            
            // Relancer l'audio dans la nouvelle langue après un court délai
            setTimeout(() => {
                if (currentLocation && currentLocation.audio) {
                    const imageElement = document.getElementById("point-image");
                    const textFile = `data/${normalizeFileName(currentLocation.name)}.txt`;
                    playExclusiveAudio(currentLocation.audio, textFile, imageElement);
                }
            }, 100);
        }
        
        // Recharger les descriptions pour la nouvelle langue
        loadDescriptions();
        
        // Mettre à jour le splash screen si il est visible (seulement sur index.html)
        const isOnIndexPage = window.location.pathname.endsWith('index.html') || 
                             window.location.pathname.endsWith('/') || 
                             window.location.pathname === '';
        if (isOnIndexPage) {
            const splashText = document.getElementById('splash-text');
            if (splashText && window.translationManager) {
                const translation = window.translationManager.translate('splash_waiting');
                if (translation !== 'splash_waiting') {
                    splashText.innerHTML = translation;
                }
            }
        }
        
        // Mettre à jour la description affichée si elle est visible
        setTimeout(() => {
            const textContainer = document.getElementById("media-display");
            if (textContainer && textContainer.style.display !== "none") {
                const currentLocation = filteredLocations[currentIndex];
                if (currentLocation) {
                    const newDescription = getDescription(currentLocation.name);
                    if (newDescription) {
                        currentDescriptionText = newDescription;
                        textContainer.innerText = newDescription;
                    }
                }
            }
        }, 200); // Délai pour laisser le temps aux descriptions de se charger
        
        // Forcer la mise à jour de la ligne d'info
        setTimeout(updateCurrentDisplay, 100); // Petit délai pour laisser le temps aux traductions de se charger
    });
});

function showTranslatedPopup(titleKey, messageKey) {
    function tryShow() {
        if (window.translationManager && window.translationManager.isLoaded) {
            const title = window.translationManager.translate(titleKey);
            const message = window.translationManager.translate(messageKey);
            const closeText = window.translationManager.translate('close');
            
            // Si c'est la popup boussole, utiliser la fonction spécialisée
            if (titleKey === 'compass_title' && messageKey === 'compass_message') {
                showCompassHelpPopup();
            } else {
                showStyledPopup(title, message, null, closeText);
            }
        } else {
            setTimeout(tryShow, 100); // Réessaie dans 100ms
        }
    }
    tryShow();
}
// Utilisation : showTranslatedPopup('compass_title', 'compass_message');

// Fonction pour mettre à jour l'affichage actuel de la ligne d'info
function updateCurrentDisplay() {
    const display = document.getElementById('location-name');
    if (!display) {
        return;
    }
    
    // Si on est en mode musée
    const isMuseumMode = localStorage.getItem("museumMode") === "true";
    if (isMuseumMode) {
        const selectedMuseum = localStorage.getItem("selectedMuseum");
        if (selectedMuseum) {
            const museumTarget = window.translationManager ? window.translationManager.translate('museum_target') : '🎯 Musée :';
            const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
            const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
            // On ne peut pas retrouver la durée et la distance sans recalcul, donc on laisse le texte existant traduit
            const currentText = display.textContent;
            const museumName = currentText.split(' – ')[0].replace('🎯 Musée : ', '');
            const timePart = currentText.split(' – ')[1] || '';
            const distancePart = currentText.split(' – ')[2] || '';
            if (timePart && distancePart) {
                const translatedTimePart = formatDuration(timePart.replace(/^Temps estimé : |Estimated time: /, ''));
                const newText = `${museumTarget} ${museumName} – ${estimatedTime} ${translatedTimePart} – ${distanceLabel} ${distancePart.replace(/^Distance : |Distance: /, '')}`;
                display.textContent = newText;
            }
        }
    } else {
        // Mode parcours normal - utiliser les valeurs sauvegardées
        const currentLocation = filteredLocations[currentIndex];
        if (currentLocation) {
            const nextPoint = window.translationManager ? window.translationManager.translate('next_point') : 'Prochain point :';
            const estimatedTime = window.translationManager ? window.translationManager.translate('estimated_time') : 'Temps estimé :';
            const distanceLabel = window.translationManager ? window.translationManager.translate('distance') : 'Distance :';
            const totalDistanceLabel = window.translationManager ? window.translationManager.translate('total_distance') : 'Distance totale :';
            const scoreText = window.translationManager ? window.translationManager.translate('score') : 'Score :';
            
            // Calculer le score maximum basé sur le nombre de questions posées
            const maxScore = getMaxScoreBasedOnQuestions();
            
            // Utiliser les valeurs sauvegardées dans les variables globales
            const totalKm = (totalDistance / 1000).toFixed(2);
            const translatedTimeValue = formatDuration(currentPointDuration);
            
            display.textContent = `${nextPoint} ${currentLocation.name} – ${estimatedTime} ${translatedTimeValue} – ${distanceLabel} ${currentPointDistance} – ${totalDistanceLabel} ${totalKm} km – ${scoreText} ${score}/${maxScore}`;
        }
    }
}

// Fonction pour charger les traductions du quiz
async function loadQuizTranslations() {
    try {
        const response = await fetch('translations/quiz_translations.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        window.quizTranslations = await response.json();
    } catch (error) {
        console.error('❌ Erreur lors du chargement des traductions du quiz:', error);
        window.quizTranslations = {};
    }
}

// Fonction pour réinitialiser la rotation de la carte
function resetMapRotation() {
    if (map) {
        try {
            // Méthode 1: Rotation via CSS (priorité sur mobile)
            const mapDiv = document.getElementById('map');
            if (mapDiv) {
                // Chercher l'élément Google Maps à l'intérieur
                const googleMapElement = mapDiv.querySelector('.gm-style') || mapDiv.querySelector('[style*="transform"]') || mapDiv;
                
                if (googleMapElement) {
                    googleMapElement.style.transform = 'rotate(0deg)';
                } else {
                    mapDiv.style.transform = 'rotate(0deg)';
                }
            } else {
                // Méthode 2: setHeading (si supporté)
                if (typeof map.setHeading === 'function') {
                    map.setHeading(0);
                } else {
                    // Méthode 3: setOptions
                    map.setOptions({ heading: 0 });
                }
            }
            
            // Remettre aussi la flèche à 0
            if (userPositionMarker) {
                const icon = userPositionMarker.getIcon();
                if (icon) {
                    icon.rotation = 0;
                    userPositionMarker.setIcon(icon);
                    currentArrowRotation = 0;
                }
            }
        } catch (error) {
            console.error("❌ Erreur lors de la réinitialisation de la rotation:", error);
        }
    }
}

// Fonction pour forcer le centrage de la carte sur l'utilisateur (avec zoom adapté à la distance)
function centerMapOnUser() {
    if (map && userPositionMarker) {
        const userPos = userPositionMarker.getPosition();
        if (userPos) {
            map.set('userHasPanned', false);
            applyMapViewForGuidance(userPos);
        }
    }
}

// Fonction pour tester l'orientation
function testOrientation() {
    if (window.DeviceOrientationEvent) {
        // Test temporaire de l'orientation
        const testHandler = (event) => {
            // Supprimer le test après 3 secondes
            setTimeout(() => {
                window.removeEventListener('deviceorientation', testHandler);
            }, 3000);
        };
        
        window.addEventListener('deviceorientation', testHandler);
    }
}

// Fonction pour tester la rotation CSS
function testCSSRotation() {
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        // Chercher l'élément Google Maps à l'intérieur
        const googleMapElement = mapDiv.querySelector('.gm-style') || mapDiv.querySelector('[style*="transform"]') || mapDiv;
        
        if (googleMapElement) {
            // Test de rotation de 90 degrés sur l'élément Google Maps
            googleMapElement.style.transform = 'rotate(90deg)';
            
            // Remettre à 0 après 2 secondes
            setTimeout(() => {
                googleMapElement.style.transform = 'rotate(0deg)';
            }, 2000);
        } else {
            // Fallback sur le conteneur principal
            mapDiv.style.transform = 'rotate(90deg)';
            
            // Remettre à 0 après 2 secondes
            setTimeout(() => {
                mapDiv.style.transform = 'rotate(0deg)';
            }, 2000);
        }
    }
}



// Fonction pour gérer les changements d'orientation de l'appareil
function handleOrientationChange() {
    if (isCompassActive && userPositionMarker) {
        // Forcer une mise à jour de l'orientation pour corriger la rotation
        setTimeout(() => {
            // Déclencher un événement d'orientation factice pour forcer la mise à jour
            const fakeEvent = {
                webkitCompassHeading: null,
                alpha: 0
            };
            handleOrientation(fakeEvent);
        }, 100);
        
    }
}

// Fonction de test pour Android - rotation de la carte
function testAndroidRotation() {
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
        
        // Tester les différentes orientations
        const orientations = [0, 90, 180, 270];
        orientations.forEach((angle, index) => {
            setTimeout(() => {
                // Simuler l'orientation
                Object.defineProperty(window, 'orientation', {
                    value: angle,
                    writable: true
                });
                
                // Tester la correction
                const testRotation = 45; // Rotation de base
                const correctedRotation = correctRotationForDeviceOrientation(testRotation);
            }, index * 1000);
        });
    }
}

// Fonction pour restaurer l'état de la boussole
function restoreCompassState() {
    const orientationPermissionGranted = localStorage.getItem('orientationPermissionGranted');
    const compassGuidanceActive = localStorage.getItem('compassGuidanceActive');
    const isComingFromLanguageSelection = sessionStorage.getItem('comingFromLanguageSelection') === 'true';
    
    // Ne pas restaurer si on vient de language-selection.html
    if (isComingFromLanguageSelection) {
        return;
    }
    
    if (orientationPermissionGranted === 'true' && compassGuidanceActive === 'true') {
        orientationPermissionRequested = true;
        isCompassActive = true;
        
        // Ne pas restaurer si on est sur la page de sélection de langue
        const isLanguageSelectionPage = window.location.pathname.includes('language-selection.html') || 
                                        window.location.pathname.includes('language-selection');
        if (isLanguageSelectionPage) {
            return;
        }
        
        // Android : utiliser deviceorientationabsolute pour avoir des valeurs absolues
        const isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid && 'ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
        }
        window.addEventListener('orientationchange', handleOrientationChange);
        
        // Attendre que la carte et le marqueur utilisateur soient prêts
        const checkAndRestore = () => {
            if (userPositionMarker && map) {
                const fakeEvent = {
                    webkitCompassHeading: 0,
                    alpha: 0
                };
                handleOrientation(fakeEvent);
            } else {
                setTimeout(checkAndRestore, 500);
            }
        };
        
        // Démarrer la vérification après un délai
        setTimeout(checkAndRestore, 1000);
    } else {
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    
    window.recalculateRoute = function() {
        if (userPositionMarker) {
            const currentPos = userPositionMarker.getPosition();
            if (currentPos) {
                const pos = { lat: currentPos.lat(), lng: currentPos.lng() };
                calculateRouteFromPosition(pos, "Votre position");
            } else {
            }
        } else {
        }
    };
    
    window.testPermissions = function() {
    };
    
    window.forcePermissionRequest = function() {
        // Nettoyer les permissions
        localStorage.removeItem('geoPermissionGranted');
        localStorage.removeItem('orientationPermissionGranted');
        localStorage.removeItem('compassGuidanceActive');
        // Réinitialiser les flags
        geoPermissionRequested = false;
        orientationPermissionRequested = false;
        mapLoadInitiated = false;
        // Marquer comme venant de language-selection
        sessionStorage.setItem('comingFromLanguageSelection', 'true');
        // Relancer updateLocation
        updateLocation();
    };
    
    window.forceCompassRequest = function() {
        // Nettoyer les permissions d'orientation
        localStorage.removeItem('orientationPermissionGranted');
        localStorage.removeItem('compassGuidanceActive');
        orientationPermissionRequested = false;
        // Afficher directement le popup de boussole
        showCompassHelpPopup();
    };
    
    // Nettoyer le sessionStorage quand l'utilisateur quitte la page
    window.addEventListener('pagehide', () => {
        sessionStorage.removeItem('comingFromLanguageSelection');
        releaseTransientMapResourcesForLeave();
    });
});

function toggleCompass() {
    if (!orientationPermissionRequested) {
        // Demander la permission d'accès à l'orientation
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        orientationPermissionRequested = true;
                        localStorage.setItem('orientationPermissionGranted', 'true');
                        activateCompass();
                    } else {
                        alert('Permission refusée pour l\'accès à l\'orientation de l\'appareil.');
                    }
                })
                .catch(console.error);
        } else {
            // Sur les navigateurs qui ne demandent pas de permission
            orientationPermissionRequested = true;
            localStorage.setItem('orientationPermissionGranted', 'true');
            activateCompass();
        }
    }
    // Suppression de la logique de désactivation - la boussole reste toujours active
}

function activateCompass() {
    isCompassActive = true;
    localStorage.setItem('compassGuidanceActive', 'true');
    
    // Android : utiliser deviceorientationabsolute pour avoir des valeurs absolues
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid && 'ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
    }
    window.addEventListener('orientationchange', handleOrientationChange);
}

// La fonction deactivateCompass n'est plus nécessaire car la boussole reste toujours active

// === DEBUG ORIENTATION / ANDROID & iOS ===
// DÉSACTIVÉ : Ce listener de debug peut causer des problèmes sur Android
// en appelant handleOrientation trop tôt avant l'initialisation complète
// Le listener deviceorientation est déjà géré par activateCompass() et restoreCompassState()
/*
window.addEventListener('load', () => {
    console.log('[ORIENT-DEBUG] window load, tentative d'attacher DeviceOrientationEvent');
  
    if (window.DeviceOrientationEvent) {
      console.log('[ORIENT-DEBUG] DeviceOrientationEvent supporté, ajout du listener');
  
      window.addEventListener('deviceorientation', (evt) => {
        console.log(
          '[ORIENT-DEBUG] deviceorientation brut',
          'alpha=', evt.alpha,
          'beta=', evt.beta,
          'gamma=', evt.gamma,
          'webkitCompassHeading=', evt.webkitCompassHeading
        );
  
        try {
          handleOrientation(evt);
        } catch (e) {
          console.error('[ORIENT-DEBUG] erreur dans handleOrientation :', e);
        }
      }, true);
    } else {
      console.warn('[ORIENT-DEBUG] DeviceOrientationEvent NON supporté sur ce device/navigateur');
    }
  });
*/
  

