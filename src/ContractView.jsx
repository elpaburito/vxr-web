import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, Download, Check, CreditCard,
  FileText, AlertCircle, Edit3, Shield, Building2, Calendar,
  X,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  loadContract, saveContract, buildDefaultContract,
  getContractStatus, CONTRACT_TYPES,
} from "./lib/contractStorage";

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
  const { user, profile, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [contract, setContract] = useState(() => {
    return loadContract(id) || buildDefaultContract(id);
  });
  const [editing, setEditing] = useState(false);
  const [signModal, setSignModal] = useState(null); // 'landlord' | 'tenant' | null

  useEffect(() => {
    if (contract) saveContract(id, contract);
  }, [contract, id]);

  if (!contract) {
    return (
      <NotFound onBack={() => navigate("/enlistment")} />
    );
  }

  const status = getContractStatus(contract);
  const meta = CONTRACT_TYPES[contract.type];
  const isLocked = !!(contract.landlordSignature || contract.tenantSignature);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  const handleField = (key, value) => {
    setContract((prev) => ({ ...prev, [key]: value }));
  };

  const handleType = (type) => {
    if (isLocked) return;
    setContract((prev) => ({ ...prev, type }));
  };

  const handleSign = (role, name) => {
    const signedAt = new Date().toISOString();
    setContract((prev) => ({
      ...prev,
      [role === "landlord" ? "landlordSignature" : "tenantSignature"]: { name, signedAt },
    }));
    setSignModal(null);
  };

  const handleExport = () => {
    window.print();
  };

  const handleProceedPayment = () => {
    navigate(`/contract/${id}/pay`);
  };

  const handleResetSignatures = () => {
    if (!window.confirm("Clear both signatures? You'll need to sign again."))
      return;
    setContract((prev) => ({
      ...prev,
      landlordSignature: null,
      tenantSignature: null,
      payment: null,
    }));
  };

  const inputCls = (extra = "") =>
    `w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-[13px] text-slate-900 outline-none focus:border-[#EC6138] focus:ring-2 focus:ring-orange-100 transition disabled:bg-slate-50 disabled:text-slate-500 ${extra}`;

  return (
    <div className="w-full min-h-screen bg-[#F4F4F6] flex flex-col print:bg-white">
      <Header
        navigate={navigate}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        initial={initial}
        isAuthenticated={isAuthenticated}
        onBack={() => navigate(-1)}
      />

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

          {/* Type tabs */}
          <div className="ml-auto inline-flex bg-slate-100 rounded-full p-1">
            {Object.entries(CONTRACT_TYPES).map(([key, t]) => {
              const active = contract.type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleType(key)}
                  disabled={isLocked}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    active ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t.short}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contract document */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-6 print:py-0 print:px-0 print:max-w-none">
        <article
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none"
          id="contract-doc"
        >
          {/* Title block */}
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

          {/* Parties & Property */}
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

          {/* Terms */}
          <div className="px-8 py-6 border-t border-slate-100">
            <SectionHead accent={meta.accent}>Terms and Conditions</SectionHead>
            {contract.type === "fixed_term" ? (
              <FixedTermTerms contract={contract} />
            ) : (
              <MonthToMonthTerms contract={contract} />
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
                onSignClick={() => setSignModal("landlord")}
              />
              <SignatureBlock
                role="tenant"
                label="Tenant's Signature"
                signature={contract.tenantSignature}
                onSignClick={() => setSignModal("tenant")}
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
              onClick={() => setEditing((e) => !e)}
              disabled={isLocked}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit3 size={14} />
              {editing ? "Done editing" : "Edit details"}
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
              <button
                type="button"
                onClick={handleProceedPayment}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
              >
                <CreditCard size={14} />
                Proceed to Payment
              </button>
            ) : (
              <>
                {!contract.landlordSignature && (
                  <button
                    type="button"
                    onClick={() => setSignModal("landlord")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition"
                    style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
                  >
                    Sign as Landlord
                  </button>
                )}
                {!contract.tenantSignature && (
                  <button
                    type="button"
                    onClick={() => setSignModal("tenant")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition"
                    style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
                  >
                    Sign as Tenant
                  </button>
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
          onConfirm={(name) => handleSign(signModal, name)}
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

function SignatureBlock({ role, label, signature, onSignClick }) {
  if (signature) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
        <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
          {label}
        </div>
        <div
          className="text-[28px] leading-none italic mb-3 text-slate-800"
          style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" }}
        >
          {signature.name}
        </div>
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
      <button
        type="button"
        onClick={onSignClick}
        className="text-xs font-semibold py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-700 print:hidden"
      >
        Sign as {role === "landlord" ? "Landlord" : "Tenant"}
      </button>
    </div>
  );
}

function SignModal({ role, defaultName, accent, onCancel, onConfirm }) {
  const [name, setName] = useState(defaultName ?? "");
  const [agreed, setAgreed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
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
          Type your full legal name below to e-sign this contract. Your signature
          will be timestamped and recorded.
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
            className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#EC6138] focus:ring-2 focus:ring-orange-100 transition"
          />
        </div>

        {name.trim() && (
          <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
              Signature preview
            </div>
            <div
              className="text-[32px] leading-none italic text-slate-800"
              style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" }}
            >
              {name}
            </div>
          </div>
        )}

        <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-[#EC6138]"
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
            onClick={() => onConfirm(name.trim())}
            disabled={!name.trim() || !agreed}
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
        className="mt-4 px-4 py-2 bg-[#EC6138] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition"
      >
        Back to Applications
      </button>
    </div>
  );
}

// ============================================================================
// Terms (compact rendering of the full PDF text — read-only legal copy)
// ============================================================================

function FixedTermTerms({ contract }) {
  const items = [
    ["Fixed-Term Lease", `This Lease Agreement is binding for the duration stated above. Neither party may terminate this agreement before the end date without mutual written consent or valid legal grounds. Early termination by the Tenant shall result in forfeiture of the security deposit unless otherwise agreed in writing.`],
    ["Rent Payment", `The Tenant agrees to pay the monthly rent of PHP ${Number(contract.monthlyRent).toLocaleString()} on or before the due date each month. Payments shall be made via ${contract.paymentMethod} to ${contract.accountInfo}. A late payment fee of PHP ${contract.lateFee} per day shall be charged for payments made after the grace period.`],
    ["Security Deposit", `The Tenant has paid a security deposit of PHP ${Number(contract.securityDeposit).toLocaleString()}. The deposit shall be returned within 30 days after the lease ends, less any deductions for unpaid rent, damages beyond normal wear and tear, or outstanding utility bills.`],
    ["Rent Increase", `The monthly rent is fixed for the entire lease term and shall not be increased by the Landlord during this period. Any rent adjustment shall only take effect upon renewal of this agreement, subject to prior written notice of at least 60 days before the lease expiry.`],
    ["Use of Premises", `The leased premises shall be used exclusively as a private residential dwelling. The Tenant shall not use the property for any commercial, illegal, or immoral activities. Subletting or assignment of this lease requires the prior written consent of the Landlord.`],
    ["Utilities & Services", `The Tenant shall be responsible for the payment of utilities (Electricity, Water, Internet, Cable). The Tenant must settle all utility accounts before vacating the premises.`],
    ["Maintenance & Repairs", `The Tenant agrees to keep the premises clean and in good condition. Minor repairs costing below PHP ${contract.minorRepairsThreshold} shall be the Tenant's responsibility. Major structural repairs shall be borne by the Landlord, provided the Tenant gives prompt written notice.`],
    ["House Rules", `(a) No pets unless explicitly permitted in writing; (b) No excessive noise between ${contract.quietHours}; (c) Overnight guests staying more than ${contract.overnightGuestThreshold} consecutive days must be declared; (d) Proper waste disposal must be observed; (e) Common areas must be kept clean and unobstructed.`],
    ["Lease Renewal", `At least 60 days before the lease expiry, either party must notify the other of their intention to renew or terminate. If no notice is given, the lease shall convert to a month-to-month rental agreement under the same terms.`],
    ["Termination & Eviction", `The Landlord may terminate this lease and require the Tenant to vacate under: (a) Non-payment of rent for two or more consecutive months; (b) Serious breach of any provision; (c) Use of the property for illegal activities. Eviction proceedings shall follow Philippine law including R.A. 9653.`],
    ["Governing Law", `This Agreement shall be governed by the laws of the Republic of the Philippines. Disputes shall first be resolved through amicable settlement; otherwise submitted to the courts of ${contract.governingCity}, Philippines.`],
    ["Entire Agreement", `This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions. Any amendment must be in writing and signed by both parties.`],
  ];
  return <TermsList items={items} />;
}

function MonthToMonthTerms({ contract }) {
  const items = [
    ["Month-to-Month Tenancy", `This Rental Agreement creates a month-to-month tenancy commencing on the start date above. The agreement shall automatically renew each month unless terminated by either party with the required written notice. There is no fixed end date; the tenancy continues indefinitely until properly terminated.`],
    ["Termination Notice", `Either party may terminate this Agreement by providing at least 30 days written notice. Notice must be delivered in person, by registered mail, or via the platform's official messaging system. The tenancy ends on the last day of the notice period.`],
    ["Rent Payment", `The Tenant agrees to pay the monthly rent of PHP ${Number(contract.monthlyRent).toLocaleString()} on or before the due date each month. Payments shall be made via ${contract.paymentMethod} to ${contract.accountInfo}. A late payment fee of PHP ${contract.lateFee} per day shall be charged after the grace period.`],
    ["Rent Adjustment", `The Landlord reserves the right to adjust the monthly rent by providing the Tenant with at least 30 days prior written notice. The Tenant may accept the new rent or terminate the agreement in accordance with the termination notice clause. No adjustment shall violate R.A. 9653.`],
    ["Security Deposit", `The Tenant has paid a security deposit of PHP ${Number(contract.securityDeposit).toLocaleString()}. The deposit shall be returned within 30 days after the Tenant fully vacates the premises, less lawful deductions. The deposit shall not be applied as payment for the last month's rent without written consent.`],
    ["Use of Premises", `The premises shall be used exclusively as a private residential dwelling. Commercial use, subletting, and assignment are prohibited without the Landlord's prior written consent.`],
    ["Utilities & Services", `The Tenant shall be responsible for utilities (Electricity, Water, Internet, Cable). All utility accounts must be settled in full before the Tenant vacates the premises.`],
    ["Maintenance & Repairs", `The Tenant shall maintain the premises in a clean and habitable condition. Minor repairs below PHP ${contract.minorRepairsThreshold} are the Tenant's responsibility. No structural alterations may be made without written approval.`],
    ["House Rules", `(a) Refrain from creating excessive noise between ${contract.quietHours}; (b) Properly dispose of garbage; (c) Declare guests staying beyond ${contract.overnightGuestThreshold} consecutive days; (d) Not keep pets unless specifically permitted in writing; (e) Maintain shared areas in clean condition.`],
    ["Landlord Access", `The Landlord may enter the premises for inspection, repairs, or showing to prospective tenants with at least 24 hours prior notice, except in cases of emergency.`],
    ["Non-Payment & Breach", `Failure to pay rent for two consecutive months, or serious breach of any provision, shall entitle the Landlord to terminate this Agreement and initiate eviction proceedings under Philippine law.`],
    ["Governing Law", `This Agreement shall be governed by the laws of the Republic of the Philippines, including R.A. 9653. Disputes shall first be resolved through amicable settlement; otherwise submitted to courts of ${contract.governingCity}, Philippines.`],
    ["Entire Agreement", `This Agreement represents the full understanding between the parties. Any amendment must be made in writing and signed by both parties.`],
  ];
  return <TermsList items={items} />;
}

function TermsList({ items }) {
  return (
    <ol className="mt-4 space-y-3.5">
      {items.map(([head, body], i) => (
        <li key={head}>
          <div className="text-[12px] font-bold text-slate-900 uppercase tracking-wide">
            {i + 1}. {head}
          </div>
          <p className="text-[12.5px] text-slate-600 leading-relaxed mt-1">
            {body}
          </p>
        </li>
      ))}
    </ol>
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

// ============================================================================
// Header
// ============================================================================

function Header({ navigate, dropdownOpen, setDropdownOpen, initial, isAuthenticated, onBack }) {
  return (
    <nav
      className="sticky top-0 z-50 print:hidden"
      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
      onClick={() => setDropdownOpen(false)}
    >
      <div
        style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.22)",
              border: "none", cursor: "pointer",
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} color="white" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-[15px] tracking-wide leading-none">
                Contract
              </span>
              <span className="text-[10px] text-white/70 mt-0.5 font-medium">ViewxRent</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <button onClick={() => navigate("/home2")} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 4,
          }}>
            <Home size={22} color="white" />
          </button>
          <button style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 4, position: "relative",
          }}>
            <Bell size={22} color="white" />
          </button>
          {isAuthenticated && (
            <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "white", border: "none", cursor: "pointer",
              borderRadius: 999, padding: "5px 14px 5px 6px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #EC6138, #FF8E9E)",
                color: "white", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>
                {initial}
              </div>
              <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #222" }} />
            </button>
          )}
          {dropdownOpen && <ProfileDropdown />}
        </div>
      </div>
    </nav>
  );
}
