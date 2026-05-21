// secure-content.js
export async function fetchAndDecrypt({ token, url, keyBase64 }) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('download_failed');
  const buf = await res.arrayBuffer();

  // Paquet = [IV(12)][TAG(16)][CIPHER(...)]
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const cipher = buf.slice(28);

  // WebCrypto attend le TAG à la fin
  const cipherWithTag = new Uint8Array(cipher.byteLength + 16);
  cipherWithTag.set(new Uint8Array(cipher), 0);
  cipherWithTag.set(new Uint8Array(tag), cipher.byteLength);

  const rawKey = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, cipherWithTag.buffer);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(plain)));
}
