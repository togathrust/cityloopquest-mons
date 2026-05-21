import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const imgDir = path.join(root, "images");

const circuitSrc = fs.readFileSync(path.join(root, "circuit-data.js"), "utf8");
const locRe =
    /\{\s*name:\s*"([^"]+)"[^}]*audio:\s*"([^"]+\.mp3)"/g;
const locations = [];
let m;
while ((m = locRe.exec(circuitSrc)) !== null) {
    locations.push({ name: m[1], audio: m[2] });
}

const skip = /^(flag-|cityLoop|correct|incorrect|fond)/i;
const files = fs
    .readdirSync(imgDir)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f) && !skip.test(f));

function norm(s) {
    return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

for (const loc of locations) {
    const base = path.basename(loc.audio, ".mp3");
    let match =
        files.find((f) => path.parse(f).name === base) ||
        files.find((f) => norm(path.parse(f).name) === norm(base));
    console.log(`${loc.name}\t${match ? "images/" + match : "MISSING"}\t${base}`);
}
