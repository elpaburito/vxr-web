import { describe, it, expect } from "vitest";
import { signInAs, fetchSeedIds } from "./setup.js";
import { fetchLandlordApplications, fetchTenantApplications } from "../src/lib/applicationsService.js";

describe("applicationsService", () => {
  it("tenantA sees their seeded approved application", async () => {
    const { user } = await signInAs("tenantA");
    const { data, error } = await fetchTenantApplications(user.id);
    expect(error).toBeFalsy();
    const ids = await fetchSeedIds();
    const seeded = data.find((a) => a.id === ids.applicationId);
    expect(seeded, "seed application should be visible to its tenant").toBeTruthy();
    expect(seeded.status).toBe("approved");
  });

  it("landlord sees the application against their listing", async () => {
    const { user } = await signInAs("landlord");
    const { data, error } = await fetchLandlordApplications(user.id);
    expect(error).toBeFalsy();
    const ids = await fetchSeedIds();
    const seeded = data.find((a) => a.id === ids.applicationId);
    expect(seeded).toBeTruthy();
    expect(seeded.tenant_id).toBeTruthy();
  });

  it("RLS hides tenantA's application from tenantB", async () => {
    const { user: tenantB } = await signInAs("tenantB");
    const { data } = await fetchTenantApplications(tenantB.id);
    const ids = await fetchSeedIds();
    expect(data.find((a) => a.id === ids.applicationId)).toBeFalsy();
  });
});
