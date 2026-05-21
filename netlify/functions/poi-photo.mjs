import { corsHeaders } from "./_lib/http.mjs";
import { initBlobs, getPhoto } from "./_lib/store.mjs";

export async function handler(event) {
  initBlobs(event);
  const id = event.queryStringParameters?.id;
  if (!id) {
    return { statusCode: 400, headers: corsHeaders(), body: "Missing id" };
  }
  try {
    const buf = await getPhoto(id);
    if (!buf) {
      return { statusCode: 404, headers: corsHeaders(), body: "Not found" };
    }
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
      body: Buffer.from(buf).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error("[poi-photo]", e);
    return { statusCode: 500, headers: corsHeaders(), body: "Error" };
  }
}
