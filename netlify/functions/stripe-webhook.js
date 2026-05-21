import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig =
    event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

  if (!sig) {
    return { statusCode: 400, body: "Missing Stripe-Signature header" };
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return { statusCode: 500, body: "Missing STRIPE_WEBHOOK_SECRET" };
  }

  let stripeEvent;

  try {
    // Netlify fournit le body en string -> c'est le "raw body" requis par Stripe
    const payload = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // ✅ Ici tu traites tes events
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    // TODO: marquer la commande "payée", générer licence, etc.
  }

  if (stripeEvent.type === "checkout.session.async_payment_succeeded") {
    const session = stripeEvent.data.object;
    // TODO: idem si paiement retardé
  }

  return { statusCode: 200, body: "ok" };
}
