import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Circle,
  Plus, Trash2, ShieldCheck, FileText, AlertTriangle, X, Lock,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import {
  getTerminationState,
  addDeduction,
  removeDeduction,
  setReportsCarryOver,
  waiveOutstandingBalance,
  closeContract,
  evaluateMoveOutGates,
  DEDUCTION_CATEGORIES,
} from "./lib/postRentService";

const BRAND  = "#FF7043";
const INK    = "#101321";
const MUTED  = "#6B7280";
const BG     = "#FAF7F6";
const BORDER = "#EFE7E5";

const fmtMoney = (n) => `₱${Number(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate  = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

export default function MoveOutChecklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading]   = useState(true);
  const [busy,    setBusy]      = useState(false);
  const [state,   setState]     = useState(null);
  const [error,   setError]     = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [waiveModal, setWaiveModal] = useState(false);
  const [forceModal, setForceModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const { data, error: e } = await getTerminationState(id);
    if (e) setError(e.message ?? String(e));
    setState(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isLandlord = state?.contract?.landlord_id && user?.id && state.contract.landlord_id === user.id;

  // Outstanding balance: not modeled in payments ledger here — assume 0
  // unless extended later. The waive flag exists in DB regardless.
  const outstandingBalance = 0;

  const gates = useMemo(() => {
    if (!state) return null;
    return evaluateMoveOutGates({
      contract: state.contract,
      termination: state.termination,
      openReports: state.openReports,
      outstandingBalance,
    });
  }, [state]);

  const onAddDeduction = async ({ category, description, amount }) => {
    setBusy(true);
    const { error: e } = await addDeduction({
      terminationId: state.termination.id,
      category, description, amount,
    });
    setBusy(false);
    if (e) { alert(e.message); return; }
    setShowAdd(false);
    await load();
  };

  const onRemoveDeduction = async (deductionId) => {
    if (!confirm("Remove this deduction?")) return;
    setBusy(true);
    const { error: e } = await removeDeduction(deductionId);
    setBusy(false);
    if (e) { alert(e.message); return; }
    await load();
  };

  const onToggleReportsCarryOver = async () => {
    setBusy(true);
    const { error: e } = await setReportsCarryOver(id, !state.termination.reports_carry_over_ack);
    setBusy(false);
    if (e) { alert(e.message); return; }
    await load();
  };

  const onWaive = async (note) => {
    setBusy(true);
    const { error: e } = await waiveOutstandingBalance(id, note);
    setBusy(false);
    if (e) { alert(e.message); return; }
    setWaiveModal(false);
    await load();
  };

  const onClose = async () => {
    if (!confirm("Close this contract? The tenant will lose access to the rental dashboard and the listing will be archived.")) return;
    setBusy(true);
    const { data, error: e } = await closeContract({ contractId: id });
    setBusy(false);
    if (e) { alert(e.message); return; }
    if (data?.listingId) navigate(`/listings/${data.listingId}/relist`);
    else navigate("/tenant-management");
  };

  const onForceClose = async (forceReason) => {
    setBusy(true);
    const { data, error: e } = await closeContract({ contractId: id, force: true, forceReason });
    setBusy(false);
    if (e) { alert(e.message); return; }
    setForceModal(false);
    if (data?.listingId) navigate(`/listings/${data.listingId}/relist`);
    else navigate("/tenant-management");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin" size={32} color={BRAND} />
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: BG }}>
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-sm text-center" style={{ color: MUTED }}>{error ?? "Contract not found."}</p>
        <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: BRAND }}>Go back</button>
      </div>
    );
  }

  if (!isLandlord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: BG }}>
        <Lock size={36} className="text-slate-400" />
        <p className="text-sm font-semibold" style={{ color: INK }}>Landlord-only</p>
        <p className="text-sm text-center" style={{ color: MUTED }}>The move-out checklist is managed by the landlord.</p>
        <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: BRAND }}>Go back</button>
      </div>
    );
  }

  if (state.contract.status === "closed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: BG }}>
        <CheckCircle2 size={36} className="text-green-500" />
        <p className="text-sm font-semibold" style={{ color: INK }}>Contract already closed</p>
        <button
          onClick={() => state.contract.listing_id ? navigate(`/listings/${state.contract.listing_id}/relist`) : navigate("/tenant-management")}
          className="text-sm underline" style={{ color: BRAND }}
        >
          {state.contract.listing_id ? "Go to relist screen" : "Back to tenants"}
        </button>
      </div>
    );
  }

  const t = state.termination;
  const totals = state.totals;

  return (
    <div className="min-h-screen pb-12" style={{ background: BG }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: BORDER }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100">
            <ArrowLeft size={20} style={{ color: INK }} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold" style={{ color: INK }}>Move-Out Checklist</h1>
            <p className="text-[11px]" style={{ color: MUTED }}>Contract #{state.contract.id.slice(0, 8)}</p>
          </div>
          <NotificationBell framed />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4">

        {/* Section 1: Status */}
        <Section title="Termination details" icon={FileText}>
          <Detail label="Type"           value={t?.type ?? "—"} />
          <Detail label="Initiated by"   value={t?.initiated_by ?? "—"} />
          <Detail label="Notice date"    value={fmtDate(t?.notice_date)} />
          <Detail label="Effective date" value={fmtDate(t?.effective_date)} />
          {t?.reason && <Detail label="Reason" value={t.reason} />}
          <hr className="my-2 border-slate-100" />
          <GateRow
            ok={!!t?.tenant_vacated_confirmed_at}
            label="Tenant has confirmed vacated"
            sub={t?.tenant_vacated_confirmed_at
              ? `Confirmed ${fmtDate(t.tenant_vacated_confirmed_at)}`
              : "Tenant must confirm from their dashboard before close-out."}
          />
        </Section>

        {/* Section 2: Reports gate */}
        <Section title="Open maintenance reports" icon={AlertTriangle}>
          {state.openReports.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>No open reports.</p>
          ) : (
            <>
              <ul className="space-y-2 mb-3">
                {state.openReports.map((r) => (
                  <li key={r.id} className="text-sm flex items-center gap-2" style={{ color: INK }}>
                    <Circle size={10} className="text-amber-500" />
                    <span className="flex-1">{r.title}</span>
                    <span className="text-[11px]" style={{ color: MUTED }}>{r.status}</span>
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-[12px] cursor-pointer" style={{ color: INK }}>
                <input
                  type="checkbox"
                  checked={!!t?.reports_carry_over_ack}
                  onChange={onToggleReportsCarryOver}
                  disabled={busy}
                  className="mt-0.5"
                />
                <span>
                  I acknowledge these reports will carry over post-tenant (the unit will not block on them).
                </span>
              </label>
            </>
          )}
          <GateRow
            ok={state.openReports.length === 0 || !!t?.reports_carry_over_ack}
            label="Reports gate cleared"
          />
        </Section>

        {/* Section 3: Outstanding balance */}
        <Section title="Outstanding balance" icon={AlertCircle}>
          <Detail label="Balance" value={fmtMoney(outstandingBalance)} />
          {outstandingBalance > 0 && !t?.outstanding_balance_waived && (
            <button
              onClick={() => setWaiveModal(true)}
              className="mt-2 text-xs font-semibold underline"
              style={{ color: BRAND }}
            >
              Waive balance
            </button>
          )}
          {t?.outstanding_balance_waived && (
            <p className="mt-2 text-[12px]" style={{ color: MUTED }}>
              Waived{t?.outstanding_balance_waive_note ? ` — ${t.outstanding_balance_waive_note}` : ""}.
            </p>
          )}
          <GateRow
            ok={outstandingBalance <= 0 || !!t?.outstanding_balance_waived}
            label="Balance gate cleared"
          />
        </Section>

        {/* Section 4: Deposit deductions */}
        <Section
          title="Security deposit & deductions"
          icon={ShieldCheck}
          action={
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white"
              style={{ background: BRAND }}
            >
              <Plus size={12} /> Add
            </button>
          }
        >
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Tile label="Deposit"     value={fmtMoney(totals.securityDeposit)} />
            <Tile label="Deductions"  value={fmtMoney(totals.totalDeductions)} accent />
            <Tile label="To return"   value={fmtMoney(totals.amountReturned)} positive />
          </div>

          {state.deductions.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>No deductions added.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: BORDER }}>
              {state.deductions.map((d) => {
                const cat = DEDUCTION_CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category;
                return (
                  <li key={d.id} className="flex items-start justify-between gap-2 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: INK }}>{cat}</p>
                      {d.description && <p className="text-[12px]" style={{ color: MUTED }}>{d.description}</p>}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: INK }}>{fmtMoney(d.amount)}</span>
                    <button
                      onClick={() => onRemoveDeduction(d.id)}
                      disabled={busy}
                      className="p-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {t?.deposit_disputed_by_tenant && (
            <p className="mt-2 text-[12px] text-red-600">
              Tenant has disputed the breakdown: {t.deposit_dispute_note || "(no note)"}
            </p>
          )}
        </Section>

        {/* Close button */}
        <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: BORDER }}>
          <button
            onClick={onClose}
            disabled={!gates?.canClose || busy}
            className="w-full h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: BRAND }}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Close contract & archive listing
          </button>
          {!gates?.canClose && (
            <p className="mt-2 text-[12px] text-center" style={{ color: MUTED }}>
              {!gates?.tenantVacated
                ? "Awaiting tenant's vacated confirmation."
                : !gates?.reportsClear
                ? "Resolve open reports or acknowledge carry-over."
                : !gates?.balanceClear
                ? "Settle or waive the outstanding balance."
                : "All gates must pass."}
            </p>
          )}
          {!gates?.tenantVacated && (
            <button
              onClick={() => setForceModal(true)}
              disabled={busy}
              className="mt-2 w-full text-[11px] underline disabled:opacity-50"
              style={{ color: MUTED }}
            >
              Tenant unresponsive? Force-close (audit logged)
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <AddDeductionModal
          busy={busy}
          onClose={() => setShowAdd(false)}
          onSubmit={onAddDeduction}
        />
      )}

      {waiveModal && (
        <WaiveBalanceModal
          busy={busy}
          onClose={() => setWaiveModal(false)}
          onSubmit={onWaive}
        />
      )}

      {forceModal && (
        <ForceCloseModal
          busy={busy}
          onClose={() => setForceModal(false)}
          onSubmit={onForceClose}
        />
      )}
    </div>
  );
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: BORDER }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${BRAND}1A` }}>
            {Icon && <Icon size={15} color={BRAND} />}
          </div>
          <h2 className="text-sm font-bold" style={{ color: INK }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs" style={{ color: MUTED }}>{label}</span>
      <span className="text-sm font-semibold text-right" style={{ color: INK }}>{value}</span>
    </div>
  );
}

function Tile({ label, value, accent, positive }) {
  const color = positive ? "#15803D" : accent ? "#B91C1C" : INK;
  const bg    = positive ? "#22C55E1A" : accent ? "#FEE2E2" : `${BRAND}0F`;
  return (
    <div className="rounded-xl p-3" style={{ background: bg }}>
      <p className="text-[11px]" style={{ color: MUTED }}>{label}</p>
      <p className="text-base font-bold mt-1 truncate" style={{ color }}>{value}</p>
    </div>
  );
}

function GateRow({ ok, label, sub }) {
  return (
    <div className="mt-3 flex items-start gap-2">
      {ok
        ? <CheckCircle2 size={16} className="text-green-500 mt-0.5" />
        : <Circle size={16} className="text-amber-500 mt-0.5" />}
      <div className="flex-1">
        <p className="text-[12px] font-semibold" style={{ color: ok ? "#15803D" : "#B45309" }}>{label}</p>
        {sub && <p className="text-[11px]" style={{ color: MUTED }}>{sub}</p>}
      </div>
    </div>
  );
}

function AddDeductionModal({ busy, onClose, onSubmit }) {
  const [category,    setCategory]    = useState(DEDUCTION_CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");

  const submit = (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return;
    onSubmit({ category, description: description.trim() || null, amount: n });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold" style={{ color: INK }}>Add deduction</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-semibold" style={{ color: INK }}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
          >
            {DEDUCTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="block mt-3">
          <span className="text-xs font-semibold" style={{ color: INK }}>Amount (₱)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vxr-accent/40 focus:border-vxr-accent"
          />
        </label>

        <label className="block mt-3">
          <span className="text-xs font-semibold" style={{ color: INK }}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="e.g. broken bathroom mirror"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vxr-accent/40 focus:border-vxr-accent"
          />
        </label>

        <div className="mt-5 flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50" style={{ color: INK }}>Cancel</button>
          <button type="submit" disabled={busy || !amount} className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: BRAND }}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            Add deduction
          </button>
        </div>
      </form>
    </div>
  );
}

function WaiveBalanceModal({ busy, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSubmit(note.trim() || null); }}
        className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl"
      >
        <h3 className="text-lg font-bold mb-3" style={{ color: INK }}>Waive outstanding balance</h3>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vxr-accent/40 focus:border-vxr-accent"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50" style={{ color: INK }}>Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: BRAND }}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            Waive balance
          </button>
        </div>
      </form>
    </div>
  );
}

function ForceCloseModal({ busy, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (reason.trim()) onSubmit(reason.trim()); }}
        className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl"
      >
        <h3 className="text-lg font-bold mb-1" style={{ color: INK }}>Force-close contract</h3>
        <p className="text-[12px] mb-3" style={{ color: MUTED }}>
          Use only if the tenant is unresponsive after the effective date. Reason is logged in the audit trail.
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vxr-accent/40 focus:border-vxr-accent"
        />
        <div className="mt-4 flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50" style={{ color: INK }}>Cancel</button>
          <button type="submit" disabled={busy || !reason.trim()} className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: "#B91C1C" }}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            Force-close
          </button>
        </div>
      </form>
    </div>
  );
}
