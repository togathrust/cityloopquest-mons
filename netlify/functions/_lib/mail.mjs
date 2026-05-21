import nodemailer from "nodemailer";

function siteUrl() {
  return (process.env.SITE_URL || "https://clq-mons.netlify.app").replace(/\/+$/, "");
}

function staffEmail() {
  return process.env.POI_STAFF_EMAIL || process.env.STAFF_EMAIL || "cityloopquest@gmail.com";
}

export function isMailConfigured() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const host = process.env.SMTP_HOST || (user && String(user).includes("@gmail.com") ? "smtp.gmail.com" : "");
  return Boolean(host && user && pass);
}

function transporter() {
  if (!isMailConfigured()) return null;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function mailStaffPoiProposal({
  id,
  name,
  lat,
  lng,
  submitterEmail,
  descriptions,
  sourceLang,
  sourceDescription,
  imageBuffer,
}) {
  const tx = transporter();
  if (!tx) {
    console.warn("[poi] SMTP non configure — configurez SMTP_* sur Netlify (Gmail : smtp.gmail.com)");
    return false;
  }
  const secret = process.env.POI_APPROVE_SECRET;
  const base = siteUrl();
  let approveUrl = "";
  let rejectUrl = "";
  if (secret) {
    approveUrl = `${base}/.netlify/functions/poi-approve?id=${encodeURIComponent(id)}&token=${encodeURIComponent(secret)}&action=approve`;
    rejectUrl = `${base}/.netlify/functions/poi-approve?id=${encodeURIComponent(id)}&token=${encodeURIComponent(secret)}&action=reject`;
  }

  const descBlock = Object.entries(descriptions || {})
    .map(([langKey, txt]) => `--- ${langKey} ---\n${txt}\n`)
    .join("\n");

  const linksHtml = secret
    ? `<p>
      <a href="${approveUrl}" style="display:inline-block;padding:10px 16px;background:#1a7f37;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">Approuver</a>
      <a href="${rejectUrl}" style="display:inline-block;padding:10px 16px;background:#9a0000;color:#fff;text-decoration:none;border-radius:6px;">Refuser</a>
    </p>`
    : `<p><em>Liens d'approbation non disponibles (POI_APPROVE_SECRET manquant sur Netlify).</em></p>`;

  const html = `
    <h2>Nouvelle proposition de POI — CLQ Mons</h2>
    <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
    <p><strong>Coordonnees :</strong> ${lat}, ${lng}</p>
    <p><strong>Google Maps :</strong> <a href="https://www.google.com/maps?q=${lat},${lng}">Voir sur la carte</a></p>
    <p><strong>Email proposeur :</strong> ${escapeHtml(submitterEmail || "—")}</p>
    <p><strong>Langue source :</strong> ${escapeHtml(sourceLang)}</p>
    <p><strong>ID :</strong> ${escapeHtml(id)}</p>
    ${linksHtml}
    <h3>Description source</h3>
    <p>${escapeHtml(sourceDescription || "")}</p>
    <h3>Descriptions (10 langues)</h3>
    <pre style="white-space:pre-wrap;font-size:12px;">${escapeHtml(descBlock)}</pre>
  `;

  const attachments = [];
  if (imageBuffer && imageBuffer.length) {
    attachments.push({
      filename: `poi-${id}.jpg`,
      content: imageBuffer,
      contentType: "image/jpeg",
    });
  }

  await tx.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER,
    to: staffEmail(),
    subject: `[CLQ Mons] POI a valider : ${name}`,
    html,
    attachments,
  });
  return true;
}

export async function mailSubmitterResult({ to, name, approved }) {
  const tx = transporter();
  if (!tx || !to) return false;
  const subject = approved
    ? `[CLQ Mons] Votre point d'interet a ete publie`
    : `[CLQ Mons] Proposition de POI non retenue`;
  const body = approved
    ? `Bonjour,\n\nVotre proposition « ${name} » a ete validee par notre equipe et est maintenant visible dans l'application CLQ Mons.\n\nMerci pour votre contribution !`
    : `Bonjour,\n\nVotre proposition « ${name} » n'a pas ete retenue apres verification.\n\nMerci tout de meme pour votre suggestion.`;
  await tx.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER,
    to,
    subject,
    text: body,
  });
  return true;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
