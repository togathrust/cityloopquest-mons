/**
 * Supprime des propositions POI dans Netlify Blobs (store clq-poi).
 *
 * Usage :
 *   node scripts/delete-poi-blobs.mjs prop_xxx_yyy
 *   node scripts/delete-poi-blobs.mjs --list
 *   node scripts/delete-poi-blobs.mjs --test-names   (supprime nom Test*, status any)
 *
 * Prérequis : site lié (`netlify link`) ou NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN dans .env
 */
import { config } from "dotenv";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

config({ path: path.join(ROOT, ".env.local") });
config({ path: path.join(ROOT, ".env") });

const STORE = "clq-poi";

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8" });
}

function listBlobs() {
  const out = run(`netlify blobs:list ${STORE} --json`);
  return JSON.parse(out).blobs || [];
}

function deleteKey(key) {
  run(`netlify blobs:delete ${STORE} ${key}`);
  console.log("Deleted:", key);
}

function getMeta(propId) {
  const key = `poi/${propId}.json`;
  try {
    const raw = execSync(`netlify blobs:get ${STORE} ${key}`, {
      cwd: ROOT,
      encoding: "utf8",
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);

if (args.includes("--list")) {
  const blobs = listBlobs();
  for (const b of blobs) console.log(b.key);
  process.exit(0);
}

if (args.includes("--test-names")) {
  const blobs = listBlobs();
  const ids = new Set();
  for (const b of blobs) {
    const m = b.key.match(/^poi\/(prop_[^.]+)\.json$/);
    if (m) ids.add(m[1]);
  }
  for (const id of ids) {
    const meta = getMeta(id);
    if (!meta) continue;
    const n = String(meta.name || "").trim().toLowerCase();
    if (/^test\d*$/.test(n) || n.startsWith("test ")) {
      deleteKey(`poi/${id}.json`);
      deleteKey(`poi/${id}.jpg`);
      console.log("Removed test POI:", meta.name, id, meta.status);
    }
  }
  process.exit(0);
}

const ids = args.filter((a) => !a.startsWith("-"));
if (!ids.length) {
  console.error("Indiquez un id (ex. prop_mpcog5x6_fibwln) ou --list / --test-names");
  process.exit(1);
}

for (const id of ids) {
  deleteKey(`poi/${id}.json`);
  deleteKey(`poi/${id}.jpg`);
}
