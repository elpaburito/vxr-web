import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, Lock, CreditCard, ShieldCheck,
  Check, AlertCircle, Loader2, FileText,
} from "lucide-react";
import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  fetchContractById, getContractStatus, CONTRACT_TYPES,
  normalizeContract, updateContract,
} from "./lib/contractsService";
import {
  createStripePaymentIntent, recordStripePayment,
} from "./lib/paymentsService";
import { getStripePromise, isStripeConfigured } from "./lib/stripe";

// Stripe.js loader is module-scoped: loadStripe() must be called once
// per page load. getStripePromise memoizes it for us.
const stripePromise = getStripePromise();

export default function ContractPayment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user, profile, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("form"); // 'form' | 'processing' | 'success'
  const [intent, setIntent] = useState(null);   // { clientSecret, paymentIntentId, amount }
  const [intentError, setIntentError] = useState(null);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  // ─── Load contract + self-heal zero amounts ────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchContractById(id).then(({ data, error }) => {
      if (error || !data) { setLoading(false); return; }
      const c = normalizeContract(data);

      const fin = Array.isArray(data.listings?.listing_financials)
        ? data.listings.listing_financials[0]
        : data.listings?.listing_financials;
      const listingRent    = Number(fin?.monthly_rent     ?? 0);
      const listingDeposit = Number(fin?.security_deposit ?? 0);
      const listingAdvance = Number(fin?.advance_payment  ?? 0);
      if (listingRent > 0 && Number(c.monthlyRent) === 0) {
        c.monthlyRent     = listingRent;
        c.securityDeposit = listingDeposit > 0 ? listingDeposit : listingRent;
        c.advanceRent     = listingAdvance > 0 ? listingAdvance : listingRent;
        updateContract(id, {
          monthly_rent:     c.monthlyRent,
          security_deposit: c.securityDeposit,
          advance_rent:     c.advanceRent,
        }).catch(() => {});
      }

      setContract(c);
      if (c.payment) setStep("success");
      setLoading(false);
    });
  }, [id]);

  const status = getContractStatus(contract);
  const total = useMemo(() => {
    if (!contract) return 0;
    return Number(contract.monthlyRent) + Number(contract.securityDeposit) + Number(contract.advanceRent);
  }, [contract]);

  // ─── Ask the Edge Function for a PaymentIntent once we know who's paying ──
  const isTenant = !!(user?.id && contract?.tenantId && user.id === contract.tenantId);
  const eligibleForCheckout =
    !!contract && isTenant && total > 0 && status !== "paid" && step !== "success";

  useEffect(() => {
    if (!eligibleForCheckout) return;
    let cancelled = false;
    setIntentError(null);
    createStripePaymentIntent(id).then((res) => {
      if (cancelled) return;
      if (res?.error) { setIntentError(res.error); return; }
      setIntent(res);
    });
    return () => { cancelled = true; };
  }, [id, eligibleForCheckout]);

  // ─── Handle the redirect-back case (3DS / authorize-and-redirect) ─────────
  // Stripe appends ?payment_intent=…&payment_intent_client_secret=…&redirect_status=…
  useEffect(() => {
    const piParam = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");
    if (!piParam || !contract) return;
    if (redirectStatus === "succeeded") {
      setStep("processing");
      recordStripePayment(id, piParam).then((res) => {
        if (res?.error) { setIntentError(res.error); setStep("form"); return; }
        setContract((prev) => prev && {
          ...prev,
          payment: { transactionId: piParam, amount: total, paidAt: new Date().toISOString() },
        });
        setStep("success");
      });
    } else if (redirectStatus === "failed") {
      setIntentError("Payment was not completed. Please try again.");
    }
  }, [searchParams, contract, id, total]);

  // ─── Loading / guard rails ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F7F8FA] flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading contract…
      </div>
    );
  }

  if (!contract) {
    return <NotFound onBack={() => navigate("/enlistment")} title="Contract not found" />;
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

  if (user?.id && contract.tenantId && user.id !== contract.tenantId) {
    return (
      <NotFound
        onBack={() => navigate(`/contract/${id}`)}
        title="Payment is the tenant's responsibility"
        message="Only the tenant on this contract can complete the move-in payment. Ask them to sign in and pay."
      />
    );
  }

  if (step !== "success" && total <= 0) {
    return (
      <NotFound
        onBack={() => navigate(`/contract/${id}`)}
        title="Contract has no rent amount set"
        message="The contract is missing rent / deposit values. Ask the landlord to open the contract, edit the details, and save before you pay."
      />
    );
  }

  if (!isStripeConfigured() && step !== "success") {
    return (
      <NotFound
        onBack={() => navigate(`/contract/${id}`)}
        title="Payments are not configured"
        message="VITE_STRIPE_PUBLISHABLE_KEY isn't set in this build. Add your Stripe publishable test key and redeploy."
      />
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
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
          <SuccessView
            contract={contract}
            total={total}
            onBack={() => navigate(`/contract/${id}`)}
            onHome={() => navigate("/home2")}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
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

              {step === "processing" && <ProcessingState />}

              {step === "form" && intentError && !intent && (
                <ErrorBlock message={intentError} />
              )}

              {step === "form" && !intent && !intentError && (
                <div className="py-12 flex flex-col items-center text-slate-500">
                  <Loader2 className="animate-spin" size={28} />
                  <p className="text-sm mt-3">Preparing secure checkout…</p>
                </div>
              )}

              {step === "form" && intent?.clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: intent.clientSecret,
                    appearance: { theme: "stripe", variables: { colorPrimary: "#635BFF" } },
                  }}
                >
                  <CheckoutForm
                    contractId={id}
                    paymentIntentId={intent.paymentIntentId}
                    total={total}
                    returnUrl={`${window.location.origin}/contract/${id}/pay`}
                    onProcessing={() => setStep("processing")}
                    onError={(msg) => { setIntentError(msg); setStep("form"); }}
                    onSuccess={(piId) => {
                      setContract((prev) => prev && {
                        ...prev,
                        payment: {
                          transactionId: piId,
                          amount: total,
                          paidAt: new Date().toISOString(),
                        },
                      });
                      setStep("success");
                    }}
                  />
                </Elements>
              )}
            </section>

            <aside className="lg:sticky lg:top-24 self-start">
              <OrderSummary contract={contract} total={total} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Stripe Elements form ─────────────────────────────────────────────────────

function CheckoutForm({ contractId, paymentIntentId, total, returnUrl, onProcessing, onError, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setLocalError(null);
    // NOTE: do NOT flip the parent to "processing" here. That would
    // unmount <Elements> (and the PaymentElement inside it) on the next
    // render, and the elements.submit() / confirmPayment() calls below
    // would then throw "elements should have a mounted Payment Element".
    // The button's own spinner covers the in-flight UX; only flip the
    // parent step once Stripe is done and we're hitting our backend.

    // Validate Elements input first so we can render granular field
    // errors before kicking off the network call.
    const submitRes = await elements.submit();
    if (submitRes?.error) {
      const msg = submitRes.error.message ?? "Please check your card details.";
      setLocalError(msg);
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message ?? "Payment failed.";
      setLocalError(msg);
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    // Stripe is done — safe to unmount the form now and show the
    // processing UI while we record the payment server-side.
    onProcessing?.();
    const piId = paymentIntent?.id ?? paymentIntentId;
    const rec = await recordStripePayment(contractId, piId);
    if (rec?.error) {
      const msg = `Payment confirmed but recording failed: ${rec.error}`;
      setLocalError(msg);
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess?.(piId);
  }, [stripe, elements, contractId, paymentIntentId, returnUrl, onProcessing, onError, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />

      {localError && <ErrorBlock message={localError} />}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full h-12 rounded-lg text-white font-semibold transition hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #635BFF, #5046E5)" }}
      >
        {submitting
          ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
          : <><Lock size={14} /> Pay PHP {total.toLocaleString()}.00</>}
      </button>

      <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck size={11} />
          256-bit SSL
        </span>
        <span>·</span>
        <span>Powered by <span className="font-semibold text-slate-500">Stripe</span></span>
        <span>·</span>
        <span>PCI DSS</span>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBlock({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

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
          style={{ background: `${meta?.accent ?? "#635BFF"}20`, color: meta?.accent ?? "#635BFF" }}>
          <FileText size={11} />
          {meta?.label ?? "Contract"}
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
          <span>Funds processed by Stripe — your card is never stored on our servers.</span>
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

function SuccessView({ contract, total, onBack, onHome }) {
  const p = contract.payment;
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Check size={26} className="text-emerald-600" strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment successful</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome home, {contract.tenantName?.split(" ")[0] || "tenant"}. Your contract is now active.
        </p>
      </div>

      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Receipt
          </span>
          <span className="text-[10.5px] text-slate-400 font-mono">
            {p?.transactionId ?? "—"}
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
              {p?.paidAt
                ? new Date(p.paidAt).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })
                : "—"}
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            ₱{Number(p?.amount ?? total).toLocaleString()}.00
          </div>
        </div>

        {(p?.method || p?.last4) && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CreditCard size={11} />
              {(p.method || "card").toUpperCase()}
              {p.last4 ? ` •••• ${p.last4}` : ""}
            </span>
            <span className="text-slate-400">Receipt ID: {p.transactionId}</span>
          </div>
        )}
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
      {message && <p className="text-sm text-slate-500 mt-1 max-w-sm">{message}</p>}
      <button
        onClick={onBack}
        className="mt-4 px-4 py-2 bg-[#EC6138] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition"
      >
        Back
      </button>
    </div>
  );
}

// ─── Header (unchanged from previous version) ────────────────────────────────

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
