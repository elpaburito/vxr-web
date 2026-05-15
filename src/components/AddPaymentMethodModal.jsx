import { useState, useEffect } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import {
  Modal, Button, Input, PaymentMethodIcon,
} from "./vxr";
import { addPaymentMethod } from "../lib/paymentMethodsService.js";
import { METHOD_LABELS } from "../lib/paymongo.js";

const METHOD_OPTIONS = [
  { value: "gcash",         tagline: "Mobile wallet"  },
  { value: "paymaya",       tagline: "Mobile wallet"  },
  { value: "grab_pay",      tagline: "Mobile wallet"  },
  { value: "bank_transfer", tagline: "Bank account"   },
];

export default function AddPaymentMethodModal({ open, onClose, onAdded }) {
  const mockEnabled = import.meta.env.VITE_MOCK_PAYMENTS_ENABLED === "true";

  const [type, setType]               = useState("gcash");
  const [label, setLabel]             = useState("");
  const [hint, setHint]               = useState("");
  const [billingName, setBillingName] = useState("");
  const [setDefault, setSetDefault]   = useState(false);
  const [isMock, setIsMock]           = useState(false);
  const [busy, setBusy]               = useState(false);
  const [err, setErr]                 = useState(null);

  useEffect(() => {
    if (open) {
      setType("gcash");
      setLabel("");
      setHint("");
      setBillingName("");
      setSetDefault(false);
      setIsMock(false);
      setErr(null);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);

    // Bank rows need at least one identifying detail or the saved card
    // is meaningless ("Bank Transfer" without account context).
    if (type === "bank_transfer" && !label.trim() && !hint.trim()) {
      setErr("Add a label or account hint so you can tell this method apart later.");
      return;
    }

    setBusy(true);
    const res = await addPaymentMethod({
      type,
      label: label.trim() || undefined,
      account_hint: hint.trim() || undefined,
      billing_name: billingName.trim() || undefined,
      set_default: setDefault,
      is_mock: mockEnabled && isMock,
    });
    setBusy(false);
    if (res?.error) {
      setErr(typeof res.error === "string" ? res.error : (res.error.message || "Could not save"));
      return;
    }
    onAdded?.();
  };

  const previewLabel = label.trim() || METHOD_LABELS[type]?.label || type;
  const previewHint  = hint.trim() ||
    (type === "bank_transfer" ? "Bank account" : "Mobile wallet");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add payment method"
      subtitle="Save a wallet or bank for one-tap checkout."
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="add-pm-form" disabled={busy}>
            {busy ? "Saving…" : "Save method"}
          </Button>
        </>
      }
    >
      <form id="add-pm-form" onSubmit={submit} className="space-y-5">
        {/* Method picker — branded tiles */}
        <div>
          <label className="block font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub mb-2.5">
            Choose a method
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {METHOD_OPTIONS.map((opt) => {
              const isActive = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-vxr-md border-[1.5px] text-left transition-all duration-150 ease-vxr-out ${
                    isActive
                      ? "border-vxr-accent bg-vxr-accent-soft shadow-vxr-sm"
                      : "border-vxr-border bg-white hover:border-vxr-text-sub"
                  }`}
                >
                  <PaymentMethodIcon type={opt.value} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className={`font-display text-sm font-bold truncate ${isActive ? "text-vxr-accent" : "text-vxr-text"}`}>
                      {METHOD_LABELS[opt.value]?.label ?? opt.value}
                    </p>
                    <p className="font-body text-[11px] text-vxr-text-sub truncate">
                      {opt.tagline}
                    </p>
                  </div>
                  {isActive && (
                    <CheckCircle2 size={16} className="text-vxr-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Details group */}
        <div className="space-y-3">
          <Input
            label="Label (optional)"
            placeholder={type === "bank_transfer" ? "BPI Savings" : "Personal GCash"}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            label={type === "bank_transfer" ? "Account hint (masked)" : "Mobile number hint"}
            placeholder={type === "bank_transfer" ? "•••• 3421" : "•••• 4567"}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            hint="For display only — full details are entered at checkout."
          />
          <Input
            label="Billing name (optional)"
            placeholder="Your full name"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
          />
        </div>

        {/* Live preview */}
        <div>
          <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub mb-2">
            Preview
          </p>
          <div className="flex items-center gap-3 px-3 py-3 rounded-vxr-md border border-vxr-border bg-vxr-surface2">
            <PaymentMethodIcon type={type} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-sm font-bold text-vxr-text truncate">
                  {previewLabel}
                </span>
                {setDefault && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-vxr-success bg-vxr-success-soft px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-vxr-text-sub truncate">
                {previewHint}
              </p>
            </div>
          </div>
        </div>

        {/* Default toggle */}
        <label className="flex items-center gap-3 px-3 py-2.5 rounded-vxr-md border border-vxr-border cursor-pointer hover:bg-vxr-surface2 transition-colors">
          <input
            type="checkbox"
            checked={setDefault}
            onChange={(e) => setSetDefault(e.target.checked)}
            className="w-4 h-4 accent-vxr-accent"
          />
          <div className="flex-1">
            <p className="font-body text-sm font-semibold text-vxr-text">
              Set as default
            </p>
            <p className="font-body text-[11px] text-vxr-text-sub">
              We'll pre-select this method at checkout.
            </p>
          </div>
        </label>

        {/* Mock-mode block (dev only) */}
        {mockEnabled && (
          <div className="rounded-vxr-md border border-purple-200 bg-purple-50/60 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isMock}
                onChange={(e) => setIsMock(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-purple-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-purple-600" />
                  <span className="font-body text-sm font-semibold text-purple-900">
                    Mock mode (demo only)
                  </span>
                </div>
                <p className="font-body text-[11px] text-purple-700 mt-0.5">
                  Skips real PayMongo — payments complete instantly. Useful for screenshots, never for real transactions.
                </p>
              </div>
            </label>
          </div>
        )}

        {err && (
          <div className="rounded-vxr-md border border-vxr-danger/30 bg-vxr-danger-soft text-vxr-danger text-xs px-3 py-2">
            {err}
          </div>
        )}
      </form>
    </Modal>
  );
}
