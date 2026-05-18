import { describe, it, expect } from "vitest";
import { signInAs, fetchSeedIds } from "./setup.js";
import { fetchContractById, fetchMyContracts, normalizeContract, getContractStatus } from "../src/lib/contractsService.js";

describe("contractsService", () => {
  it("fetchContractById returns the seeded fully_signed contract", async () => {
    await signInAs("tenantA");
    const ids = await fetchSeedIds();
    const { data, error } = await fetchContractById(ids.contractId);
    expect(error).toBeFalsy();
    expect(data?.id).toBe(ids.contractId);
    // status may be 'fully_signed' or 'paid' depending on test order with payments.spec.
    expect(["fully_signed", "paid"]).toContain(data?.status);
  });

  it("normalizeContract maps mobile snake_case to UI camelCase", async () => {
    await signInAs("tenantA");
    const ids = await fetchSeedIds();
    const { data } = await fetchContractById(ids.contractId);
    const normalized = normalizeContract(data);
    expect(normalized.id).toBe(ids.contractId);
    expect(normalized.tenantName).toBeDefined();
    expect(typeof normalized.monthlyRent).toBe("number");
  });

  it("getContractStatus derives a UI label from the normalized object", async () => {
    await signInAs("tenantA");
    const ids = await fetchSeedIds();
    const { data } = await fetchContractById(ids.contractId);
    const status = getContractStatus(normalizeContract(data));
    expect(["paid", "both_signed", "pending_landlord", "pending_tenant"]).toContain(status);
  });

  it("fetchMyContracts returns the contract for both parties", async () => {
    const { user: tenant } = await signInAs("tenantA");
    const { data: tenantList } = await fetchMyContracts(tenant.id);
    const ids = await fetchSeedIds();
    expect(tenantList.some((c) => c.id === ids.contractId)).toBe(true);

    const { user: landlord } = await signInAs("landlord");
    const { data: landlordList } = await fetchMyContracts(landlord.id);
    expect(landlordList.some((c) => c.id === ids.contractId)).toBe(true);
  });
});
