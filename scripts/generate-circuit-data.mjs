/**
 * Régénère circuit-data.js avec champ image explicite (même base que audio).
 * Usage: node scripts/generate-circuit-data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const imgDir = path.join(root, "images");
const circuitPath = path.join(root, "circuit-data.js");

const src = fs.readFileSync(circuitPath, "utf8");
const locRe =
    /\{\s*name:\s*"([^"]+)"\s*,\s*lat:\s*([^,]+)\s*,\s*lng:\s*([^,]+)\s*,\s*audio:\s*"([^"]+)"/g;

const skip = /^(flag-|cityLoop|correct|incorrect|fond)/i;
const imageFiles = fs
    .readdirSync(imgDir)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f) && !skip.test(f));

function norm(s) {
    return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function resolveImage(audioPath) {
    const base = path.basename(audioPath, ".mp3");
    const found =
        imageFiles.find((f) => path.parse(f).name === base) ||
        imageFiles.find((f) => norm(path.parse(f).name) === norm(base));
    if (!found) {
        console.warn("Image manquante pour", base);
        return `images/${base}.jpg`;
    }
    return `images/${found}`;
}

const locations = [];
let m;
while ((m = locRe.exec(src)) !== null) {
    locations.push({
        name: m[1],
        lat: m[2],
        lng: m[3],
        audio: m[4],
        image: resolveImage(m[4]),
    });
}

const circuitsMatch = src.match(/const circuits = \{[\s\S]*\};/);
if (!circuitsMatch) throw new Error("circuits block not found");

const lines = locations.map((loc) => {
    return `    { name: ${JSON.stringify(loc.name)}, lat: ${loc.lat}, lng: ${loc.lng}, audio: ${JSON.stringify(loc.audio)}, image: ${JSON.stringify(loc.image)} }`;
});

const out = `// Fichier contenant uniquement les données des circuits et locations
// Utilisé par parcours.html pour éviter d'importer tout app.js
// Champ image : chemin explicite sous images/ (ne pas reconstruire le nom).

const locations = [
${lines.join(",\n")}
];

${circuitsMatch[0]}
`;

fs.writeFileSync(circuitPath, out, "utf8");
console.log("Wrote", circuitPath, "—", locations.length, "points avec image explicite.");
