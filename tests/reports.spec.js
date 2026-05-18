import { describe, it, expect } from "vitest";
import { signInAs, fetchSeedIds } from "./setup.js";
import { submitReport, fetchMyReports, fetchLandlordReportsForPage, updateReportStatus, respondToReport } from "../src/lib/reportsService.js";

let reportId;

describe("reportsService", () => {
  it("tenant submits a maintenance report against the seeded contract", async () => {
    const { user } = await signInAs("tenantA");
    const ids = await fetchSeedIds();
    const { data: contract } = await import("../src/lib/contractsService.js")
      .then((m) => m.fetchContractById(ids.contractId));

    const { data, error } = await submitReport({
      tenantId: user.id,
      contractId: ids.contractId,
      listingId: ids.listingId,
      landlordId: contract.landlord_id,
      title: "Vitest leak report",
      description: "Kitchen sink slow drain",
      category: "maintenance",
      priority: "medium",
    });
    expect(error).toBeFalsy();
    expect(data?.id).toBeTruthy();
    reportId = data.id;
  });

  it("tenant's fetchMyReports surfaces the new report", async () => {
    const { user } = await signInAs("tenantA");
    const ids = await fetchSeedIds();
    const { data, error } = await fetchMyReports(user.id, ids.contractId);
    expect(error).toBeFalsy();
    expect(data.some((r) => r.id === reportId)).toBe(true);
  });

  it("landlord sees the report against their listing and can respond", async () => {
    const { user } = await signInAs("landlord");
    const { data, error } = await fetchLandlordReportsForPage(user.id);
    expect(error).toBeFalsy();
    expect(data.some((r) => r.id === reportId)).toBe(true);

    const { error: rErr } = await respondToReport(reportId, "Scheduling a plumber");
    expect(rErr).toBeFalsy();
    const { error: sErr } = await updateReportStatus(reportId, "in_progress");
    expect(sErr).toBeFalsy();
  });
});
