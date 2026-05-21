/**
 * Résolution fichier image POI ↔ disque (accents, casse, noms proches).
 */
import fs from "fs";
import path from "path";

const IMG_EXT = /\.(jpe?g|png|webp|gif)$/i;

export function normalizeKey(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function buildPoiImageIndex(imgDir) {
  const abs = path.resolve(imgDir);
  if (!fs.existsSync(abs)) {
    return { dir: abs, files: [], byNorm: new Map(), stems: [] };
  }
  const files = fs.readdirSync(abs).filter((f) => IMG_EXT.test(f));
  const byNorm = new Map();
  const stems = [];
  for (const file of files) {
    const norm = normalizeKey(file);
    if (!byNorm.has(norm)) byNorm.set(norm, file);
    stems.push({
      file,
      norm,
      stemNorm: normalizeKey(path.parse(file).name),
    });
  }
  return { dir: abs, files, byNorm, stems };
}

function scoreStem(stemNorm, poiNorm) {
  if (!stemNorm || !poiNorm) return 0;
  if (stemNorm === poiNorm) return 100;
  if (stemNorm.startsWith(poiNorm) || poiNorm.startsWith(stemNorm)) return 85;
  if (stemNorm.includes(poiNorm) || poiNorm.includes(stemNorm)) {
    const ratio =
      Math.min(stemNorm.length, poiNorm.length) /
      Math.max(stemNorm.length, poiNorm.length);
    return 50 + Math.round(ratio * 30);
  }
  return 0;
}

/**
 * @param {string} expectedFile - nom fichier ou chemin catalogué
 * @param {string} poiName - nom affiché du POI
 * @param {ReturnType<typeof buildPoiImageIndex>} index
 * @returns {string|null} nom de fichier dans le dossier (pas le chemin complet)
 */
export function resolvePoiImageFile(expectedFile, poiName, index) {
  if (!index || !index.stems.length) return null;

  const tryNames = [];
  if (expectedFile) {
    const raw = String(expectedFile).trim();
    try {
      const decoded = decodeURIComponent(raw);
      tryNames.push(path.basename(decoded));
    } catch {
      tryNames.push(path.basename(raw));
    }
    tryNames.push(path.basename(raw));
  }
  if (poiName) {
    tryNames.push(`${poiName}.jpg`, `${poiName}.png`, `${poiName}.JPG`);
  }

  for (const name of tryNames) {
    if (!name) continue;
    const hit = index.byNorm.get(normalizeKey(name));
    if (hit) return hit;
  }

  const poiNorm = normalizeKey(poiName);
  let best = null;
  let bestScore = 0;
  for (const entry of index.stems) {
    const sc = scoreStem(entry.stemNorm, poiNorm);
    if (sc > bestScore) {
      bestScore = sc;
      best = entry.file;
    }
  }
  if (bestScore >= 85) return best;

  if (expectedFile) {
    const stemNorm = normalizeKey(path.parse(path.basename(expectedFile)).name);
    best = null;
    bestScore = 0;
    for (const entry of index.stems) {
      const sc = scoreStem(entry.stemNorm, stemNorm);
      if (sc > bestScore) {
        bestScore = sc;
        best = entry.file;
      }
    }
    if (bestScore >= 80) return best;
  }

  return null;
}

export function imagePathsFromFile(fileName, rootDir) {
  if (!fileName) {
    return { image: null, photos: [] };
  }
  const rel = `images/points interets/${fileName}`;
  const encoded =
    "images/points%20interets/" +
    fileName.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  return {
    image: rel,
    photos: [encoded],
  };
}
