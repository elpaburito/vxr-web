import { describe, it, expect } from "vitest";
import { signInAs } from "./setup.js";
import { fetchMyProfile, updateMyProfile, removeAvatar } from "../src/lib/profileService.js";
import { supabase } from "../src/lib/supabase.js";

describe("auth + profileService", () => {
  it("signInAs('tenantA') yields a session with the expected email", async () => {
    const { user, session } = await signInAs("tenantA");
    expect(session?.access_token).toBeTruthy();
    expect(user.email?.toLowerCase()).toBe(process.env.TEST_TENANT_A_EMAIL.toLowerCase());
  });

  it("fetchMyProfile returns the seeded profile row for tenantA", async () => {
    await signInAs("tenantA");
    const { user, profile } = await fetchMyProfile();
    expect(user.id).toBe(profile.id);
    expect(profile.full_name).toBe("Test Tenant A");
    expect(profile.is_verified).toBe(true);
  });

  it("updateMyProfile round-trips a phone-number change", async () => {
    await signInAs("tenantA");
    const next = `+6391700000${Math.floor(Math.random() * 90 + 10)}`;
    await updateMyProfile({ phone: next });
    const { profile } = await fetchMyProfile();
    expect(profile.phone).toBe(next);
  });

  it("removeAvatar clears profiles.avatar_url", async () => {
    await signInAs("tenantA");
    await updateMyProfile({ avatar_url: "https://placeholder.test/avatar.jpg" });
    await removeAvatar();
    const { profile } = await fetchMyProfile();
    expect(profile.avatar_url).toBeNull();
  });

  it("supabase.auth.signOut clears the session", async () => {
    await signInAs("tenantA");
    await supabase.auth.signOut();
    const { data: { session } } = await supabase.auth.getSession();
    expect(session).toBeNull();
  });
});
