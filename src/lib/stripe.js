import { loadStripe } from "@stripe/stripe-js";

// Single, lazily-resolved Stripe.js promise — Stripe recommends calling
// loadStripe() exactly once per page load. Components import this and
// pass it straight to <Elements>.
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise = null;

export function getStripePromise() {
  if (!PUBLISHABLE_KEY) {
    // Fail loudly — silently returning null would let the payment form
    // mount with no Elements provider and confuse the next debugging
    // session. Better to surface this on the very first call.
    if (typeof window !== "undefined") {
      console.error(
        "VITE_STRIPE_PUBLISHABLE_KEY is not set. Payments cannot be processed."
      );
    }
    return Promise.resolve(null);
  }
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

export function isStripeConfigured() {
  return !!PUBLISHABLE_KEY;
}
