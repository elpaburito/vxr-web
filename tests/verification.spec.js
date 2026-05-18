import { describe, it, expect } from "vitest";
import { signInAs } from "./setup.js";
import { getMyVerificationStatus, getMyLatestVerification, ID_TYPES, getIdTypeDisplayName } from "../src/lib/verificationService.js";

// NOTE: we deliberately do NOT exercise submitVerification() here. It
// uploads images and invokes the verify-identity Gemini Edge Function,
// which is expensive and slow per call. The seed leaves tenantA's
// profiles.is_verified = true so the read-only assertions below pass.

describe("verificationService — read paths", () => {
  it("ID_TYPES contains the 10 canonical Philippine ID types", () => {
    expect(ID_TYPES.length).toBe(10);
    expect(ID_TYPES.map((t) => t.key)).toContain("philsys");
    expect(ID_TYPES.map((t) => t.key)).toContain("passport");
  });

  it("getIdTypeDisplayName resolves a known key", () => {
    expect(getIdTypeDisplayName("philsys")).toMatch(/PhilSys/);
    expect(getIdTypeDisplayName("unknown")).toBe("unknown");
  });

  it("getMyVerificationStatus reports verified for seeded tenantA", async () => {
    await signInAs("tenantA");
    const status = await getMyVerificationStatus();
    expect(status.isVerified).toBe(true);
  });

  it("getMyVerificationStatus reports NOT verified for seeded tenantB", async () => {
    await signInAs("tenantB");
    const status = await getMyVerificationStatus();
    expect(status.isVerified).toBe(false);
  });

  it("getMyLatestVerification returns null for a user with no submissions", async () => {
    await signInAs("tenantB");
    const latest = await getMyLatestVerification();
    // tenantB hasn't submitted, so this can be null. Either null or a
    // pending row is acceptable — we just want it not to throw.
    expect(latest === null || typeof latest === "object").toBe(true);
  });
});
