// supabase/functions/create-payment-intent
//
// Creates a Stripe PaymentIntent for a contract's move-in payment.
// The amount is computed server-side from the contract row (so the
// browser cannot dictate the price) and the caller must be the tenant
// on the contract (so the landlord can't initiate their own payment).
//
// Request body: { contract_id: string }
// Response:     { clientSecret, paymentIntentId, amount, currency }

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

    // Auth-scoped client — RLS applies, contract reads are gated to the
    // tenant or landlord on the row.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Invalid session" }, 401);
    const user = userRes.user;

    const { contract_id } = await req.json().catch(() => ({}));
    if (!contract_id) return json({ error: "Missing contract_id" }, 400);

    const { data: contract, error: cErr } = await supabase
      .from("contract")
      .select(`
        id, status, tenant_id, landlord_id, listing_id,
        monthly_rent, security_deposit, advance_rent,
        listings ( title )
      `)
      .eq("id", contract_id)
      .maybeSingle();

    if (cErr)        return json({ error: cErr.message }, 500);
    if (!contract)   return json({ error: "Contract not found" }, 404);
    if (user.id !== contract.tenant_id) {
      return json({ error: "Only the tenant on this contract can pay" }, 403);
    }
    if (contract.status !== "fully_signed") {
      return json({
        error: `Contract is not ready for payment (status=${contract.status})`,
      }, 400);
    }

    const totalPesos =
      Number(contract.monthly_rent     ?? 0) +
      Number(contract.security_deposit ?? 0) +
      Number(contract.advance_rent     ?? 0);
    const amount = Math.round(totalPesos * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Contract has no rent amount set" }, 400);
    }

    // Reuse an existing PaymentIntent if one is already open for this
    // contract — avoids creating a fresh PI every time the tenant
    // re-mounts the page or refreshes mid-checkout.
    const existing = await stripe.paymentIntents.search({
      query: `metadata['contract_id']:'${contract_id}' AND status:'requires_payment_method'`,
      limit: 1,
    }).catch(() => ({ data: [] as Array<{ id: string; client_secret: string | null; amount: number; currency: string }> }));

    if (existing.data?.[0]) {
      const pi = existing.data[0];
      // If the price changed (e.g. landlord edited the contract) update
      // the existing intent rather than creating a new one.
      if (pi.amount !== amount) {
        const updated = await stripe.paymentIntents.update(pi.id, { amount });
        return json({
          clientSecret:    updated.client_secret,
          paymentIntentId: updated.id,
          amount:          updated.amount,
          currency:        updated.currency,
        });
      }
      return json({
        clientSecret:    pi.client_secret,
        paymentIntentId: pi.id,
        amount:          pi.amount,
        currency:        pi.currency,
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "php",
      automatic_payment_methods: { enabled: true },
      description: `ViewxRent move-in for ${contract.listings?.title ?? "rental"}`,
      metadata: {
        contract_id,
        tenant_id:   user.id,
        landlord_id: contract.landlord_id,
      },
    });

    return json({
      clientSecret:    intent.client_secret,
      paymentIntentId: intent.id,
      amount:          intent.amount,
      currency:        intent.currency,
    });
  } catch (err) {
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
