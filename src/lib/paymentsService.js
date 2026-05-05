import { supabase } from "./supabase";

/**
 * Ask the create-payment-intent Edge Function for a Stripe client_secret
 * to use with <Elements> + <PaymentElement>. The amount and the
 * tenant-only authorization are enforced server-side; the browser only
 * passes the contract id and its session JWT (auto-attached by
 * supabase.functions.invoke).
 *
 * Returns { clientSecret, paymentIntentId, amount, currency } on success
 * or { error } on failure (auth, wrong-role, missing financials, etc).
 */
export async function createStripePaymentIntent(contractId) {
  if (!contractId) return { error: "Missing contractId" };
  const { data, error } = await supabase.functions.invoke(
    "create-payment-intent",
    { body: { contract_id: contractId } },
  );
  if (error) {
    // Edge Function errors come back wrapped — peel out the readable
    // message when present.
    const ctx = error?.context;
    let msg = error.message ?? String(error);
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
    }
    return { error: msg };
  }
  if (data?.error) return { error: data.error };
  return data;
}

/**
 * After stripe.confirmPayment() resolves, ask the record-payment Edge
 * Function to verify the PaymentIntent against Stripe and write the
 * payment row + flip the contract to 'paid'. The webhook does the same
 * write asynchronously, but calling this on the client closes the loop
 * for the success page so the tenant sees confirmation immediately.
 */
export async function recordStripePayment(contractId, paymentIntentId) {
  if (!contractId || !paymentIntentId) return { error: "Missing ids" };
  const { data, error } = await supabase.functions.invoke(
    "record-payment",
    { body: { contract_id: contractId, payment_intent_id: paymentIntentId } },
  );
  if (error) {
    const ctx = error?.context;
    let msg = error.message ?? String(error);
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
    }
    return { error: msg };
  }
  if (data?.error) return { error: data.error };
  return { ok: true };
}

/**
 * All payments the current tenant has made, joined with contract +
 * listing context so the history row can render meaningful labels.
 * Mirrors mobile's `fetchMyPaymentsWithContext`.
 */
export async function fetchMyPaymentsWithContext(tenantId) {
  if (!tenantId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("payment")
    .select(`
      id, amount_cents, currency, status, paid_at,
      stripe_payment_intent_id, contract_id,
      contract!inner ( id, tenant_id, listing_id,
        listings ( title )
      )
    `)
    .eq("contract.tenant_id", tenantId)
    .order("paid_at", { ascending: false });
  return { data: data ?? [], error };
}

/**
 * The next contract a tenant should pay — first fully_signed contract
 * (not yet paid) ordered by signing date. Pulls pricing from
 * listing_financials. Mirrors mobile's `fetchMyNextDueContract`.
 *
 * Kept for callers that want only the payable next contract; MyPayments
 * uses `fetchMyInProgressContracts` so it can also nudge tenants whose
 * contracts are still awaiting a signature.
 */
export async function fetchMyNextDueContract(tenantId) {
  if (!tenantId) return { data: null, error: null };

  const { data: c, error } = await supabase
    .from("contract")
    .select(`
      id, status, listing_id, application_id,
      landlord_signed_at, listing_type,
      listings ( id, title )
    `)
    .eq("tenant_id", tenantId)
    .eq("status", "fully_signed")
    .order("landlord_signed_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !c) return { data: c ?? null, error };

  const { data: financials } = await supabase
    .from("listing_financials")
    .select("monthly_rent, security_deposit, advance_payment")
    .eq("listing_id", c.listing_id)
    .maybeSingle();

  return {
    data: {
      ...c,
      monthly_rent:     financials?.monthly_rent     ?? 0,
      security_deposit: financials?.security_deposit ?? 0,
      advance_payment:  financials?.advance_payment  ?? 0,
    },
    error: null,
  };
}

/**
 * Every in-progress contract the tenant is on (anything that isn't
 * already paid or cancelled). Lets MyPayments tell the tenant exactly
 * what to do next per contract — sign, wait on the landlord, or pay.
 *
 * Each row is enriched with listing financials so the page can show the
 * total move-in amount without a second round-trip per contract.
 */
export async function fetchMyInProgressContracts(tenantId) {
  if (!tenantId) return { data: [], error: null };

  const { data: rows, error } = await supabase
    .from("contract")
    .select(`
      id, status, listing_id, application_id,
      tenant_signed_at, landlord_signed_at, listing_type, created_at,
      landlord_id, landlord_name,
      listings ( id, title, cover_photo_url )
    `)
    .eq("tenant_id", tenantId)
    .in("status", ["awaiting_tenant", "awaiting_landlord", "fully_signed"])
    .order("created_at", { ascending: false });

  if (error || !rows?.length) return { data: rows ?? [], error };

  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))];
  const { data: financials } = await supabase
    .from("listing_financials")
    .select("listing_id, monthly_rent, security_deposit, advance_payment")
    .in("listing_id", listingIds);

  const finMap = Object.fromEntries(
    (financials ?? []).map((f) => [f.listing_id, f])
  );

  return {
    data: rows.map((c) => {
      const f = finMap[c.listing_id];
      return {
        ...c,
        monthly_rent:     f?.monthly_rent     ?? 0,
        security_deposit: f?.security_deposit ?? 0,
        advance_payment:  f?.advance_payment  ?? 0,
      };
    }),
    error: null,
  };
}
