import { supabase } from "./supabase";

/**
 * Ask the paymongo-create-payment-intent Edge Function for a
 * PayMongo PaymentIntent. Amount and tenant-only authorization are
 * enforced server-side; the browser only passes the contract id and
 * (for monthly rent) the billing month it wants to pay.
 *
 * Pass `billingMonth` as 'YYYY-MM' or 'YYYY-MM-DD' to charge a single
 * month's rent (recurring); omit it for the move-in payment.
 *
 * Returns { paymentIntentId, clientKey, amount, currency, billingMonth }
 * on success or { error } on failure.
 */
export async function createPaymongoPaymentIntent(contractId, opts = {}) {
  if (!contractId) return { error: "Missing contractId" };
  const body = { contract_id: contractId };
  if (opts.billingMonth) body.billing_month = opts.billingMonth;

  const { data, error } = await supabase.functions.invoke(
    "paymongo-create-payment-intent",
    { body },
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
 * Landlord-only: record a payment received outside the app (cash,
 * direct GCash, manual bank transfer). Writes a 'succeeded' ledger +
 * payment row tagged with recorded_by = landlord.id; does NOT touch
 * contract status (tenancy must already be active). Server-side
 * authorisation gates on auth.uid() === contract.landlord_id.
 */
export async function recordOfflinePayment({
  contractId, amountPhp, methodType, billingMonth = null, paidAt = null, note = null,
}) {
  if (!contractId)               return { error: "Missing contractId" };
  if (!(Number(amountPhp) > 0))  return { error: "amountPhp must be > 0" };
  if (!methodType)               return { error: "Missing methodType" };

  const { data, error } = await supabase.functions.invoke(
    "landlord-record-offline-payment",
    {
      body: {
        contract_id:   contractId,
        amount_php:    Number(amountPhp),
        method_type:   methodType,
        billing_month: billingMonth || null,
        paid_at:       paidAt || null,
        note:          note || null,
      },
    },
  );
  if (error)        return { error: await unwrapFnError(error) };
  if (data?.error)  return { error: data.error };
  return data;
}

/**
 * Landlord-only: generate a PayMongo Link for a tenant's monthly rent.
 * Returns a hosted checkout URL the tenant can pay from any device;
 * paymongo-webhook records the payment when they do. Server-side
 * authorisation gates on auth.uid() === contract.landlord_id.
 *
 * Returns { ok: true, link_id, checkout_url, expires_at, reused } | { error }
 */
export async function createLandlordPaymentLink({ contractId, billingMonth, note = null, expiresAt = null }) {
  if (!contractId)   return { error: "Missing contractId" };
  if (!billingMonth) return { error: "Missing billingMonth" };

  const { data, error } = await supabase.functions.invoke(
    "paymongo-create-payment-link",
    {
      body: {
        contract_id:   contractId,
        billing_month: billingMonth,
        note:          note || null,
        expires_at:    expiresAt || null,
      },
    },
  );
  if (error)        return { error: await unwrapFnError(error) };
  if (data?.error)  return { error: data.error };
  return data;
}

/**
 * List the open / recent payment links a landlord has generated for a
 * given contract. Mainly powers the "sent links" sub-list in the
 * tenant card. Both tenant and landlord can SELECT via RLS.
 */
export async function fetchPaymentLinks(contractId) {
  if (!contractId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("payment_links")
    .select("id, billing_month, amount_cents, checkout_url, status, expires_at, created_at")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
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
    recorded_by:                r.recorded_by   ?? null,
    note:                       r.note          ?? null,
    billing_month:              r.billing_month ?? null,
    contract: { id: r.contract_id, listings: { title: r.listing_title } },
  }));
  return { data: mapped, error: null };
}

/**
 * Read the contract_rent_status view for a single contract — gives the
 * dashboard a server-computed answer to "is this month paid?" and "how
 * many months unpaid?" without recomputing on the client.
 *
 * Returns { contract_id, tenant_id, landlord_id, listing_id, start_date,
 *           monthly_rent, current_month, last_paid_month, months_unpaid,
 *           next_due_month } | null
 */
export async function fetchContractRentStatus(contractId) {
  if (!contractId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("contract_rent_status")
    .select("*")
    .eq("contract_id", contractId)
    .maybeSingle();
  return { data: data ?? null, error };
}

/**
 * Most-recent succeeded payment for a contract, regardless of billing_month.
 * Matches mobile's lookup: move-in rows (billing_month IS NULL, covering
 * deposit + advance + first month) count as "paid" for next-due-date math,
 * so a tenant who just moved in isn't flagged overdue.
 */
export async function fetchContractLastPaidAt(contractId) {
  if (!contractId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("payment")
    .select("paid_at, amount_cents")
    .eq("contract_id", contractId)
    .eq("status", "succeeded")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data ?? null, error };
}

/**
 * Expand a contract_rent_status row into a per-month list from the month
 * AFTER start_date → current month, each tagged with paid/unpaid + the
 * relevant payment row. The start month itself is covered by the move-in
 * payment (billing_month NULL) and is intentionally omitted.
 *
 * Reads the contract's payment history (succeeded rows with non-null
 * billing_month) and folds it against generate_series-equivalent JS
 * loop. Used by the tenant dashboard's "Rent History" section.
 *
 * Returns [{ billing_month: 'YYYY-MM-01', amount_cents, status: 'paid'|'unpaid',
 *            paid_at: ISO|null, paymongo_payment_intent_id: string|null }]
 */
export async function fetchRentMonths(contractId) {
  if (!contractId) return { data: [], error: null };

  const { data: status, error: sErr } = await fetchContractRentStatus(contractId);
  if (sErr || !status?.start_date) return { data: [], error: sErr };

  const { data: paid, error: pErr } = await supabase
    .from("payment")
    .select("billing_month, amount_cents, paid_at, paymongo_payment_intent_id, method")
    .eq("contract_id", contractId)
    .eq("status", "succeeded")
    .not("billing_month", "is", null)
    .order("billing_month", { ascending: true });
  if (pErr) return { data: [], error: pErr };

  const paidMap = new Map(
    (paid ?? []).map((p) => [String(p.billing_month).slice(0, 10), p])
  );

  const rentCents = Math.round(Number(status.monthly_rent ?? 0) * 100);
  const months = [];
  const start = new Date(`${String(status.start_date).slice(0, 10)}T00:00:00`);
  const today = new Date();
  // Skip the start month: the move-in payment (billing_month NULL) covers
  // it. The first cycle billed by the schedule is start_month + 1, matching
  // contract_rent_status view and mobile's next_due semantic.
  let cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const end   = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-01`;
    const hit = paidMap.get(key);
    months.push({
      billing_month:              key,
      amount_cents:               hit?.amount_cents ?? rentCents,
      status:                     hit ? "paid" : "unpaid",
      paid_at:                    hit?.paid_at ?? null,
      paymongo_payment_intent_id: hit?.paymongo_payment_intent_id ?? null,
      method:                     hit?.method ?? null,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return { data: months, error: null };
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
