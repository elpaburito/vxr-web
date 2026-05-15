// PayMongo client-side helpers. Replaces src/lib/stripe.js.
//
// PaymentMethods are created directly against the PayMongo REST API
// using the PUBLIC key (Basic auth). This is the supported pattern —
// the public key is publishable, and the card number / e-wallet
// details never touch our backend. Attaching the resulting
// payment_method to the PaymentIntent is server-side (sk key) via
// the paymongo-attach-payment-method Edge Function.

const PUBLIC_KEY = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY;
const API = "https://api.paymongo.com/v1";

export function isPaymongoConfigured() {
  return !!PUBLIC_KEY;
}

function publicAuthHeader() {
  if (!PUBLIC_KEY) {
    if (typeof window !== "undefined") {
      console.error(
        "VITE_PAYMONGO_PUBLIC_KEY is not set. Payments cannot be processed.",
      );
    }
    throw new Error("PayMongo public key not configured");
  }
  return "Basic " + btoa(PUBLIC_KEY + ":");
}

function firstError(body) {
  const e = Array.isArray(body?.errors) ? body.errors[0] : null;
  return e?.detail ?? e?.code ?? "PayMongo request failed";
}

/**
 * Create a card PaymentMethod via PayMongo's public REST endpoint.
 * Card details are POSTed directly to api.paymongo.com — they never
 * pass through our backend.
 *
 * Returns the PaymentMethod object: { id, attributes: { ... } }.
 */
export async function createCardPaymentMethod({ card, billing }) {
  const res = await fetch(`${API}/payment_methods`, {
    method: "POST",
    headers: {
      Authorization: publicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          type: "card",
          details: {
            card_number: String(card.number || "").replace(/\s+/g, ""),
            exp_month:   Number(card.expMonth),
            exp_year:    Number(card.expYear),
            cvc:         String(card.cvc || ""),
          },
          billing,
        },
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(firstError(body));
  return body.data;
}

/**
 * Create an e-wallet / bank PaymentMethod (gcash, paymaya, grab_pay,
 * bank_transfer). These types have no `details` payload — PayMongo
 * just records the choice and the user authorizes on the redirect
 * destination.
 */
export async function createEwalletPaymentMethod({ type, billing }) {
  const res = await fetch(`${API}/payment_methods`, {
    method: "POST",
    headers: {
      Authorization: publicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          type,
          billing,
        },
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(firstError(body));
  return body.data;
}

// Display-only metadata for the method picker UI.
export const METHOD_LABELS = {
  card:          { label: "Card",          short: "Card" },
  gcash:         { label: "GCash",         short: "GCash" },
  paymaya:       { label: "Maya",          short: "Maya" },
  grab_pay:      { label: "GrabPay",       short: "GrabPay" },
  bank_transfer: { label: "Bank Transfer", short: "Bank" },
};
