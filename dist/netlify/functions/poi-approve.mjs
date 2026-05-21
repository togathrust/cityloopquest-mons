import { html } from "./_lib/http.mjs";
import { initBlobs, getMeta, updateMeta } from "./_lib/store.mjs";
import { mailSubmitterResult } from "./_lib/mail.mjs";

function page(title, message, ok) {
  const color = ok ? "#1a7f37" : "#9a0000";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head><body style="font-family:Arial,sans-serif;max-width:520px;margin:40px auto;padding:20px;"><h1 style="color:${color}">${title}</h1><p>${message}</p><p><a href="https://clq-mons.netlify.app/poi-experiment.html">Retour a l'app POI</a></p></body></html>`;
}

export async function handler(event) {
  initBlobs(event);
  const params = event.queryStringParameters || {};
  const id = params.id;
  const token = params.token;
  const action = params.action;

  const secret = process.env.POI_APPROVE_SECRET;
  if (!secret || token !== secret) {
    return html(403, page("Acces refuse", "Jeton invalide.", false));
  }
  if (!id) {
    return html(400, page("Erreur", "Identifiant manquant.", false));
  }

  try {
    const meta = await getMeta(id);
    if (!meta) {
      return html(404, page("Introuvable", "Cette proposition n'existe plus.", false));
    }
    if (meta.status !== "pending") {
      return html(200, page("Deja traite", `Statut actuel : ${meta.status}.`, meta.status === "approved"));
    }

    if (action === "reject") {
      meta.status = "rejected";
      meta.reviewedAt = new Date().toISOString();
      await updateMeta(id, meta);
      await mailSubmitterResult({
        to: meta.submitterEmail,
        name: meta.name,
        approved: false,
      });
      return html(200, page("Refuse", `La proposition « ${meta.name} » a ete refusee.`, false));
    }

    if (action === "approve") {
      meta.status = "approved";
      meta.verified = true;
      meta.reviewedAt = new Date().toISOString();
      meta.photos = [`/.netlify/functions/poi-photo?id=${encodeURIComponent(id)}`];
      await updateMeta(id, meta);
      await mailSubmitterResult({
        to: meta.submitterEmail,
        name: meta.name,
        approved: true,
      });
      return html(
        200,
        page(
          "Approuve",
          `Le point « ${meta.name} » est maintenant visible dans l'application (sans redeploiement).`,
          true
        )
      );
    }

    return html(400, page("Erreur", "Action invalide (approve ou reject).", false));
  } catch (e) {
    console.error("[poi-approve]", e);
    const msg = String(e.message || e);
    const hint = /blobs|siteID|token/i.test(msg)
      ? " Activez Netlify Blobs (Storage) pour le site clq-mons, redeployez, puis renvoyez une proposition si besoin."
      : "";
    return html(500, page("Erreur serveur", msg + hint, false));
  }
}
