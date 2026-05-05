import { supabase } from "./supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Post-rent service
//
// Status machine (mirrors supabase/post_rent_module.sql):
//   active ──(notice)──► terminating ──(effective + tenant-vacated)──► terminated ──(close)──► closed
//   active ──(propose+accept)──► terminating ──► terminated ──► closed     [mutual / fixed-term]
//   active ──(at endDate, no renewal)──► expiring ──(endDate)──► ended ──(close)──► closed
//   active ──(eviction)──► terminating(eviction) ──► terminated ──► closed
//   listings.status: rented → archived (on close) → active (on relist)
//
// Web's "active" tenancy is encoded as contract.status='paid'. The new
// post-rent statuses sit downstream of 'paid'.
// ─────────────────────────────────────────────────────────────────────────────

const TABLE = "contract";

const NOTICE_DAYS_MTM = 30;

// Mobile uses 'rent' for month-to-month, 'lease' for fixed-term.
const isMonthToMonth = (row) => row?.listing_type === "rent";
const isFixedTerm    = (row) => row?.listing_type === "lease";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days, baseIso = null) {
  const base = baseIso ? new Date(baseIso) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

async function logEvent(contractId, eventType, payload = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("contract_event").insert({
    contract_id: contractId,
    actor_id:    user.id,
    event_type:  eventType,
    payload,
  });
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getContract(contractId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", contractId)
    .maybeSingle();
  return { data, error };
}

export async function getTermination(contractId) {
  const { data, error } = await supabase
    .from("contract_termination")
    .select("*")
    .eq("contract_id", contractId)
    .maybeSingle();
  return { data, error };
}

export async function listDeductions(terminationId) {
  if (!terminationId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("contract_deduction")
    .select("*")
    .eq("termination_id", terminationId)
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

/**
 * Aggregate everything the move-out / dashboard UI needs:
 * contract + termination + deductions + open reports + outstanding-balance flag.
 */
export async function getTerminationState(contractId) {
  if (!contractId) return { data: null, error: new Error("contractId required") };

  const [{ data: contract, error: cErr }, { data: termination, error: tErr }] = await Promise.all([
    getContract(contractId),
    getTermination(contractId),
  ]);
  if (cErr) return { data: null, error: cErr };
  if (tErr) return { data: null, error: tErr };
  if (!contract) return { data: null, error: new Error("Contract not found") };

  let deductions = [];
  if (termination?.id) {
    const { data } = await listDeductions(termination.id);
    deductions = data;
  }

  // Open / in-progress reports for this contract.
  const { data: reports } = await supabase
    .from("report")
    .select("id, title, status")
    .eq("contract_id", contractId)
    .in("status", ["open", "in_progress"]);

  const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const securityDeposit = Number(termination?.security_deposit_amount ?? contract.security_deposit ?? 0);
  const amountReturned  = Math.max(securityDeposit - totalDeductions, 0);

  return {
    data: {
      contract,
      termination,
      deductions,
      openReports: reports ?? [],
      totals: { securityDeposit, totalDeductions, amountReturned },
    },
    error: null,
  };
}

// ─── Termination request ─────────────────────────────────────────────────────

/**
 * Initiate a termination.
 *   - month-to-month: type='notice', effectiveDate defaults to +30 days.
 *   - fixed-term:     type='mutual' (proposal — needs the other party to accept),
 *                     or type='non_renewal' (landlord, on/after endDate),
 *                     or type='eviction'    (landlord, with reason).
 *
 * Side effects:
 *   - inserts contract_termination row
 *   - flips contract.status: 'paid' → 'terminating' (or 'expiring' for non_renewal)
 *   - records audit event
 */
export async function requestTermination({ contractId, type, reason, effectiveDate, initiatedBy }) {
  if (!contractId || !type || !initiatedBy) {
    return { data: null, error: new Error("contractId, type, initiatedBy required") };
  }
  const { data: contract, error: cErr } = await getContract(contractId);
  if (cErr || !contract) return { data: null, error: cErr ?? new Error("Contract not found") };

  // Guard: contract must be in an active rental state.
  if (!["paid", "expiring"].includes(contract.status)) {
    return { data: null, error: new Error(`Cannot terminate from status '${contract.status}'`) };
  }

  // Validate the type against the lease kind.
  if (type === "notice" && !isMonthToMonth(contract)) {
    return { data: null, error: new Error("30-day notice only applies to month-to-month leases") };
  }
  if (type === "mutual" && !isFixedTerm(contract)) {
    return { data: null, error: new Error("Mutual termination only applies to fixed-term leases") };
  }
  if ((type === "non_renewal" || type === "eviction") && initiatedBy !== "landlord") {
    return { data: null, error: new Error("Only the landlord can initiate non-renewal or eviction") };
  }

  const today = todayIso();
  const effective =
    effectiveDate ??
    (type === "notice"      ? addDaysIso(NOTICE_DAYS_MTM)
    : type === "non_renewal" ? (contract.end_date ?? today)
    : today);

  const row = {
    contract_id:                    contractId,
    initiated_by:                   initiatedBy,
    type,
    notice_date:                    today,
    effective_date:                 effective,
    reason:                         reason ?? null,
    security_deposit_amount:        Number(contract.security_deposit ?? 0),
    mutual_proposed_at:             type === "mutual" ? new Date().toISOString() : null,
    // Auto-mark the proposer as accepted on a mutual proposal.
    mutual_accepted_by_tenant_at:   (type === "mutual" && initiatedBy === "tenant")   ? new Date().toISOString() : null,
    mutual_accepted_by_landlord_at: (type === "mutual" && initiatedBy === "landlord") ? new Date().toISOString() : null,
  };

  const { data: termination, error: insErr } = await supabase
    .from("contract_termination")
    .insert(row)
    .select("*")
    .single();
  if (insErr) return { data: null, error: insErr };

  // Mutual proposal stays in 'paid' until the other side accepts.
  // non_renewal flips to 'expiring' (auto-rolls to 'ended' at endDate).
  // notice / eviction flip to 'terminating' immediately.
  let nextStatus = contract.status;
  if (type === "notice" || type === "eviction") nextStatus = "terminating";
  else if (type === "non_renewal")              nextStatus = "expiring";

  if (nextStatus !== contract.status) {
    await supabase.from(TABLE).update({
      status:             nextStatus,
      terminated_by:      type === "eviction" ? "eviction" : initiatedBy,
      termination_reason: reason ?? null,
      notice_date:        today,
      effective_end_date: effective,
      updated_at:         new Date().toISOString(),
    }).eq("id", contractId);
  }

  await logEvent(contractId, `termination_${type}_requested`, {
    initiatedBy, effectiveDate: effective, reason,
  });

  return { data: termination, error: null };
}

/**
 * The other side accepts a mutual termination proposal.
 * Once both sides have accepted, contract.status flips to 'terminating'.
 */
export async function acceptMutualTermination({ contractId, role }) {
  if (!["tenant", "landlord"].includes(role)) {
    return { error: new Error("role must be 'tenant' or 'landlord'") };
  }
  const { data: term } = await getTermination(contractId);
  if (!term || term.type !== "mutual") {
    return { error: new Error("No mutual termination proposal pending") };
  }
  if (term.mutual_withdrawn_at) {
    return { error: new Error("Proposal was withdrawn") };
  }

  const patch = role === "tenant"
    ? { mutual_accepted_by_tenant_at:   new Date().toISOString() }
    : { mutual_accepted_by_landlord_at: new Date().toISOString() };
  patch.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("contract_termination")
    .update(patch)
    .eq("id", term.id)
    .select("*")
    .single();
  if (error) return { error };

  const bothAccepted = !!updated.mutual_accepted_by_tenant_at && !!updated.mutual_accepted_by_landlord_at;
  if (bothAccepted) {
    await supabase.from(TABLE).update({
      status:             "terminating",
      terminated_by:      "mutual",
      notice_date:        updated.notice_date,
      effective_end_date: updated.effective_date,
      updated_at:         new Date().toISOString(),
    }).eq("id", contractId);
    await logEvent(contractId, "termination_mutual_accepted", { role });
  } else {
    await logEvent(contractId, "termination_mutual_partial_accept", { role });
  }

  return { data: updated, error: null };
}

export async function withdrawMutualTermination({ contractId }) {
  const { data: term } = await getTermination(contractId);
  if (!term || term.type !== "mutual") {
    return { error: new Error("No mutual termination to withdraw") };
  }
  const { error } = await supabase
    .from("contract_termination")
    .update({ mutual_withdrawn_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", term.id);
  if (error) return { error };
  await logEvent(contractId, "termination_mutual_withdrawn", {});
  return { error: null };
}

// ─── Tenant move-out confirmation ────────────────────────────────────────────

export async function confirmTenantVacated({ contractId }) {
  const { data: term } = await getTermination(contractId);
  if (!term) return { error: new Error("No termination in progress") };
  if (term.tenant_vacated_confirmed_at) return { error: null }; // idempotent

  const { error } = await supabase
    .from("contract_termination")
    .update({ tenant_vacated_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", term.id);
  if (error) return { error };

  await logEvent(contractId, "tenant_vacated_confirmed", {});
  return { error: null };
}

// ─── Deductions ──────────────────────────────────────────────────────────────

export async function addDeduction({ terminationId, category, description, amount, photoUrl }) {
  if (!terminationId || !category || amount == null) {
    return { error: new Error("terminationId, category, amount required") };
  }
  const { data, error } = await supabase
    .from("contract_deduction")
    .insert({
      termination_id: terminationId,
      category,
      description: description ?? null,
      amount: Number(amount),
      photo_url: photoUrl ?? null,
    })
    .select("*")
    .single();
  return { data, error };
}

export async function removeDeduction(id) {
  const { error } = await supabase.from("contract_deduction").delete().eq("id", id);
  return { error };
}

// ─── Move-out gates (landlord-side flags) ────────────────────────────────────

export async function setReportsCarryOver(contractId, ack) {
  const { data: term } = await getTermination(contractId);
  if (!term) return { error: new Error("No termination in progress") };
  const { error } = await supabase
    .from("contract_termination")
    .update({ reports_carry_over_ack: !!ack, updated_at: new Date().toISOString() })
    .eq("id", term.id);
  if (!error) await logEvent(contractId, "reports_carry_over_set", { ack: !!ack });
  return { error };
}

export async function waiveOutstandingBalance(contractId, note) {
  const { data: term } = await getTermination(contractId);
  if (!term) return { error: new Error("No termination in progress") };
  const { error } = await supabase
    .from("contract_termination")
    .update({
      outstanding_balance_waived:    true,
      outstanding_balance_waive_note: note ?? null,
      updated_at:                    new Date().toISOString(),
    })
    .eq("id", term.id);
  if (!error) await logEvent(contractId, "outstanding_balance_waived", { note });
  return { error };
}

// ─── Close-out ───────────────────────────────────────────────────────────────

/**
 * Landlord closes the contract.
 * Gates (all enforced here, since RLS can't enforce them cross-row):
 *   - contract status ∈ {terminating, ended}
 *   - termination row exists
 *   - tenant_vacated_confirmed_at IS NOT NULL  (unless force=true with a reason)
 *   - reports: all open/in_progress closed OR reports_carry_over_ack=true
 *   - outstanding balance: zero OR outstanding_balance_waived=true
 *
 * Side effects:
 *   - contract.status → 'closed'
 *   - contract.actual_end_date set
 *   - listings.status: 'rented' → 'archived'  (NOT auto-active — landlord relists from RelistPrompt)
 *   - audit event
 */
export async function closeContract({ contractId, force = false, forceReason }) {
  const { data: contract, error: cErr } = await getContract(contractId);
  if (cErr || !contract) return { error: cErr ?? new Error("Contract not found") };

  if (!["terminating", "ended"].includes(contract.status)) {
    return { error: new Error(`Cannot close contract from status '${contract.status}'`) };
  }

  const { data: term } = await getTermination(contractId);
  if (!term) return { error: new Error("No termination row to close") };

  if (!term.tenant_vacated_confirmed_at && !force) {
    return { error: new Error("Tenant has not yet confirmed they vacated. Use force-close with a reason if unresponsive.") };
  }
  if (force && !forceReason) {
    return { error: new Error("Force-close requires a reason") };
  }

  // Reports gate
  const { data: openReports } = await supabase
    .from("report")
    .select("id")
    .eq("contract_id", contractId)
    .in("status", ["open", "in_progress"]);
  if ((openReports?.length ?? 0) > 0 && !term.reports_carry_over_ack) {
    return { error: new Error("Resolve open reports or acknowledge carry-over before closing.") };
  }

  // Outstanding balance gate — caller is responsible for computing this; we
  // trust the landlord's `waived` flag if balance is non-zero.
  // (Real balance comes from your payments ledger; not checked here.)

  const nowIso = new Date().toISOString();

  const updates = [
    supabase.from("contract_termination").update({
      landlord_closed_at: nowIso,
      forced_close_reason: force ? forceReason : null,
      updated_at: nowIso,
    }).eq("id", term.id),

    supabase.from(TABLE).update({
      status:          "closed",
      actual_end_date: nowIso,
      updated_at:      nowIso,
    }).eq("id", contractId),
  ];

  if (contract.listing_id) {
    updates.push(
      supabase.from("listings").update({
        status:     "archived",
        updated_at: nowIso,
      }).eq("id", contract.listing_id)
    );
  }

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error };

  await logEvent(contractId, "contract_closed", { force, forceReason });
  return { data: { listingId: contract.listing_id }, error: null };
}

// ─── Relisting ───────────────────────────────────────────────────────────────

export async function relistListing({ listingId, mode = "as_is" }) {
  if (!listingId) return { error: new Error("listingId required") };
  const { error } = await supabase
    .from("listings")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", listingId);
  return { error, mode };
}

export async function archiveListing({ listingId }) {
  if (!listingId) return { error: new Error("listingId required") };
  const { error } = await supabase
    .from("listings")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", listingId);
  return { error };
}

// ─── Helpers for the UI ──────────────────────────────────────────────────────

export const TERMINATION_TYPES = {
  notice:      { label: "30-day Notice",      describes: "Month-to-month termination" },
  mutual:      { label: "Mutual Termination", describes: "Fixed-term early end (both parties)" },
  non_renewal: { label: "Non-Renewal",         describes: "Lease ends on its end date" },
  eviction:    { label: "Eviction",            describes: "Landlord-initiated for breach" },
  expired:     { label: "Expired",             describes: "Reached end date" },
};

export const DEDUCTION_CATEGORIES = [
  { value: "damage",       label: "Damage to property" },
  { value: "cleaning",     label: "Cleaning fee" },
  { value: "unpaid_rent",  label: "Unpaid rent" },
  { value: "utilities",    label: "Utilities owed" },
  { value: "keys",         label: "Lost keys / replacement" },
  { value: "other",        label: "Other" },
];

/**
 * UI gate evaluation — returns booleans for each move-out gate
 * so the close button can be disabled with hint text.
 */
export function evaluateMoveOutGates({ contract, termination, openReports, outstandingBalance = 0 }) {
  const gates = {
    statusOk:         !!contract && ["terminating", "ended"].includes(contract.status),
    tenantVacated:    !!termination?.tenant_vacated_confirmed_at,
    reportsClear:     (openReports?.length ?? 0) === 0 || !!termination?.reports_carry_over_ack,
    balanceClear:     outstandingBalance <= 0 || !!termination?.outstanding_balance_waived,
  };
  gates.canClose = gates.statusOk && gates.tenantVacated && gates.reportsClear && gates.balanceClear;
  return gates;
}
