// supabase/functions/record-payment
//
// Called by the browser AFTER stripe.confirmPayment() returns success.
// Re-fetches the PaymentIntent from Stripe (so we trust Stripe, not the
// browser) and writes the payment row + flips the contract to 'paid'.
//
// The same logic is mirrored by the stripe-webhook function so payments
// confirmed off-page (e.g. 3DS redirects, network drops) still land in
// the database. Both call paths use ON CONFLICT (stripe_payment_intent_id)
// to guarantee a single payment row per intent.
//
// Request body: { contract_id: string, payment_intent_id: string }
// Response:     { ok: true } | { error: string }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);
    const user = userRes.user;

    const { contract_id, payment_intent_id } = await req.json().catch(() => ({}));
    if (!contract_id || !payment_intent_id) {
      return json({ error: "Missing contract_id or payment_intent_id" }, 400);
    }

    // Trust Stripe, not the client — re-fetch the intent and verify it.
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: ["latest_charge.payment_method_details"],
    });

    if (intent.status !== "succeeded") {
      return json({ error: `PaymentIntent status is ${intent.status}` }, 400);
    }
    if (intent.metadata?.contract_id !== contract_id) {
      return json({ error: "PaymentIntent / contract mismatch" }, 400);
    }
    if (intent.metadata?.tenant_id !== user.id) {
      return json({ error: "This intent belongs to a different tenant" }, 403);
    }

    // Use the service-role client to write — bypasses RLS for this
    // server-verified payment record.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const charge: any = (intent as any).latest_charge;
    const card = charge?.payment_method_details?.card;
    const brand = card?.brand ?? intent.payment_method_types?.[0] ?? "card";
    const last4 = card?.last4 ?? null;
    const billingName =
      charge?.billing_details?.name ??
      (intent as any).shipping?.name ??
      null;

    const { error: payErr } = await admin
      .from("payment")
      .upsert(
        {
          contract_id,
          stripe_payment_intent_id: intent.id,
          amount_cents:             intent.amount,
          currency:                 intent.currency,
          status:                   "succeeded",
          paid_at:                  new Date(((intent as any).created ?? Date.now() / 1000) * 1000).toISOString(),
          method:                   brand,
          last4,
          name:                     billingName,
        },
        { onConflict: "stripe_payment_intent_id" },
      );
    if (payErr) return json({ error: payErr.message }, 500);

    const { error: cErr } = await admin
      .from("contract")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", contract_id);
    if (cErr) return json({ error: cErr.message }, 500);

    // Take the listing out of public browse / block fresh applications.
    // The listings RLS is `status = 'active'` for non-owners, and
    // fetchListings filters the same way, so flipping to 'rented' hides
    // the unit from search and the application gate refuses new
    // applies immediately.
    const { data: contractMeta } = await admin
      .from("contract")
      .select("listing_id")
      .eq("id", contract_id)
      .maybeSingle();
    if (contractMeta?.listing_id) {
      await admin
        .from("listings")
        .update({ status: "rented", updated_at: new Date().toISOString() })
        .eq("id", contractMeta.listing_id);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
