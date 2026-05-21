// build.mjs
import { rm, mkdir, readFile, writeFile, copyFile, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fg from "fast-glob";
import { minify as minifyHTML } from "html-minifier-terser";
import CleanCSS from "clean-css";
import { minify as terserMinify } from "terser";
import JavaScriptObfuscator from "javascript-obfuscator";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const OBFUSCATOR_CONFIG_PATH = path.join(ROOT, "obfuscator.config.json");
const VERSION_JS_PATH = path.join(ROOT, "version.js");
const RELEASE_NOTES_PATH = path.join(ROOT, "release notes.txt");
const ENV_PATH = path.join(ROOT, ".env");
const ENV_LOCAL_PATH = path.join(ROOT, ".env.local");

// Charger les variables d'environnement
config({ path: ENV_LOCAL_PATH }); // .env.local a la prioritÃ©
config({ path: ENV_PATH }); // puis .env

// Which JS files to obfuscate (in dist paths, glob patterns allowed)
const JS_TARGETS = [
  "app.js",
  "checkout.js",
  "js/access-control.js",
  "js/access-guard.js"
];

// Skip minified/vendor files when minifying (still obfuscate our app code)
const MINIFY_JS_EXCLUDE = [
  "**/*.min.js",
  "js/vendor/**"
];

// HTML minify options
const htmlOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: false,
  minifyCSS: true,
  minifyJS: false // we'll minify JS separately to control ECMA level
};

// Terser options (modern syntax!)
const terserOptions = {
  ecma: 2020,
  module: false,
  compress: { ecma: 2020, passes: 2, drop_console: false },
  mangle: true,
  format: { ecma: 2020 }
};

// Load obfuscator config (fallback to sane defaults if missing)
let obfConfig = {
  target: "browser",
  compact: true,
  stringArray: true,
  stringArrayEncoding: ["rc4"],
  rotateStringArray: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  selfDefending: false,
  disableConsoleOutput: false,
  renameGlobals: false,
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: true,
  simplify: true,
  transformObjectKeys: true,
  reservedNames: [
    "ServiceWorkerGlobalScope",
    "Workbox",
    "Stripe",
    "google",
    "grecaptcha",
    "navigator",
    "window",
    "location",
    "clqShowMainGeoPrompt",
    "clqHideMainGeoPrompt",
    "clqActivateMainGeolocation",
    "clqClearMainGeoOnLeave",
    "clqRequestGeolocationOnMainEnter",
    "clqResetGeoWrapperState",
    "clqOnMainGeoActivated",
    "clqOnMainGeoFailed",
    "beginMainGeolocationAfterMapReady",
    "__clqGeoNative",
    "__clqGeoUserInitiated",
    "isMainGeoPromptVisible",
    "startGeolocationWatch",
    "getNativeGeolocation",
    "tryResumeGrantedGeolocation",
    "isHandheldPhone",
    "activateFromUserGesture",
    "invokeGeolocationRequest",
    "updatePointPhotoForCurrentIndex",
    "clqStartGeolocationWatchFromGesture",
    "confirmGeolocationFix",
    "geoFixConfirmed",
    "isGeolocationFixTrustworthy",
    "updateGeoOverlayWaitingMessage",
    "clqIsInAppEmbeddedBrowser",
    "clqNeedsSafariForGeo",
    "clqIsInstalledPwa",
    "clqShowInAppSafariOverlay",
    "applyWalkNavigationHeading",
    "clqOpenInChrome",
    "clqOpenInSafariOrDefault",
    "clqIsRealMobileBrowser",
    "clqDismissInAppSafariOverlay",
    "clqClickHiddenLink",
    "clqEnsureCompassPermission",
    "__clqInAppOverlayDismissed",
    "clqCopyAppLink",
    "clqInAppChromeHelp"
  ]
};
try {
  const raw = await readFile(OBFUSCATOR_CONFIG_PATH, "utf8");
  obfConfig = JSON.parse(raw);
} catch {
  // keep defaults
}

function log(step, ...args) {
  console.log(`â–¶ ${step}`, ...args);
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * ðŸ”¢ Versioning par date
 * - Format : YY.MM.PP
 *   - YY = deux derniers chiffres de l'annÃ©e courante
 *   - MM = mois courant (01â€“12)
 *   - PP = numÃ©ro de build pour ce mois
 * - Si mÃªme annÃ©e/mois que la prÃ©cÃ©dente version â†’ PP++
 * - Si annÃ©e ou mois changent â†’ PP = 1
 */
async function bumpVersion() {
  const now = new Date();
  const currentYear = now.getFullYear() % 100;   // 2025 â†’ 25
  const currentMonth = now.getMonth() + 1;       // 0â€“11 â†’ 1â€“12

  let previousYear = currentYear;
  let previousMonth = currentMonth;
  let previousPatch = 0;

  // Lire l'ancienne version UNIQUEMENT dans version.js
  if (await exists(VERSION_JS_PATH)) {
    try {
      const content = await readFile(VERSION_JS_PATH, "utf8");
      const match = content.match(
        /APP_VERSION\s*=\s*'(\d{2})\.(\d{2})\.(\d+)'/
      );
      if (match) {
        previousYear = parseInt(match[1], 10);
        previousMonth = parseInt(match[2], 10);
        previousPatch = parseInt(match[3], 10);
      }
    } catch (e) {
      console.warn(
        "[warn] unable to parse version.js, fallback starting at 01:",
        e.message
      );
      previousPatch = 0;
    }
  }

  let newPatch;
  if (
    previousYear === currentYear &&
    previousMonth === currentMonth &&
    Number.isFinite(previousPatch)
  ) {
    // MÃªme annÃ©e + mÃªme mois â†’ on incrÃ©mente
    newPatch = previousPatch + 1;
  } else {
    // Nouveau mois ou nouvelle annÃ©e â†’ on redÃ©marre Ã  1
    newPatch = 1;
  }

  const yy = String(currentYear).padStart(2, "0");
  const mm = String(currentMonth).padStart(2, "0");
  const pp = String(newPatch).padStart(2, "0");
  const newVersion = `${yy}.${mm}.${pp}`;

  log("version", `bumped version to ${newVersion}`);

  // âœï¸ Met Ã  jour version.js
  const jsContent =
    `// Auto-generated by build.mjs\n` +
    `window.APP_VERSION = '${newVersion}';\n`;
  await writeFile(VERSION_JS_PATH, jsContent, "utf8");
  log("version", "updated version.js");

  // ðŸ“ Met Ã  jour release notes.txt (on PREPEND le nouveau header)
  const header =
    "CityLoop Quest Mons - Release notes\r\n" +
    `Version ${newVersion}\r\n` +
    "----------------------------------------\r\n\r\n";

  let previousNotes = "";
  if (await exists(RELEASE_NOTES_PATH)) {
    previousNotes = await readFile(RELEASE_NOTES_PATH, "utf8");
  }
  await writeFile(RELEASE_NOTES_PATH, header + previousNotes, "utf8");
  log("version", "updated release notes.txt");

  return newVersion;
}



async function clean() {
  log("clean", DIST);
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
}

async function copyAll() {
  log("copy", "copying project files to dist/ (file-by-file)");

  // Tout prendre sauf node_modules, dist, .git, maps, la build, le dossier scripts, et les fichiers sensibles
  const entries = await fg(
    [
      "**/*",
      "!node_modules/**",
      "!dist/**",
      "!.git/**",
      "!**/*.map",
      "!build.mjs",
      "!scripts/**",
      "!data/OLD*.json",
      "!.env",
      "!.env.local",
      "!ClÃ© API.txt" // Ne pas copier le fichier de clÃ© API
    ],
    { cwd: ROOT, dot: true, onlyFiles: false }
  );

  // CrÃ©er d'abord les dossiers
  for (const rel of entries) {
    const srcAbs = path.join(ROOT, rel);
    const st = await stat(srcAbs).catch(() => null);
    if (st && st.isDirectory()) {
      await mkdir(path.join(DIST, rel), { recursive: true });
    }
  }

  // Copier les fichiers
  let filesCount = 0;
  for (const rel of entries) {
    const srcAbs = path.join(ROOT, rel);
    const st = await stat(srcAbs).catch(() => null);
    if (!st || !st.isFile()) continue;

    // sÃ©curitÃ©: on ne recopie pas quelque chose dÃ©jÃ  dans dist
    if (rel === "" || rel.startsWith("dist/")) continue;

    const dstAbs = path.join(DIST, rel);
    await mkdir(path.dirname(dstAbs), { recursive: true });
    await copyFile(srcAbs, dstAbs);
    filesCount++;
  }

  log("copy", `copied ${filesCount} file(s)`);
}

const HTML_MINIFY_SKIP = new Set(["main.html"]);

async function minifyHtmlFiles() {
  const files = await fg(["**/*.html"], { cwd: DIST, dot: false });
  let minified = 0;
  let skipped = 0;
  for (const rel of files) {
    const abs = path.join(DIST, rel);
    const src = await readFile(abs, "utf8");
    if (HTML_MINIFY_SKIP.has(rel.replace(/\\/g, "/"))) {
      skipped++;
      continue;
    }
    const out = await minifyHTML(src, htmlOptions).catch(() => src);
    await writeFile(abs, out, "utf8");
    minified++;
  }
  log("html", `minified ${minified} html file(s), skipped ${skipped}`);
}

async function minifyCssFiles() {
  const files = await fg(["**/*.css"], { cwd: DIST, dot: false });
  const cleaner = new CleanCSS({});
  for (const rel of files) {
    const abs = path.join(DIST, rel);
    const src = await readFile(abs, "utf8");
    const out = cleaner.minify(src);
    await writeFile(abs, out.styles || src, "utf8");
  }
  log("css", `minified ${files.length} css file(s)`);
}

async function minifyJsFiles() {
  const files = await fg(["**/*.js"], { cwd: DIST, dot: false, onlyFiles: true });
  let count = 0;
  for (const rel of files) {
    // skip vendor/minified for the minify step (we'll still obfuscate our targets later)
    if (MINIFY_JS_EXCLUDE.some(p => new RegExp(
      "^" + p
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\./g, "\\.")
        .replace(/\//g, "\\/") + "$"
    ).test(rel))) {
      continue;
    }
    const abs = path.join(DIST, rel);
    const src = await readFile(abs, "utf8");
    try {
      const result = await terserMinify(src, terserOptions);
      if (result.code && result.code.length) {
        await writeFile(abs, result.code, "utf8");
        count++;
      }
    } catch (e) {
      // Fallback: leave file as-is (e.g., if unexpected modern syntax)
      console.warn(`[warn] Terser failed on ${rel}: ${e.message}. Keeping original.`);
    }
  }
  log("js", `minified ${count} js file(s)`);
}

function matchGlob(rel, pattern) {
  const re = new RegExp(
    "^" + pattern
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\//g, "\\/") + "$"
  );
  return re.test(rel);
}

async function obfuscateTargets() {
  const patterns = JS_TARGETS;
  const files = await fg(["**/*.js"], { cwd: DIST, dot: false, onlyFiles: true });
  let count = 0;
  for (const rel of files) {
    const matches = patterns.some(p => matchGlob(rel, p));
    if (!matches) continue;

    const abs = path.join(DIST, rel);
    const src = await readFile(abs, "utf8");
    try {
      const result = JavaScriptObfuscator.obfuscate(src, obfConfig);
      const code = result.getObfuscatedCode();
      await writeFile(abs, code, "utf8");
      count++;
    } catch (e) {
      console.warn(`[warn] Obfuscator failed on ${rel}: ${e.message}. Keeping original.`);
    }
  }
  log("obfuscate", `obfuscated ${count} target js file(s)`);
}

async function createApiKeyFile() {
  // RÃ©cupÃ©rer la clÃ© API depuis les variables d'environnement
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    // Fallback : essayer de lire depuis le fichier ClÃ© API.txt si .env n'existe pas
    const apiKeyFilePath = path.join(ROOT, "ClÃ© API.txt");
    if (await exists(apiKeyFilePath)) {
      const content = await readFile(apiKeyFilePath, "utf8");
      const match = content.match(/AIza[A-Za-z0-9_-]+/);
      if (match) {
        // CrÃ©er un fichier JavaScript obfusquÃ© avec la clÃ©
        const apiKeyJs = `window.__GOOGLE_MAPS_API_KEY__='${match[0]}';`;
        const obfuscated = JavaScriptObfuscator.obfuscate(apiKeyJs, {
          ...obfConfig,
          stringArray: true,
          stringArrayEncoding: ["base64"],
          selfDefending: false
        }).getObfuscatedCode();
        
        await writeFile(path.join(DIST, "api-key.js"), obfuscated, "utf8");
        log("api-key", "created obfuscated api-key.js from ClÃ© API.txt");
        return;
      }
    }
    console.warn("[warn] No GOOGLE_MAPS_API_KEY in .env and ClÃ© API.txt not found. Google Maps may not work.");
    return;
  }
  
  // CrÃ©er un fichier JavaScript obfusquÃ© avec la clÃ© depuis .env
  const apiKeyJs = `window.__GOOGLE_MAPS_API_KEY__='${apiKey}';`;
  const obfuscated = JavaScriptObfuscator.obfuscate(apiKeyJs, {
    ...obfConfig,
    stringArray: true,
    stringArrayEncoding: ["base64"],
    selfDefending: false
  }).getObfuscatedCode();
  
  await writeFile(path.join(DIST, "api-key.js"), obfuscated, "utf8");
  log("api-key", "created obfuscated api-key.js from .env");
}

(async () => {
  const newVersion = await bumpVersion();
  await clean();
  await copyAll();
  await createApiKeyFile();
  await minifyHtmlFiles();
  await minifyCssFiles();
  await minifyJsFiles();
  await obfuscateTargets();
  log("done", `Build finished. You can now deploy dist/ (version ${newVersion})`);
})();

