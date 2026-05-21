// content-loader.js
import { fetchAndDecrypt } from './secure-content.js';

const API_BASE = 'http://localhost:8080';

function getToken() {
  return localStorage.getItem('jwt') || '';
}

export async function loadEncryptedContent() {
  const token = getToken();
  if (!token) throw new Error('no_token_in_storage');

  // 1) métadonnées
  const meta = await fetch(`${API_BASE}/api/content/latest`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => {
    if (!r.ok) throw new Error('latest_failed');
    return r.json();
  });

  if (!meta.key_base64_dev) throw new Error('no_dev_key'); // en prod on passera à la clé enveloppée

  // 2) téléchargement + déchiffrement
  const data = await fetchAndDecrypt({
    token,
    url: API_BASE + meta.url,
    keyBase64: meta.key_base64_dev
  });

  // 3) expose pour l’app
  window.__CITY_DATA__ = data;
  return { meta, data };
}

// auto-load (tu peux retirer si tu veux déclencher ailleurs)
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data } = await loadEncryptedContent();
    // window.initApp && window.initApp(data);
  } catch (e) {
    console.warn('loadEncryptedContent failed:', e.message);
  }
});
