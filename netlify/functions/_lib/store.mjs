import { connectLambda, getStore, setEnvironmentContext } from "@netlify/blobs";

const STORE = "clq-poi";

let blobsEnvReady = false;

/**
 * Initialise Netlify Blobs avant tout accès au store.
 * Appeler en début de handler avec l'event Lambda (obligatoire en mode compatibilité).
 */
export function initBlobs(event) {
  if (blobsEnvReady) return;

  if (event?.blobs) {
    try {
      connectLambda(event);
      blobsEnvReady = true;
      return;
    } catch (err) {
      console.warn("[poi-store] connectLambda:", err?.message || err);
    }
  }

  const ctxB64 = process.env.NETLIFY_BLOBS_CONTEXT;
  if (ctxB64) {
    try {
      const ctx = JSON.parse(Buffer.from(ctxB64, "base64").toString("utf8"));
      setEnvironmentContext(ctx);
      blobsEnvReady = true;
      return;
    } catch (err) {
      console.warn("[poi-store] NETLIFY_BLOBS_CONTEXT:", err?.message || err);
    }
  }

  const siteID =
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID ||
    process.env.POI_NETLIFY_SITE_ID;
  const token =
    process.env.NETLIFY_BLOB_READ_WRITE_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.POI_BLOBS_TOKEN;

  if (siteID && token) {
    setEnvironmentContext({
      siteID,
      token,
      apiURL: process.env.NETLIFY_API_URL || "https://api.netlify.com",
    });
    blobsEnvReady = true;
  }
}

function manualClientOptions() {
  const siteID =
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID ||
    process.env.POI_NETLIFY_SITE_ID;
  const token =
    process.env.NETLIFY_BLOB_READ_WRITE_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.POI_BLOBS_TOKEN;
  if (siteID && token) {
    return {
      siteID,
      token,
      apiURL: process.env.NETLIFY_API_URL || "https://api.netlify.com",
    };
  }
  return null;
}

function store() {
  const manual = manualClientOptions();
  const base = { name: STORE, consistency: "strong" };
  if (manual) {
    return getStore({ ...base, ...manual });
  }
  return getStore(base);
}

export function metaKey(id) {
  return `poi/${id}.json`;
}

export function photoKey(id) {
  return `poi/${id}.jpg`;
}

export async function saveProposal(id, meta, imageBuffer) {
  const s = store();
  await s.setJSON(metaKey(id), meta);
  if (imageBuffer && imageBuffer.length) {
    await s.set(photoKey(id), imageBuffer, {
      metadata: { contentType: "image/jpeg" },
    });
  }
}

export async function getMeta(id) {
  const s = store();
  return s.get(metaKey(id), { type: "json" });
}

export async function getPhoto(id) {
  const s = store();
  return s.get(photoKey(id), { type: "arrayBuffer" });
}

export async function updateMeta(id, meta) {
  const s = store();
  await s.setJSON(metaKey(id), meta);
}

export async function deleteProposal(id) {
  const s = store();
  await s.delete(metaKey(id));
  try {
    await s.delete(photoKey(id));
  } catch {
    /* photo optionnelle */
  }
}

export async function listApprovedPois() {
  const s = store();
  const { blobs } = await s.list({ prefix: "poi/" });
  const pois = [];
  for (const b of blobs) {
    if (!b.key.endsWith(".json")) continue;
    const meta = await s.get(b.key, { type: "json" });
    if (meta && meta.status === "approved") pois.push(meta);
  }
  return pois;
}

export function newProposalId() {
  return `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugFromName(name) {
  return String(name || "poi")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}
