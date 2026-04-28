import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, Lock, CreditCard, ShieldCheck,
  Check, AlertCircle, Loader2, FileText, Download,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  loadContract, saveContract, getContractStatus, CONTRACT_TYPES,
} from "./lib/contractStorage";

export default function ContractPayment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [contract, setContract] = useState(() => loadContract(id));
  const [step, setStep] = useState(() => {
    const c = loadContract(id);
    return c?.payment ? "success" : "form";
  });
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "", postal: "" });
  const [focused, setFocused] = useState(null);
  const [error, setError] = useState(null);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();
  const status = getContractStatus(contract);

  const total = useMemo(() => {
    if (!contract) return 0;
    return Number(contract.monthlyRent) + Number(contract.securityDeposit) + Number(contract.advanceRent);
  }, [contract]);

  useEffect(() => {
    if (contract) saveContract(id, contract);
  }, [contract, id]);

  if (!contract) {
    return (
      <NotFound onBack={() => navigate("/enlistment")} title="Contract not found" />
    );
  }

  if (status === "draft" || status === "pending_landlord" || status === "pending_tenant") {
    return (
      <NotFound
        onBack={() => navigate(`/contract/${id}`)}
        title="Contract not fully signed"
        message="Both parties must sign the contract before payment can be made."
      />
    );
  }

  const validate = () => {
    const digits = card.number.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return "Card number is invalid.";
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return "Expiry must be in MM/YY format.";
    const [mm, yy] = card.expiry.split("/").map((n) => parseInt(n, 10));
    if (mm < 1 || mm > 12) return "Expiry month is invalid.";
    const now = new Date();
    const expDate = new Date(2000 + yy, mm - 1, 1);
    if (expDate < new Date(now.getFullYear(), now.getMonth(), 1)) return "Card has expired.";
    if (!/^\d{3,4}$/.test(card.cvc)) return "CVC must be 3 or 4 digits.";
    if (!card.name.trim()) return "Cardholder name is required.";
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStep("processing");
    setTimeout(() => {
      const last4 = card.number.replace(/\D/g, "").slice(-4);
      const transactionId = "pi_" + Math.random().toString(36).slice(2, 14).toUpperCase();
      const updated = {
        ...contract,
        payment: {
          amount: total,
          method: detectBrand(card.number) ?? "card",
          paidAt: new Date().toISOString(),
          transactionId,
          last4,
          name: card.name,
        },
      };
      saveContract(id, updated);
      setContract(updated);
      setStep("success");
    }, 2200);
  };

  return (
    <div className="w-full min-h-screen bg-[#F7F8FA] flex flex-col">
      <Header
        navigate={navigate}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        initial={initial}
        isAuthenticated={isAuthenticated}
        onBack={() => navigate(`/contract/${id}`)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-8">
        {step === "success" ? (
          <SuccessView contract={contract} onBack={() => navigate(`/contract/${id}`)} onHome={() => navigate("/home2")} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Payment form */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pay your move-in</h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Secure payment for {contract.tenantName}
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Lock size={12} />
                  Secure checkout
                </div>
              </div>

              {step === "processing" ? (
                <ProcessingState />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Card preview */}
                  <CardPreview card={card} focused={focused} />

                  <div>
                    <Label>Cardholder name</Label>
                    <input
                      type="text"
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                      placeholder="Full name on card"
                      autoComplete="cc-name"
                      className={inputCls()}
                    />
                  </div>

                  <div>
                    <Label>Card number</Label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={card.number}
                        onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                        onFocus={() => setFocused("number")}
                        onBlur={() => setFocused(null)}
                        placeholder="1234 1234 1234 1234"
                        autoComplete="cc-number"
                        maxLength={23}
                        className={inputCls("pl-11 pr-14 font-mono tracking-wider")}
                      />
                      <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <BrandTag brand={detectBrand(card.number)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Expiry (MM/YY)</Label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        onFocus={() => setFocused("expiry")}
                        onBlur={() => setFocused(null)}
                        placeholder="MM/YY"
                        autoComplete="cc-exp"
                        maxLength={5}
                        className={inputCls("font-mono tracking-wider")}
                      />
                    </div>
                    <div>
                      <Label>CVC</Label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={card.cvc}
                        onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        onFocus={() => setFocused("cvc")}
                        onBlur={() => setFocused(null)}
                        placeholder="123"
                        autoComplete="cc-csc"
                        maxLength={4}
                        className={inputCls("font-mono tracking-wider")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Postal code (optional)</Label>
                    <input
                      type="text"
                      value={card.postal}
                      onChange={(e) => setCard({ ...card, postal: e.target.value })}
                      onFocus={() => setFocused("postal")}
                      onBlur={() => setFocused(null)}
                      placeholder="e.g., 1200"
                      autoComplete="postal-code"
                      className={inputCls()}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full h-12 rounded-lg text-white font-semibold transition hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #635BFF, #5046E5)" }}
                  >
                    <Lock size={14} />
                    Pay PHP {total.toLocaleString()}.00
                  </button>

                  <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck size={11} />
                      256-bit SSL
                    </span>
                    <span>·</span>
                    <span>Powered by <span className="font-semibold text-slate-500">stripe</span></span>
                    <span>·</span>
                    <span>PCI DSS</span>
                  </div>
                </form>
              )}
            </section>

            {/* Order summary */}
            <aside className="lg:sticky lg:top-24 self-start">
              <OrderSummary contract={contract} total={total} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================

function OrderSummary({ contract, total }) {
  const meta = CONTRACT_TYPES[contract.type];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Move-in Summary
        </div>
        <div className="text-base font-bold text-slate-900">
          {contract.propertyType} · {contract.propertyAddress}
        </div>
        <div className="text-xs text-slate-500 mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{ background: meta.accentSoft, color: meta.accent }}>
          <FileText size={11} />
          {meta.label}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 space-y-2.5">
        <Line label="First month rent" value={contract.monthlyRent} />
        <Line label="Security deposit" value={contract.securityDeposit} />
        <Line label="Advance rent" value={contract.advanceRent} />
      </div>

      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Total due now</div>
            <div className="text-[10px] text-slate-400">in PHP, taxes included</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₱{total.toLocaleString()}.00
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
        <div className="flex items-start gap-2">
          <Check size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <span>Both parties have signed the contract.</span>
        </div>
        <div className="flex items-start gap-2">
          <Check size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <span>Funds held in escrow until move-in is confirmed.</span>
        </div>
        <div className="flex items-start gap-2">
          <Check size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <span>Refundable security deposit per Philippine law.</span>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">₱{Number(value).toLocaleString()}.00</span>
    </div>
  );
}

// ============================================================================
// Card preview (Stripe-style)
// ============================================================================

function CardPreview({ card, focused }) {
  const brand = detectBrand(card.number);
  const isFlipped = focused === "cvc";
  const last4 = card.number.replace(/\D/g, "").slice(-4);
  return (
    <div className="relative w-full aspect-[1.586/1] max-w-[400px] mx-auto" style={{ perspective: 1000 }}>
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl p-5 shadow-xl text-white overflow-hidden"
          style={{
            background: brand === "amex"
              ? "linear-gradient(135deg, #1B4F8C, #0E2C5C)"
              : brand === "mastercard"
              ? "linear-gradient(135deg, #1A1A2E, #2D2D5E)"
              : "linear-gradient(135deg, #635BFF, #5046E5)",
            backfaceVisibility: "hidden",
          }}
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="flex justify-between items-start">
            <div className="text-[11px] tracking-wider opacity-70 font-semibold uppercase">
              ViewxRent
            </div>
            <BrandLogo brand={brand} />
          </div>

          <div className="mt-7 mb-5">
            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1.5">Card number</div>
            <div className="text-lg md:text-xl font-mono tracking-[2px]">
              {card.number || "•••• •••• •••• ••••"}
            </div>
          </div>

          <div className="flex items-end justify-between text-[11px]">
            <div>
              <div className="uppercase tracking-wider opacity-60 mb-0.5">Cardholder</div>
              <div className="font-semibold uppercase tracking-wide">
                {card.name || "FULL NAME"}
              </div>
            </div>
            <div className="text-right">
              <div className="uppercase tracking-wider opacity-60 mb-0.5">Expires</div>
              <div className="font-mono tracking-wider">{card.expiry || "MM/YY"}</div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl shadow-xl text-white overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1A1A2E, #3A3A5E)",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="h-10 bg-black/60 mt-5" />
          <div className="px-5 mt-5 flex items-center justify-end gap-3">
            <div className="bg-white/95 text-slate-900 font-mono tracking-wider px-3 py-1.5 rounded text-sm">
              {card.cvc || "•••"}
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">CVC</div>
          </div>
          <div className="px-5 mt-5 text-[10px] opacity-60 leading-relaxed">
            This card is the property of ViewxRent. Use of this card is subject to
            the cardholder's agreement.
          </div>
          {last4 && (
            <div className="absolute bottom-4 left-5 text-[11px] opacity-70">
              ending in <span className="font-mono">{last4}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandLogo({ brand }) {
  if (brand === "visa") {
    return (
      <div className="bg-white px-2.5 py-1 rounded text-[#1A1F71] font-bold italic text-sm tracking-tight">
        VISA
      </div>
    );
  }
  if (brand === "mastercard") {
    return (
      <div className="flex items-center -space-x-2">
        <div className="w-7 h-7 rounded-full bg-[#EB001B] opacity-95" />
        <div className="w-7 h-7 rounded-full bg-[#F79E1B] opacity-95" />
      </div>
    );
  }
  if (brand === "amex") {
    return (
      <div className="bg-white px-2 py-1 rounded text-[#016FD0] font-bold text-[10px] tracking-tight">
        AMERICAN<br />EXPRESS
      </div>
    );
  }
  return (
    <CreditCard size={20} className="text-white/70" />
  );
}

function BrandTag({ brand }) {
  if (!brand) return null;
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      <BrandLogo brand={brand} />
    </div>
  );
}

// ============================================================================

function ProcessingState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-slate-200" />
        <Loader2 className="absolute inset-0 m-auto w-16 h-16 text-[#635BFF] animate-spin" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-slate-900 mt-5">Processing your payment</h3>
      <p className="text-sm text-slate-500 mt-1">Please don't close this window…</p>
      <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-400">
        <Lock size={11} /> Encrypted by Stripe
      </div>
    </div>
  );
}

function SuccessView({ contract, onBack, onHome }) {
  const p = contract.payment;
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Check size={26} className="text-emerald-600" strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment successful</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome home, {contract.tenantName.split(" ")[0]}. Your contract is now active.
        </p>
      </div>

      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Receipt
          </span>
          <span className="text-[10.5px] text-slate-400 font-mono">
            {p.transactionId}
          </span>
        </div>

        <div className="space-y-2.5">
          <Line label="First month rent" value={contract.monthlyRent} />
          <Line label="Security deposit" value={contract.securityDeposit} />
          <Line label="Advance rent" value={contract.advanceRent} />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Paid in full</div>
            <div className="text-[10.5px] text-slate-400">
              {new Date(p.paidAt).toLocaleString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            ₱{Number(p.amount).toLocaleString()}.00
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CreditCard size={11} />
            {(p.method || "card").toUpperCase()} •••• {p.last4}
          </span>
          <span className="text-slate-400">Receipt ID: {p.transactionId}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onBack}
          className="h-11 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm inline-flex items-center justify-center gap-2"
        >
          <FileText size={14} />
          View Contract
        </button>
        <button
          onClick={onHome}
          className="h-11 rounded-lg text-white font-semibold transition hover:opacity-90 text-sm inline-flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
        >
          <Home size={14} />
          Back to Home
        </button>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        A copy of this receipt has been sent to your email.
      </p>
    </div>
  );
}

function NotFound({ onBack, title, message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-slate-50">
      <AlertCircle size={32} className="text-slate-400 mb-3" />
      <h1 className="text-lg font-bold text-slate-700">{title}</h1>
      {message && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{message}</p>
      )}
      <button
        onClick={onBack}
        className="mt-4 px-4 py-2 bg-[#EC6138] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition"
      >
        Back
      </button>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function Label({ children }) {
  return (
    <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5 block">
      {children}
    </label>
  );
}

function inputCls(extra = "") {
  return `w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 transition ${extra}`;
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  if (/^3[47]/.test(digits)) {
    // AmEx 4-6-5 grouping
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" ")
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

function detectBrand(number) {
  const d = number.replace(/\D/g, "");
  if (!d) return null;
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  return null;
}

// ============================================================================
// Header
// ============================================================================

function Header({ navigate, dropdownOpen, setDropdownOpen, initial, isAuthenticated, onBack }) {
  return (
    <nav
      className="sticky top-0 z-50"
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
                Payment
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
