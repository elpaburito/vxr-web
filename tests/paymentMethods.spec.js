import { describe, it, expect, afterAll } from "vitest";
import { signInAs } from "./setup.js";
import { addPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod, listMyPaymentMethods } from "../src/lib/paymentMethodsService.js";

const created = [];

describe("paymentMethodsService — saved e-wallets (mock mode)", () => {
  it("addPaymentMethod returns the new method id and lists it", async () => {
    await signInAs("tenantA");
    const { data, error } = await addPaymentMethod({
      type: "gcash",
      label: "Vitest GCash",
      account_hint: "0917-test",
      billing_name: "Test Tenant A",
      set_default: true,
      is_mock: true,
    });
    expect(error).toBeFalsy();
    const id = data?.method?.id ?? data?.id;
    expect(id).toBeTruthy();
    created.push(id);

    const { data: list } = await listMyPaymentMethods();
    expect(list.some((m) => m.id === id)).toBe(true);
  });

  it("setDefaultPaymentMethod swaps the default flag atomically", async () => {
    const { data: second, error } = await addPaymentMethod({
      type: "paymaya",
      label: "Vitest Maya",
      account_hint: "0918-test",
      billing_name: "Test Tenant A",
      set_default: false,
      is_mock: true,
    });
    expect(error).toBeFalsy();
    const secondId = second?.method?.id ?? second?.id;
    expect(secondId).toBeTruthy();
    created.push(secondId);

    const { error: setErr } = await setDefaultPaymentMethod(secondId);
    expect(setErr).toBeFalsy();

    const { data: list } = await listMyPaymentMethods();
    const defaults = list.filter((m) => m.is_default);
    expect(defaults.length).toBe(1);
    expect(defaults[0].id).toBe(secondId);
  });

  it("RLS hides tenantA's methods from tenantB", async () => {
    await signInAs("tenantB");
    const { data: list } = await listMyPaymentMethods();
    expect(list.every((m) => !created.includes(m.id))).toBe(true);
  });

  afterAll(async () => {
    await signInAs("tenantA");
    for (const id of created) await deletePaymentMethod(id);
  });
});
