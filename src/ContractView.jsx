import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Download, Check, CreditCard,
  FileText, AlertCircle, Edit3, Shield, Building2, Calendar,
  X, Loader2, Hourglass,
} from "lucide-react";
import AppHeader from "./components/AppHeader.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  fetchContractById, updateContract, signContract, resetContractSignatures,
  recordContractPayment, getContractStatus, CONTRACT_TYPES,
  normalizeContract, denormalizeContractPatch, uploadedContractInfo,
} from "./lib/contractsService";
import {
  resolveTerms, listingTypeFromContract,
} from "./lib/contractTemplates";

const STATUS_BADGE = {
  draft:            { label: "Draft",                   bg: "#F1F5F9", color: "#475569" },
  pending_landlord: { label: "Awaiting landlord signature", bg: "#FFF0E6", color: "#E07820" },
  pending_tenant:   { label: "Awaiting tenant signature",   bg: "#FFF0E6", color: "#E07820" },
  both_signed:      { label: "Both parties signed",         bg: "#DBEAFE", color: "#1E40AF" },
  paid:             { label: "Active — Payment received",   bg: "#DCFCE7", color: "#15803D" },
};

export default function ContractView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signModal, setSignModal] = useState(null); // 'landlord' | 'tenant' | null

  // Load contract from Supabase. Two self-healing steps run on load:
  //   1. If the contract.type drifted from the listing's listing_type
  //      (older contracts hardcoded "fixed_term"), realign + persist.
  //   2. If the contract was created before buildContractFromApplication
  //      knew how to read listing_financials, monthly_rent will be 0.
  //      Backfill it from the listing so the tenant's payment screen
  //      doesn't show ₱0 due.
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchContractById(id).then(({ data, error }) => {
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      const normalized = normalizeContract(data);

      const listingType = data.listings?.listing_type;
      const expectedType = listingType === "rent" ? "month_to_month" : "fixed_term";
      const patch = {};
      if (listingType && normalized.type !== expectedType) {
        normalized.type = expectedType;
        patch.listing_type = listingType;
      }

      const fin = Array.isArray(data.listings?.listing_financials)
        ? data.listings.listing_financials[0]
        : data.listings?.listing_financials;
      const listingRent     = Number(fin?.monthly_rent     ?? 0);
      const listingDeposit  = Number(fin?.security_deposit ?? 0);
      const listingAdvance  = Number(fin?.advance_payment  ?? 0);
      if (listingRent > 0 && Number(normalized.monthlyRent) === 0) {
        normalized.monthlyRent     = listingRent;
        normalized.securityDeposit = listingDeposit > 0 ? listingDeposit : listingRent;
        normalized.advanceRent     = listingAdvance > 0 ? listingAdvance : listingRent;
        patch.monthly_rent     = normalized.monthlyRent;
        patch.security_deposit = normalized.securityDeposit;
        patch.advance_rent     = normalized.advanceRent;
      }

      if (Object.keys(patch).length > 0) {
        updateContract(id, patch).catch(() => {});
      }

      setContract(normalized);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading contract…
      </div>
    );
  }

  if (notFound || !contract) {
    return <NotFound onBack={() => navigate("/enlistment")} />;
  }

  const status = getContractStatus(contract);
  const meta = CONTRACT_TYPES[contract.type] ?? CONTRACT_TYPES.fixed_term;
  const isLocked = !!(contract.landlordSignature || contract.tenantSignature);
  // The contract type follows the listing's listing_type — it is not a
  // free toggle. The pill below shows the type without inviting changes.
  const uploaded = uploadedContractInfo(contract.listings);

  // Role gate: a user may only sign as the role they actually are. The
  // landlord cannot sign as the tenant and vice versa, regardless of
  // which signature is missing.
  const isLandlord = !!user?.id && user.id === contract.landlordId;
  const isTenant   = !!user?.id && user.id === contract.tenantId;
  const myRole = isLandlord ? "landlord" : isTenant ? "tenant" : null;

  const handleField = (key, value) => {
    setContract((prev) => ({ ...prev, [key]: value }));
  };

  const requestSign = (role) => {
    // Final guard — ignore any path that would let one party sign as the
    // other. The buttons below are also conditionally rendered, but this
    // protects against stray callers / programmatic clicks.
    if (role !== myRole) return;
    setSignModal(role);
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    const patch = denormalizeContractPatch(contract);
    const { error } = await updateContract(id, patch);
    if (error) alert("Failed to save: " + error.message);
    setEditing(false);
    setSaving(false);
  };

  const handleSign = async (role, name, signatureDataUrl) => {
    const { data: saved, error } = await signContract(id, role, name, signatureDataUrl);
    if (error) { alert("Signature failed: " + error.message); return; }
    // Reload from returned row so status and signatures are accurate
    if (saved) {
      setContract(normalizeContract(saved));
    } else {
      const signedAt = new Date().toISOString();
      setContract((prev) => ({
        ...prev,
        [role === "landlord" ? "landlordSignature" : "tenantSignature"]: {
          name,
          signedAt,
          image: signatureDataUrl ?? null,
        },
      }));
    }
    setSignModal(null);
  };

  const handleExport = () => {
    window.print();
  };

  const handleProceedPayment = () => {
    navigate(`/contract/${id}/pay`);
  };

  const handleResetSignatures = async () => {
    if (!window.confirm("Clear both signatures? You'll need to sign again.")) return;
    const { error } = await resetContractSignatures(id);
    if (error) { alert("Reset failed: " + error.message); return; }
    setContract((prev) => ({ ...prev, landlordSignature: null, tenantSignature: null, payment: null, status: "awaiting_tenant" }));
  };

  const inputCls = (extra = "") =>
    `w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[13px] text-slate-900 outline-none focus:border-vxr-accent focus:ring-2 focus:ring-orange-100 transition disabled:bg-slate-50 disabled:text-slate-500 ${extra}`;

  return (
    <div className="w-full min-h-screen bg-vxr-bg flex flex-col print:bg-white">
      <Header onBack={() => navigate(-1)} />

      {/* Status banner */}
      <div className="bg-white border-b border-slate-100 print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: STATUS_BADGE[status].bg, color: STATUS_BADGE[status].color }}
          >
            <Shield size={12} />
            {STATUS_BADGE[status].label}
          </span>

          {/* Contract type — read-only. The listing's listing_type
              determines this; landlords change it on the listing, not here. */}
          <div
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: `${meta.accent}14`, color: meta.accent }}
            title="Contract type is set by the listing"
          >
            <FileText size={12} />
            {meta.short ?? CONTRACT_TYPES[contract.type]?.short}
          </div>
        </div>
      </div>

      {/* Contract document */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-6 print:py-0 print:px-0 print:max-w-none">
        <article
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none"
          id="contract-doc"
        >
          {/* Title block — only when there is no uploaded contract.
              When the landlord supplied their own PDF, the gradient
              banner + parties grid below would look like a SECOND
              contract sitting on top of the real one (the embedded
              PDF). We render a compact summary card instead. */}
          {!uploaded && (
            <div
              className="px-8 py-7 text-white"
              style={{
                background: `linear-gradient(135deg, ${meta.accent}, ${meta.accent}dd)`,
              }}
            >
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
                {meta.title}
              </h1>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="opacity-80 text-[11px] uppercase tracking-wider mb-0.5">
                    This Agreement is entered into on
                  </div>
                  {editing ? (
                    <input
                      type="date"
                      value={contract.enteredOn}
                      onChange={(e) => handleField("enteredOn", e.target.value)}
                      className="bg-white/20 backdrop-blur border border-white/30 rounded px-2 py-1 text-white text-sm"
                    />
                  ) : (
                    <div className="font-semibold">{formatDate(contract.enteredOn)}</div>
                  )}
                </div>
                <div className="md:text-right">
                  <div className="opacity-80 text-[11px] uppercase tracking-wider mb-0.5">
                    Contract Type
                  </div>
                  <div className="font-semibold">{meta.contractType}</div>
                </div>
              </div>
            </div>
          )}

          {uploaded && (
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10.5px] uppercase tracking-wider font-bold text-slate-500">
                    Move-in Summary
                  </p>
                  <p className="text-base font-bold text-slate-900 mt-0.5 truncate">
                    {contract.propertyAddress || contract.propertyType || "Rental"}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {[contract.landlordName, contract.tenantName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] uppercase tracking-wider font-bold text-slate-500">
                    Total move-in
                  </p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    ₱{(Number(contract.monthlyRent) + Number(contract.securityDeposit) + Number(contract.advanceRent)).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(contract.startDate)}{contract.type === "fixed_term" ? ` → ${formatDate(contract.endDate)}` : " · month-to-month"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parties & Property — only for the default in-app template.
              When an uploaded contract is the source of truth, the
              landlord can still edit these via the Edit button (they
              feed the move-in total + payment), but they're hidden by
              default to avoid the "two contracts" look. */}
          {!uploaded && (
          <div className="px-8 py-6">
            <SectionHead accent={meta.accent}>Parties &amp; Property Details</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4">
              <Field label="Landlord / Lessor"
                value={contract.landlordName}
                editing={editing}
                onChange={(v) => handleField("landlordName", v)}
                inputCls={inputCls()}
              />
              <Field label="Tenant / Lessee"
                value={contract.tenantName}
                editing={editing}
                onChange={(v) => handleField("tenantName", v)}
                inputCls={inputCls()}
              />
              <Field label="Landlord Contact"
                value={contract.landlordContact}
                editing={editing}
                onChange={(v) => handleField("landlordContact", v)}
                inputCls={inputCls()}
              />
              <Field label="Tenant Contact"
                value={contract.tenantContact}
                editing={editing}
                onChange={(v) => handleField("tenantContact", v)}
                inputCls={inputCls()}
              />
              <Field label="Property Address"
                value={contract.propertyAddress}
                editing={editing}
                onChange={(v) => handleField("propertyAddress", v)}
                inputCls={inputCls()}
                wide
              />
              <Field label="Property Type"
                value={contract.propertyType}
                editing={editing}
                onChange={(v) => handleField("propertyType", v)}
                inputCls={inputCls()}
                select={["Apartment", "House", "Condo", "Studio", "Townhouse"]}
              />
              <Field label={contract.type === "fixed_term" ? "Lease Start Date" : "Rental Start Date"}
                value={contract.startDate}
                editing={editing}
                onChange={(v) => handleField("startDate", v)}
                inputCls={inputCls()}
                type="date"
                display={formatDate(contract.startDate)}
              />
              {contract.type === "fixed_term" ? (
                <Field label="Lease End Date"
                  value={contract.endDate}
                  editing={editing}
                  onChange={(v) => handleField("endDate", v)}
                  inputCls={inputCls()}
                  type="date"
                  display={formatDate(contract.endDate)}
                />
              ) : (
                <DisplayField label="Initial Term" value="Month-to-Month (auto-renews)" />
              )}
              {contract.type === "fixed_term" && (
                <Field label="Lease Duration"
                  value={contract.duration}
                  editing={editing}
                  onChange={(v) => handleField("duration", v)}
                  inputCls={inputCls()}
                  select={["6 months", "12 months", "24 months"]}
                />
              )}
              <Field label="Monthly Rent (PHP)"
                value={contract.monthlyRent}
                editing={editing}
                onChange={(v) => handleField("monthlyRent", Number(v))}
                inputCls={inputCls()}
                type="number"
                display={`PHP ${Number(contract.monthlyRent).toLocaleString()}`}
              />
              <Field label="Security Deposit (PHP)"
                value={contract.securityDeposit}
                editing={editing}
                onChange={(v) => handleField("securityDeposit", Number(v))}
                inputCls={inputCls()}
                type="number"
                display={`PHP ${Number(contract.securityDeposit).toLocaleString()}`}
              />
              <Field label="Advance Rent (PHP)"
                value={contract.advanceRent}
                editing={editing}
                onChange={(v) => handleField("advanceRent", Number(v))}
                inputCls={inputCls()}
                type="number"
                display={`PHP ${Number(contract.advanceRent).toLocaleString()}`}
              />
              <Field label="Payment Due Date"
                value={contract.paymentDueDate}
                editing={editing}
                onChange={(v) => handleField("paymentDueDate", Number(v))}
                inputCls={inputCls()}
                type="number"
                display={`Day ${contract.paymentDueDate} of the month`}
              />
              <Field label="Grace Period (days)"
                value={contract.gracePeriodDays}
                editing={editing}
                onChange={(v) => handleField("gracePeriodDays", Number(v))}
                inputCls={inputCls()}
                type="number"
                display={`${contract.gracePeriodDays} days after due date`}
              />
              <DisplayField
                label="Termination Notice"
                value={contract.type === "month_to_month" ? "30 days written notice by either party" : "End of fixed term"}
              />
            </div>
          </div>
          )}

          {/* Terms — when the landlord uploaded a custom contract file,
              that file IS the binding contract. Show it inline (PDF iframe
              when possible) and skip the in-app default terms so the
              tenant doesn't see two competing sets of clauses. */}
          <div className="px-8 py-6 border-t border-slate-100">
            <SectionHead accent={meta.accent}>
              {uploaded ? "Contract Document" : "Terms and Conditions"}
            </SectionHead>
            {uploaded ? (
              <UploadedContractViewer info={uploaded} />
            ) : (
              <TermsList
                terms={resolveTerms(
                  listingTypeFromContract(contract),
                  contract.listings?.terms_override,
                )}
              />
            )}
          </div>

          {/* Signatures */}
          <div className="px-8 py-6 border-t border-slate-100">
            <SectionHead accent={meta.accent}>Signatures</SectionHead>
            <p className="text-[12.5px] text-slate-600 mt-2">
              By signing below, both parties confirm they have read, understood, and agree
              to all terms of this {meta.label}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <SignatureBlock
                role="landlord"
                label="Landlord's Signature"
                signature={contract.landlordSignature}
                canSign={isLandlord}
                onSignClick={() => requestSign("landlord")}
              />
              <SignatureBlock
                role="tenant"
                label="Tenant's Signature"
                signature={contract.tenantSignature}
                canSign={isTenant}
                onSignClick={() => requestSign("tenant")}
              />
            </div>
          </div>

          <div className="px-8 py-4 bg-slate-50 text-[10.5px] text-slate-400 text-center border-t border-slate-100">
            This contract was generated by ViewxRent. Subject to Philippine law including R.A. 9653 (Rent Control Act of 2009).
          </div>
        </article>

        {/* Action bar */}
        <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between print:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => editing ? handleSaveEdits() : setEditing(true)}
              disabled={isLocked || saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
              {editing ? (saving ? "Saving…" : "Save edits") : "Edit details"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              <Download size={14} />
              Export / Print
            </button>
            {isLocked && status !== "paid" && (
              <button
                type="button"
                onClick={handleResetSignatures}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-slate-500 hover:bg-slate-50 transition"
              >
                Clear signatures
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center ml-auto">
            {status === "paid" ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                <Check size={14} />
                Paid · Receipt {contract.payment.transactionId}
              </div>
            ) : status === "both_signed" ? (
              isTenant ? (
                <button
                  type="button"
                  onClick={handleProceedPayment}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  style={{ background: "linear-gradient(135deg, #FF7043, #FF8A80)" }}
                >
                  <CreditCard size={14} />
                  Proceed to Payment
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200">
                  <Hourglass size={14} />
                  Awaiting tenant payment
                </div>
              )
            ) : (
              <>
                {isLandlord && !contract.landlordSignature && (
                  <button
                    type="button"
                    onClick={() => requestSign("landlord")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition"
                    style={{ background: "linear-gradient(135deg, #FF7043, #FF8A80)" }}
                  >
                    Sign as Landlord
                  </button>
                )}
                {isTenant && !contract.tenantSignature && (
                  <button
                    type="button"
                    onClick={() => requestSign("tenant")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition"
                    style={{ background: "linear-gradient(135deg, #FF7043, #FF8A80)" }}
                  >
                    Sign as Tenant
                  </button>
                )}
                {/* Tell each party who they're waiting on, instead of
                    silently hiding the bar. */}
                {isLandlord && contract.landlordSignature && !contract.tenantSignature && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200">
                    <Hourglass size={14} />
                    Awaiting tenant signature
                  </div>
                )}
                {isTenant && contract.tenantSignature && !contract.landlordSignature && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200">
                    <Hourglass size={14} />
                    Awaiting landlord signature
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {signModal && (
        <SignModal
          role={signModal}
          defaultName={
            signModal === "landlord" ? contract.landlordName : contract.tenantName
          }
          accent={meta.accent}
          onCancel={() => setSignModal(null)}
          onConfirm={(name, signatureDataUrl) => handleSign(signModal, name, signatureDataUrl)}
        />
      )}

      <PrintStyles />
    </div>
  );
}

// ============================================================================
// Bits
// ============================================================================

function SectionHead({ children, accent }) {
  return (
    <h2
      className="text-base font-bold tracking-tight uppercase letter-spacing-wide"
      style={{ color: accent, letterSpacing: "0.04em" }}
    >
      {children}
    </h2>
  );
}

function Field({ label, value, editing, onChange, inputCls, type = "text", select, wide, display }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
        {label}
      </div>
      {editing ? (
        select ? (
          <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            {select.map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
        ) : (
          <input
            type={type}
            className={inputCls}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <div className="text-[13.5px] font-semibold text-slate-800 leading-snug">
          {display ?? value ?? "—"}
        </div>
      )}
    </div>
  );
}

function DisplayField({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-[13.5px] font-semibold text-slate-800 leading-snug">
        {value}
      </div>
    </div>
  );
}

function SignatureBlock({ role, label, signature, canSign, onSignClick }) {
  if (signature) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
        <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
          {label}
        </div>
        {signature.image ? (
          <div className="bg-white rounded-md border border-slate-200 p-2 mb-3 flex items-center justify-center min-h-[88px]">
            <img
              src={signature.image}
              alt={`${role} signature`}
              className="max-h-[80px] w-auto"
            />
          </div>
        ) : (
          <div
            className="text-[28px] leading-none italic mb-3 text-slate-800"
            style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" }}
          >
            {signature.name}
          </div>
        )}
        <div className="border-t border-slate-300 pt-2 text-[12px] text-slate-600">
          <div><span className="text-slate-400">Printed Name:</span> {signature.name}</div>
          <div><span className="text-slate-400">Date:</span> {formatDateTime(signature.signedAt)}</div>
          <div className="inline-flex items-center gap-1 mt-1.5 text-[10.5px] font-semibold text-emerald-600">
            <Check size={11} />
            Verified e-signature
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/40 flex flex-col">
      <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
        {label}
      </div>
      <div className="flex-1 min-h-[80px] flex items-center justify-center text-[12px] text-slate-400 italic mb-3">
        Awaiting signature…
      </div>
      {canSign ? (
        <button
          type="button"
          onClick={onSignClick}
          className="text-xs font-semibold py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-700 print:hidden"
        >
          Sign as {role === "landlord" ? "Landlord" : "Tenant"}
        </button>
      ) : (
        <div className="text-[11px] text-slate-400 text-center italic print:hidden">
          Only the {role} can sign here.
        </div>
      )}
    </div>
  );
}

/**
 * Drawable signature canvas. Captures mouse + touch input, lets the
 * user clear and redraw, and emits a `data:image/png;base64,...` URL
 * via `onChange` that we store directly in the contract row.
 *
 * Fixed-resolution backing canvas (480×160 CSS, 2x device pixel ratio
 * for crisp lines on HiDPI screens). The canvas uses a transparent
 * background so the signed signature renders cleanly on top of either
 * the white signature card or the embedded PDF region.
 */
function SignaturePad({ value, onChange, accent }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [hasInk, setHasInk] = useState(!!value);

  // Initialize canvas once. We size from CSS bounds × DPR so strokes
  // stay sharp on retina/HiDPI screens; otherwise the lines look pixelated.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1A1A2E";
  }, []);

  const localXY = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const begin = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = localXY(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = localXY(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div>
      <div
        className="rounded-lg overflow-hidden border-2 bg-white"
        style={{ borderColor: hasInk ? accent : "#CBD5E1", borderStyle: hasInk ? "solid" : "dashed" }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair touch-none"
          style={{ height: 160 }}
          onMouseDown={begin}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={begin}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-slate-400">
          Sign with your mouse, trackpad, or finger
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold text-slate-600 px-3 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function SignModal({ role, defaultName, accent, onCancel, onConfirm }) {
  const [name, setName] = useState(defaultName ?? "");
  const [agreed, setAgreed] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  const canSubmit = !!name.trim() && agreed && !!signatureDataUrl;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Sign as
            </div>
            <h3 className="text-lg font-bold text-slate-900 capitalize">{role}</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Draw your signature below and type your full legal name. Your signature
          image is recorded onto the contract and timestamped.
        </p>

        <div className="mt-4">
          <label className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 block">
            Full Legal Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Juan Dela Cruz"
            autoFocus
            className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-vxr-accent focus:ring-2 focus:ring-orange-100 transition"
          />
        </div>

        <div className="mt-4">
          <label className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 block">
            Draw Signature
          </label>
          <SignaturePad
            value={signatureDataUrl}
            onChange={setSignatureDataUrl}
            accent={accent}
          />
        </div>

        <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-vxr-accent"
          />
          <span className="text-xs text-slate-600 leading-relaxed">
            I agree that this electronic signature is the legal equivalent of my
            handwritten signature and is binding under R.A. 8792 (Electronic
            Commerce Act).
          </span>
        </label>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="h-10 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onConfirm(name.trim(), signatureDataUrl)}
            disabled={!canSubmit}
            className="h-10 rounded-lg text-white font-semibold transition hover:opacity-90 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}
          >
            Sign now
          </button>
        </div>
      </div>
    </div>
  );
}

function NotFound({ onBack }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-slate-50">
      <AlertCircle size={32} className="text-slate-400 mb-3" />
      <h1 className="text-lg font-bold text-slate-700">Contract not found</h1>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        We couldn't find a contract for this applicant. They may not be approved yet.
      </p>
      <button
        onClick={onBack}
        className="mt-4 px-4 py-2 bg-vxr-accent text-white rounded-lg font-semibold text-sm hover:opacity-90 transition"
      >
        Back to Applications
      </button>
    </div>
  );
}

// ============================================================================
// Terms — driven by lib/contractTemplates with terms_override support
// ============================================================================

function TermsList({ terms }) {
  if (!terms?.length) return null;
  return (
    <ol className="mt-4 space-y-3.5">
      {terms.map((line, i) => (
        <li key={i} className="text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">
          {line}
        </li>
      ))}
    </ol>
  );
}

function UploadedContractViewer({ info }) {
  const isPdf = /\.pdf($|\?)/i.test(info.name) || /\.pdf($|\?)/i.test(info.url ?? "");
  return (
    <div className="mt-3 space-y-4">
      <div
        className="rounded-xl border flex items-start gap-3 p-3.5"
        style={{ background: "#FFF8F0", borderColor: "#FFE0C0" }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "#FFE9D2" }}
        >
          <FileText size={18} style={{ color: "#E07820" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#E07820" }}>
            Landlord-provided contract
          </p>
          <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{info.name}</p>
          <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
            This attached document is the binding contract. The default in-app
            template has been replaced by the file below.
          </p>
        </div>
        {info.url && (
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
            style={{ color: "#E07820", background: "#FFE9D2" }}
          >
            <Download size={13} /> Open
          </a>
        )}
      </div>

      {info.url && isPdf && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 print:hidden">
          <iframe
            src={info.url}
            title={info.name}
            className="w-full"
            style={{ height: "70vh", border: 0 }}
          />
        </div>
      )}

      {info.url && !isPdf && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center print:hidden">
          <FileText size={22} className="text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 mt-2">{info.name}</p>
          <p className="text-[12px] text-slate-500 mt-1">
            This file format can't be previewed in the browser.
          </p>
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg text-white"
            style={{ background: "#E07820" }}
          >
            <Download size={13} /> Download to view
          </a>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(isoOrYmd) {
  if (!isoOrYmd) return "—";
  const d = new Date(isoOrYmd);
  if (isNaN(d.getTime())) return isoOrYmd;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        body { background: white !important; }
        nav, .print\\:hidden { display: none !important; }
        #contract-doc {
          box-shadow: none !important;
          border: 0 !important;
          border-radius: 0 !important;
        }
      }
    `}</style>
  );
}

function Header({ onBack }) {
  return (
    <div className="print:hidden">
      <AppHeader showBack onBack={onBack} />
    </div>
  );
}
