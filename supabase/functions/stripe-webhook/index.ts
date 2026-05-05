// supabase/functions/stripe-webhook
//
// Public endpoint Stripe calls when a payment succeeds/fails. Acts as
// the source of truth for fulfillment so a payment is recorded even if
// the tenant closes the browser between confirmPayment and the
// record-payment call.
//
// Set the endpoint URL in your Stripe dashboard:
//   https://<project>.supabase.co/functions/v1/stripe-webhook
// Listen for: payment_intent.succeeded, payment_intent.payment_failed
//
// Important: deploy with `--no-verify-jwt` so Stripe (no JWT) can hit it.
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// The webhook secret protects the endpoint instead of a JWT.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  // Use the raw body for signature verification.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature,
      WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return new Response(`Webhook signature failed: ${(err as Error).message}`, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const contractId = intent.metadata?.contract_id;
      if (!contractId) return new Response("ok (no contract metadata)");

      // Fetch card / billing details for display.
      const expanded = await stripe.paymentIntents.retrieve(intent.id, {
        expand: ["latest_charge.payment_method_details"],
      });
      const charge: any = (expanded as any).latest_charge;
      const card = charge?.payment_method_details?.card;

      await admin.from("payment").upsert(
        {
          contract_id:              contractId,
          stripe_payment_intent_id: intent.id,
          amount_cents:             intent.amount,
          currency:                 intent.currency,
          status:                   "succeeded",
          paid_at:                  new Date((intent.created ?? Date.now() / 1000) * 1000).toISOString(),
          method:                   card?.brand ?? intent.payment_method_types?.[0] ?? "card",
          last4:                    card?.last4 ?? null,
          name:                     charge?.billing_details?.name ?? null,
        },
        { onConflict: "stripe_payment_intent_id" },
      );

      await admin
        .from("contract")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", contractId);

      // Hide the listing from browse / block new applies. RLS on
      // listings is `status = 'active'`, and fetchListings filters
      // the same way, so this single flip is the whole "no longer
      // visible" behaviour.
      const { data: contractMeta } = await admin
        .from("contract")
        .select("listing_id")
        .eq("id", contractId)
        .maybeSingle();
      if (contractMeta?.listing_id) {
        await admin
          .from("listings")
          .update({ status: "rented", updated_at: new Date().toISOString() })
          .eq("id", contractMeta.listing_id);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const contractId = intent.metadata?.contract_id;
      if (contractId) {
        await admin.from("payment").upsert(
          {
            contract_id:              contractId,
            stripe_payment_intent_id: intent.id,
            amount_cents:             intent.amount,
            currency:                 intent.currency,
            status:                   "failed",
            paid_at:                  new Date().toISOString(),
          },
          { onConflict: "stripe_payment_intent_id" },
        );
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response(`Webhook handler error: ${(err as Error).message}`, { status: 500 });
  }
});
