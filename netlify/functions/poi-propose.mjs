import { json, corsHeaders } from "./_lib/http.mjs";
import { translateDescription, normSource } from "./_lib/translate.mjs";
import { mailStaffPoiProposal, isMailConfigured } from "./_lib/mail.mjs";
import {
  initBlobs,
  saveProposal,
  newProposalId,
  slugFromName,
} from "./_lib/store.mjs";

const REGION_BOUNDS = { minLat: 50.35, maxLat: 50.55, minLon: 3.80, maxLon: 4.05 };
const MAX_B64 = 3_500_000;

function inRegion(lat, lng) {
  return lat >= REGION_BOUNDS.minLat && lat <= REGION_BOUNDS.maxLat && lng >= REGION_BOUNDS.minLon && lng <= REGION_BOUNDS.maxLon;
}

function parseBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return JSON.parse(raw || "{}");
}

function decodePhoto(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/i);
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 200 || buf.length > 2_500_000) return null;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  return buf;
}

export async function handler(event) {
  initBlobs(event);
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  if (!isMailConfigured()) {
    return json(503, {
      error: "smtp_not_configured",
      detail: "Configurez SMTP_HOST, SMTP_USER, SMTP_PASS sur Netlify (Gmail : smtp.gmail.com, cityloopquest@gmail.com).",
    });
  }

  try {
    const body = parseBody(event);
    const name = String(body.name || "").trim().slice(0, 120);
    const lat = parseFloat(body.lat);
    const lng = parseFloat(body.lng);
    const description = String(body.description || "").trim().slice(0, 500);
    const submitterEmail = String(body.submitterEmail || "").trim().slice(0, 120);
    const sourceLang = normSource(body.sourceLang);

    if (!name || name.length < 2) return json(400, { error: "invalid_name" });
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json(400, { error: "invalid_coords" });
    if (!inRegion(lat, lng)) return json(400, { error: "coords_outside_mons" });
    if (!description || description.length < 10) return json(400, { error: "invalid_description" });
    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      return json(400, { error: "invalid_email" });
    }
    if (body.photoBase64 && body.photoBase64.length > MAX_B64) {
      return json(400, { error: "photo_too_large" });
    }

    const imageBuffer = decodePhoto(body.photoBase64);
    if (!imageBuffer) return json(400, { error: "invalid_photo_jpeg" });

    const descriptions = await translateDescription(description, sourceLang);
    const id = newProposalId();
    const poiId = `community_${slugFromName(name)}_${id.slice(-6)}`;

    const meta = {
      id,
      poiId,
      status: "pending",
      name,
      lat,
      lng,
      city: "Mons",
      category: ["patrimoine", "culture"],
      descriptions,
      sourceDescription: description,
      sourceLang,
      submitterEmail: submitterEmail || null,
      verified: false,
      community: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveProposal(id, meta, imageBuffer);
    } catch (storeErr) {
      console.error("[poi-propose] store", storeErr);
      return json(503, {
        error: "blobs_not_configured",
        detail:
          "Stockage Netlify Blobs indisponible. Activez Blobs (Storage) sur le site et/ou ajoutez NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN sur Netlify.",
      });
    }

    const mailed = await mailStaffPoiProposal({
      id,
      name,
      lat,
      lng,
      submitterEmail,
      descriptions,
      sourceLang,
      sourceDescription: description,
      imageBuffer,
    });

    if (!mailed) {
      return json(503, {
        error: "delivery_failed",
        detail: "E-mail non envoye. Verifiez SMTP_* sur Netlify.",
      });
    }

    return json(200, {
      ok: true,
      message: "pending_review",
      id,
      stored: true,
    });
  } catch (e) {
    console.error("[poi-propose]", e);
    return json(500, { error: "server_error", detail: String(e.message || e) });
  }
}
