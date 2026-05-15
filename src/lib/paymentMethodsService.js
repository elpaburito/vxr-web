import { supabase } from "./supabase";

/**
 * Saved payment methods (e-wallets and bank transfer only — cards are
 * not vaulted). Read is direct from Postgres because RLS already
 * filters to the current user. Writes go through Edge Functions to
 * enforce the "single default per user" invariant atomically.
 */

export async function listMyPaymentMethods() {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, type, label, account_hint, billing_name, is_default, is_mock, created_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

async function invokeOrError(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const ctx = error?.context;
    let msg = error.message ?? String(error);
    if (ctx && typeof ctx.json === "function") {
      try {
        const ej = await ctx.json();
        if (ej?.error) msg = ej.error;
      } catch { /* ignore */ }
    }
    return { error: msg };
  }
  if (data?.error) return { error: data.error };
  return { data };
}

export async function addPaymentMethod({ type, label, account_hint, billing_name, set_default, is_mock }) {
  return invokeOrError("paymongo-add-method", {
    type, label, account_hint, billing_name, set_default, is_mock,
  });
}

export async function deletePaymentMethod(method_id) {
  return invokeOrError("paymongo-delete-method", { method_id });
}

export async function setDefaultPaymentMethod(method_id) {
  return invokeOrError("paymongo-set-default-method", { method_id });
}
