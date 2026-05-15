import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Home, Lock, CreditCard, ShieldCheck,
  Check, AlertCircle, Loader2, FileText,
} from "lucide-react";
import AppHeader from "./components/AppHeader.jsx";
import { PaymentMethodIcon } from "./components/vxr";
import { useAuth } from "./context/AuthContext.jsx";
import {
  fetchContractById, getContractStatus, CONTRACT_TYPES,
  normalizeContract, updateContract,
} from "./lib/contractsService";
import {
  createPaymongoPaymentIntent, attachPaymentMethod, recordPaymongoPayment,
  recordMockPayment,
} from "./lib/paymentsService";
import {
  createCardPaymentMethod, createEwalletPaymentMethod,
  isPaymongoConfigured, METHOD_LABELS,
} from "./lib/paymongo";
import {
  listMyPaymentMethods, addPaymentMethod,
} from "./lib/paymentMethodsService";

const EWALLET_TYPES = ["gcash", "paymaya", "grab_pay"];

export default function ContractPayment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("form"); // 'form' | 'processing' | 'success'
  const [intent, setIntent] = useState(null);
  const [intentError, setIntentError] = useState(null);
  const [savedMethods, setSavedMethods] = useState([]);

  // ─── Load contract + self-heal zero amounts ─────────────────────────────
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

  // ─── Load saved methods for the picker ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    listMyPaymentMethods().then(({ data }) => setSavedMethods(data ?? []));
  }, [user?.id]);

  const status = getContractStatus(contract);
  const total = useMemo(() => {
    if (!contract) return 0;
    return Number(contract.monthlyRent) + Number(contract.securityDeposit) + Number(contract.advanceRent);
  }, [contract]);

  const isTenant = !!(user?.id && contract?.tenantId && user.id === contract.tenantId);
  const eligibleForCheckout =
    !!contract && isTenant && total > 0 && status !== "paid" && step !== "success";

  // ─── Ask the Edge Function for a PaymentIntent once we know who's paying ─
  useEffect(() => {
    if (!eligibleForCheckout) return;
    let cancelled = false;
    setIntentError(null);
    createPaymongoPaymentIntent(id).then((res) => {
      if (cancelled) return;
      if (res?.error) { setIntentError(res.error); return; }
      setIntent(res);
    });
    return () => { cancelled = true; };
  }, [id, eligibleForCheckout]);

  // ─── Redirect-back from PayMongo e-wallet / 3DS ──────────────────────────
  // PayMongo appends ?payment_intent_id=... to the return_url after the
  // user authorizes on the simulator (sandbox) or the real wallet
  // (production).
  useEffect(() => {
    const piParam = searchParams.get("payment_intent_id");
    if (!piParam || !contract) return;
    setStep("processing");
    recordPaymongoPayment(id, piParam).then((res) => {
      if (res?.error) { setIntentError(res.error); setStep("form"); return; }
      setContract((prev) => prev && {
        ...prev,
        payment: { transactionId: piParam, amount: total, paidAt: new Date().toISOString() },
      });
      setStep("success");
    });
  }, [searchParams, contract, id, total]);

  // ─── Guard rails ─────────────────────────────────────────────────────────
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

  if (!isPaymongoConfigured() && step !== "success") {
    return (
      <NotFound
        onBack={() => navigate(`/contract/${id}`)}
        title="Payments are not configured"
        message="VITE_PAYMONGO_PUBLIC_KEY isn't set in this build. Add your PayMongo publishable test key and redeploy."
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-vxr-bg flex flex-col">
      <AppHeader showBack onBack={() => navigate(`/contract/${id}`)} />

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

              {step === "form" && intent?.paymentIntentId && (
                <CheckoutForm
                  contractId={id}
                  paymentIntentId={intent.paymentIntentId}
                  total={total}
                  savedMethods={savedMethods}
                  onSavedMethodsChange={setSavedMethods}
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
              )}

              {step === "form" && intentError && intent && (
                <div className="mt-4">
                  <ErrorBlock message={intentError} />
                </div>
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

// ─── Checkout form with method picker ────────────────────────────────────────

function CheckoutForm({
  contractId, paymentIntentId, total, savedMethods, onSavedMethodsChange,
  returnUrl, onProcessing, onError, onSuccess,
}) {
  // Selected option in the picker.
  //   { kind: 'saved',  id: <payment_methods.id> }
  //   { kind: 'new',    type: 'card'|'gcash'|... }
  const initial = savedMethods.find((m) => m.is_default)
    ? { kind: "saved", id: savedMethods.find((m) => m.is_default).id }
    : savedMethods[0]
      ? { kind: "saved", id: savedMethods[0].id }
      : { kind: "new", type: "card" };
  const [picked, setPicked] = useState(initial);

  // Re-pick when the saved list changes (e.g. user saved one).
  useEffect(() => {
    setPicked((prev) => {
      if (prev.kind === "saved" && !savedMethods.find((m) => m.id === prev.id)) {
        const def = savedMethods.find((m) => m.is_default) ?? savedMethods[0];
        return def ? { kind: "saved", id: def.id } : { kind: "new", type: "card" };
      }
      return prev;
    });
  }, [savedMethods]);

  const [card, setCard] = useState({ number: "", expMonth: "", expYear: "", cvc: "" });
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  // Pre-fill billing name from the picked saved method whenever it
  // changes. User can still override the field.
  useEffect(() => {
    if (picked.kind !== "saved") return;
    const m = savedMethods.find((x) => x.id === picked.id);
    if (m?.billing_name) setBillingName(m.billing_name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, savedMethods]);
  const [saveNewEwallet, setSaveNewEwallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const pickedSaved = picked.kind === "saved"
    ? savedMethods.find((m) => m.id === picked.id)
    : null;
  const newType = picked.kind === "new" ? picked.type : null;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLocalError(null);

    // Mock methods bypass billing requirements and the entire PayMongo
    // flow — they're for demos / screenshots where you want one-click
    // payment with no external authorization.
    if (picked.kind === "saved" && pickedSaved?.is_mock) {
      setSubmitting(true);
      try {
        onProcessing?.();
        const res = await recordMockPayment({
          contractId,
          paymentMethodRecordId: pickedSaved.id,
        });
        if (res?.error) throw new Error(res.error);
        onSuccess?.(res?.paymentIntentId ?? `pi_mock_${pickedSaved.id}`);
      } catch (err) {
        const msg = err?.message ?? String(err);
        setLocalError(msg);
        onError?.(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!billingName.trim()) {
      setLocalError("Billing name is required.");
      return;
    }
    const billing = {
      name:  billingName.trim(),
      email: billingEmail.trim() || undefined,
      phone: billingPhone.trim() || undefined,
    };

    setSubmitting(true);

    try {
      let paymentMethodId;
      let paymentMethodRecordId = null;

      if (picked.kind === "saved") {
        if (!pickedSaved) throw new Error("Selected payment method is no longer available.");
        const pm = await createEwalletPaymentMethod({ type: pickedSaved.type, billing });
        paymentMethodId = pm.id;
        paymentMethodRecordId = pickedSaved.id;
      } else if (newType === "card") {
        if (!card.number || !card.expMonth || !card.expYear || !card.cvc) {
          throw new Error("Card details are required.");
        }
        const pm = await createCardPaymentMethod({ card, billing });
        paymentMethodId = pm.id;
      } else if (EWALLET_TYPES.includes(newType) || newType === "bank_transfer") {
        const pm = await createEwalletPaymentMethod({ type: newType, billing });
        paymentMethodId = pm.id;

        if (saveNewEwallet) {
          const label = METHOD_LABELS[newType]?.label ?? newType;
          const saved = await addPaymentMethod({
            type: newType,
            label,
            billing_name: billing.name,
          });
          if (!saved.error && saved.data?.method) {
            paymentMethodRecordId = saved.data.method.id;
            onSavedMethodsChange((prev) => [saved.data.method, ...prev]);
          }
        }
      } else {
        throw new Error("Pick a payment method to continue.");
      }

      const attachRes = await attachPaymentMethod({
        paymentIntentId,
        paymentMethodId,
        returnUrl,
        paymentMethodRecordId,
      });
      if (attachRes?.error) throw new Error(attachRes.error);

      const piStatus = attachRes.status;
      const redirectUrl = attachRes.next_action?.redirect?.url;

      if (piStatus === "succeeded") {
        onProcessing?.();
        const rec = await recordPaymongoPayment(contractId, paymentIntentId);
        if (rec?.error) throw new Error(`Payment confirmed but recording failed: ${rec.error}`);
        onSuccess?.(paymentIntentId);
        return;
      }

      if (redirectUrl) {
        // Redirect to PayMongo simulator / real wallet. The return URL
        // handler in the parent component will pick it back up via
        // ?payment_intent_id=.
        window.location.href = redirectUrl;
        return;
      }

      if (piStatus === "processing" || piStatus === "awaiting_next_action") {
        // No redirect URL was provided but PayMongo isn't done yet.
        // Surface a clear message — likely a sandbox quirk.
        throw new Error("Payment is processing. Refresh in a moment to see the result.");
      }

      throw new Error(`Unexpected payment status: ${piStatus}`);
    } catch (err) {
      const msg = err?.message ?? String(err);
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    billingName, billingEmail, billingPhone, picked, pickedSaved, newType,
    card, paymentIntentId, contractId, returnUrl, saveNewEwallet,
    onProcessing, onSuccess, onError, onSavedMethodsChange,
  ]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <MethodPicker
        savedMethods={savedMethods}
        picked={picked}
        onPick={setPicked}
      />

      {picked.kind === "saved" && pickedSaved && (
        <SavedMethodDetail method={pickedSaved} />
      )}

      {picked.kind === "new" && newType === "card" && (
        <CardForm card={card} setCard={setCard} />
      )}

      {picked.kind === "new" && EWALLET_TYPES.includes(newType) && (
        <EwalletNote type={newType} />
      )}

      {picked.kind === "new" && newType === "bank_transfer" && (
        <BankTransferNote />
      )}

      {!(picked.kind === "saved" && pickedSaved?.is_mock) && (
        <BillingFields
          name={billingName}    setName={setBillingName}
          email={billingEmail}  setEmail={setBillingEmail}
          phone={billingPhone}  setPhone={setBillingPhone}
        />
      )}

      {picked.kind === "new" && newType && newType !== "card" && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={saveNewEwallet}
            onChange={(e) => setSaveNewEwallet(e.target.checked)}
            className="w-4 h-4 accent-[#FF7043]"
          />
          Save this {METHOD_LABELS[newType]?.short ?? newType} as a payment method
        </label>
      )}

      {localError && <ErrorBlock message={localError} />}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-lg text-white font-semibold transition hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #FF7043, #FF8A80)" }}
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
        <span>Powered by <span className="font-semibold text-slate-500">PayMongo</span></span>
        <span>·</span>
        <span>Sandbox test mode</span>
      </div>
    </form>
  );
}

// ─── Pickers & forms ─────────────────────────────────────────────────────────

function MethodPicker({ savedMethods, picked, onPick }) {
  return (
    <div className="space-y-3">
      {savedMethods.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Saved methods
          </label>
          <div className="space-y-2">
            {savedMethods.map((m) => (
              <PickRow
                key={m.id}
                selected={picked.kind === "saved" && picked.id === m.id}
                onClick={() => onPick({ kind: "saved", id: m.id })}
              >
                <MethodIcon type={m.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {m.label || METHOD_LABELS[m.type]?.label || m.type}
                    {m.is_default && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                    {m.is_mock && (
                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        Mock
                      </span>
                    )}
                  </div>
                  {m.account_hint && (
                    <div className="text-xs text-slate-500 truncate">{m.account_hint}</div>
                  )}
                </div>
              </PickRow>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {savedMethods.length > 0 ? "Or pay with a new method" : "Choose a payment method"}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["card", "gcash", "paymaya", "grab_pay", "bank_transfer"].map((t) => (
            <PickRow
              key={t}
              compact
              selected={picked.kind === "new" && picked.type === t}
              onClick={() => onPick({ kind: "new", type: t })}
            >
              <MethodIcon type={t} />
              <span className="text-sm font-medium text-slate-700">
                {METHOD_LABELS[t]?.label ?? t}
              </span>
            </PickRow>
          ))}
        </div>
      </div>
    </div>
  );
}

function PickRow({ children, selected, onClick, compact }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 ${compact ? "px-3 py-2.5" : "px-4 py-3"} rounded-lg border text-left transition ${
        selected
          ? "border-[#FF7043] bg-[#FFF3E0]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function MethodIcon({ type }) {
  return <PaymentMethodIcon type={type} size="sm" className="flex-shrink-0" />;
}

function SavedMethodDetail({ method }) {
  if (method.is_mock) {
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
        <span className="font-semibold">Demo mode</span> — payment will complete instantly
        without contacting PayMongo. For testing and screenshots only.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      You'll be redirected to {METHOD_LABELS[method.type]?.label ?? method.type}
      {" "}to authorize this payment.
    </div>
  );
}

function CardForm({ card, setCard }) {
  const setField = (k) => (e) => setCard((prev) => ({ ...prev, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Card number</label>
        <input
          inputMode="numeric"
          placeholder="4343 4343 4343 4345"
          value={card.number}
          onChange={setField("number")}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF7043]/30"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Exp month</label>
          <input
            inputMode="numeric"
            placeholder="12"
            value={card.expMonth}
            onChange={setField("expMonth")}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Exp year</label>
          <input
            inputMode="numeric"
            placeholder="2030"
            value={card.expYear}
            onChange={setField("expYear")}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">CVC</label>
          <input
            inputMode="numeric"
            placeholder="123"
            value={card.cvc}
            onChange={setField("cvc")}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043]/30"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Test cards: <span className="font-mono">4343 4343 4343 4345</span> (success),
        {" "}<span className="font-mono">4571 7360 0000 0014</span> (decline).
      </p>
    </div>
  );
}

function EwalletNote({ type }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      You'll be redirected to the {METHOD_LABELS[type]?.label ?? type} authorize page.
      In sandbox, click <span className="font-semibold">"Authorize Test Payment"</span> to complete.
    </div>
  );
}

function BankTransferNote() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      After clicking Pay, PayMongo will route you to your online banking
      to authorize the transfer.
    </div>
  );
}

function BillingFields({ name, setName, email, setEmail, phone, setPhone }) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Billing details
      </label>
      <input
        placeholder="Full name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043]/30"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043]/30"
        />
        <input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7043]/30"
        />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
          style={{ background: `${meta?.accent ?? "#FF7043"}20`, color: meta?.accent ?? "#FF7043" }}>
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
          <span>Funds processed by PayMongo — your card and wallet details are never stored on our servers.</span>
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
        <Loader2 className="absolute inset-0 m-auto w-16 h-16 text-[#FF7043] animate-spin" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-slate-900 mt-5">Processing your payment</h3>
      <p className="text-sm text-slate-500 mt-1">Please don't close this window…</p>
      <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-400">
        <Lock size={11} /> Encrypted by PayMongo
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
          style={{ background: "linear-gradient(135deg, #FF7043, #FF8A80)" }}
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
        className="mt-4 px-4 py-2 bg-vxr-accent text-white rounded-lg font-semibold text-sm hover:opacity-90 transition"
      >
        Back
      </button>
    </div>
  );
}
