import { json, corsHeaders } from "./_lib/http.mjs";
import { initBlobs, listApprovedPois } from "./_lib/store.mjs";

export async function handler(event) {
  initBlobs(event);
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "GET") {
    return json(405, { error: "method_not_allowed" });
  }

  try {
    const approved = await listApprovedPois();
    const pois = approved.map((m) => ({
      id: m.poiId || m.id,
      name: m.name,
      city: m.city || "Mons",
      category: m.category || ["patrimoine", "culture"],
      lat: m.lat,
      lng: m.lng,
      verified: true,
      community: true,
      photos: m.photos || [`/.netlify/functions/poi-photo?id=${encodeURIComponent(m.id)}`],
      descriptions: m.descriptions || {},
    }));
    return json(200, { pois, count: pois.length });
  } catch (e) {
    console.error("[poi-community]", e);
    return json(500, { error: "server_error" });
  }
}
