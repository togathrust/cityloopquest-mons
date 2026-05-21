// Helper pour sauvegarder les données dans localStorage ET IndexedDB
// IndexedDB est partagé entre le navigateur et l'app installée sur iOS/Android

const DB_NAME = 'cityloopquest_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

// Ouvrir la base de données IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Sauvegarder une valeur dans localStorage ET IndexedDB
async function saveData(key, value) {
  // Sauvegarder dans localStorage (pour compatibilité)
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[storage] Erreur localStorage pour ${key}:`, e);
  }
  
  // Sauvegarder dans IndexedDB (pour PWA installée)
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.put(value, key);
  } catch (e) {
    console.warn(`[storage] Erreur IndexedDB pour ${key}:`, e);
  }
}

// Récupérer une valeur depuis localStorage OU IndexedDB
async function getData(key) {
  // Essayer localStorage d'abord
  let value = localStorage.getItem(key);
  if (value !== null) {
    return value;
  }
  
  // Si localStorage est vide, essayer IndexedDB
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const value = request.result;
        if (value !== undefined) {
          // Restaurer dans localStorage pour compatibilité
          try {
            localStorage.setItem(key, value);
          } catch (e) {
            console.warn(`[storage] Erreur restauration localStorage pour ${key}:`, e);
          }
          resolve(value);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn(`[storage] Erreur IndexedDB pour ${key}:`, e);
    return null;
  }
}

// Sauvegarder toutes les données importantes après un achat
async function savePurchaseData(data) {
  
  const keysToSave = [
    'clq_token',
    'jwt',
    'clq_has_access',
    'clq_short_code',
    'selectedLanguage',
    'user_version'
  ];
  
  let savedKeys = [];
  for (const key of keysToSave) {
    const value = data[key] || localStorage.getItem(key);
    if (value) {
      await saveData(key, value);
      savedKeys.push(key);
    }
  }
  
  
  // Sauvegarder aussi webLanguageSelected dans sessionStorage
  if (data.selectedLanguage) {
    sessionStorage.setItem('webLanguageSelected', 'true');
  }
}

// Restaurer toutes les données importantes au démarrage
async function restorePurchaseData() {
  
  const keysToRestore = [
    'clq_token',
    'jwt',
    'clq_has_access',
    'clq_short_code',
    'selectedLanguage',
    'user_version'
  ];
  
  let restored = false;
  let restoredKeys = [];
  
  for (const key of keysToRestore) {
    try {
      const value = await getData(key);
      if (value && !localStorage.getItem(key)) {
        localStorage.setItem(key, value);
        restored = true;
        restoredKeys.push(key);
      }
    } catch (error) {
      console.error(`[storage] ❌ Erreur lors de la restauration de ${key}:`, error);
    }
  }
  
  if (restored) {
    // S'assurer que webLanguageSelected est défini si on a une langue
    if (localStorage.getItem('selectedLanguage') && !sessionStorage.getItem('webLanguageSelected')) {
      sessionStorage.setItem('webLanguageSelected', 'true');
    }
  } else {
  }
  
  return restored;
}

// Exporter les fonctions
window.storageHelper = {
  saveData,
  getData,
  savePurchaseData,
  restorePurchaseData
};

