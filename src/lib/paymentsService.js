import { supabase } from "./supabase";

/**
 * Ask the paymongo-create-payment-intent Edge Function for a
 * PayMongo PaymentIntent. Amount and tenant-only authorization are
 * enforced server-side; the browser only passes the contract id and
 * its session JWT (auto-attached by supabase.functions.invoke).
 *
 * Returns { paymentIntentId, clientKey, amount, currency } on success
 * or { error } on failure.
 */
export async function createPaymongoPaymentIntent(contractId) {
  if (!contractId) return { error: "Missing contractId" };
  const { data, error } = await supabase.functions.invoke(
    "paymongo-create-payment-intent",
    { body: { contract_id: contractId } },
  );
  if (error) return { error: await unwrapFnError(error) };
  if (data?.error) return { error: data.error };
  return data;
}

/**
 * Attach a PaymentMethod (card or e-wallet) to the PaymentIntent.
 * The Edge Function does the actual attach with the secret key and
 * returns the next status. For e-wallets, `next_action.redirect.url`
 * is the destination to navigate to so the user can authorize.
 *
 * Returns { status, next_action, payment_method_id } or { error }.
 */
export async function attachPaymentMethod({
  paymentIntentId,
  paymentMethodId,
  returnUrl,
  paymentMethodRecordId,
}) {
  if (!paymentIntentId || !paymentMethodId || !returnUrl) {
    return { error: "Missing ids" };
  }
  const { data, error } = await supabase.functions.invoke(
    "paymongo-attach-payment-method",
    {
      body: {
        payment_intent_id:        paymentIntentId,
        payment_method_id:        paymentMethodId,
        return_url:               returnUrl,
        payment_method_record_id: paymentMethodRecordId ?? null,
      },
    },
  );
  if (error) return { error: await unwrapFnError(error) };
  if (data?.error) return { error: data.error };
  return data;
}

/**
 * After attach / redirect-return resolves successfully, ask the
 * paymongo-record-payment Edge Function to re-fetch the PI from
 * PayMongo, write the payment + ledger rows, and flip the contract
 * to 'paid'. The webhook does the same write asynchronously; this
 * call closes the loop for the success page.
 */
export async function recordPaymongoPayment(contractId, paymentIntentId) {
  if (!contractId || !paymentIntentId) return { error: "Missing ids" };
  const { data, error } = await supabase.functions.invoke(
    "paymongo-record-payment",
    { body: { contract_id: contractId, payment_intent_id: paymentIntentId } },
  );
  if (error) return { error: await unwrapFnError(error) };
  if (data?.error) return { error: data.error };
  return { ok: true };
}

/**
 * Mock-mode payment — bypasses PayMongo entirely. Server gates on
 * MOCK_PAYMENTS_ENABLED env. Writes a synthetic succeeded payment +
 * ledger row and flips contract/listing status.
 */
export async function recordMockPayment({ contractId, paymentMethodRecordId }) {
  if (!contractId || !paymentMethodRecordId) return { error: "Missing ids" };
  const { data, error } = await supabase.functions.invoke(
    "paymongo-record-mock-payment",
    {
      body: {
        contract_id: contractId,
        payment_method_record_id: paymentMethodRecordId,
      },
    },
  );
  if (error) return { error: await unwrapFnError(error) };
  if (data?.error) return { error: data.error };
  return data;
}

// ─── Backwards-compatible shims ──────────────────────────────────────────────
// Kept for one release so any stale build that still imports the old
// names doesn't crash mid-deploy. Delete after the next release.
export const createStripePaymentIntent = createPaymongoPaymentIntent;
export const recordStripePayment       = recordPaymongoPayment;

/**
 * All payment attempts the current tenant has made, joined with
 * contract + listing context. Reads from the payment_transactions
 * ledger (one row per attempt), not the `payment` table.
 *
 * Filters: status, methodType, dateFrom, dateTo are all optional.
 * Shape returned is compatible with the existing MyPayments.jsx
 * row renderer: { id, amount_cents, currency, status, paid_at,
 * paymongo_payment_intent_id, contract_id, method_type, brand, last4,
 * contract: { id, listings: { title } } }.
 */
export async function fetchMyPaymentsWithContext(tenantIdOrOpts) {
  const opts = typeof tenantIdOrOpts === "string"
    ? { tenantId: tenantIdOrOpts }
    : (tenantIdOrOpts ?? {});
  const { tenantId, status, methodType, dateFrom, dateTo } = opts;
  if (!tenantId) return { data: [], error: null };

  let q = supabase
    .from("payment_transactions_with_context")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (status)     q = q.eq("status", status);
  if (methodType) q = q.eq("method_type", methodType);
  if (dateFrom)   q = q.gte("created_at", dateFrom);
  if (dateTo)     q = q.lte("created_at", dateTo);

  const { data, error } = await q;
  if (error) return { data: [], error };

  const mapped = (data ?? []).map((r) => ({
    id:                         r.id,
    amount_cents:               r.amount_cents,
    currency:                   r.currency,
    status:                     r.status,
    paid_at:                    r.created_at,
    paymongo_payment_intent_id: r.paymongo_payment_intent_id,
    contract_id:                r.contract_id,
    method_type:                r.method_type,
    brand:                      r.brand,
    last4:                      r.last4,
    failure_reason:             r.failure_reason,
    contract: { id: r.contract_id, listings: { title: r.listing_title } },
  }));
  return { data: mapped, error: null };
}

/**
 * The next contract a tenant should pay — first fully_signed
 * contract (not yet paid) ordered by signing date. Pulls pricing
 * from listing_financials. Untouched by the PayMongo migration.
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
 * Every in-progress contract the tenant is on. Untouched by the
 * PayMongo migration.
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

// ─── helpers ─────────────────────────────────────────────────────────────────

async function unwrapFnError(error) {
  const ctx = error?.context;
  let msg = error.message ?? String(error);
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
  }
  return msg;
}
