import { describe, it, expect } from "vitest";
import { signInAs, fetchSeedIds } from "./setup.js";
import { createListing, updateListing, deleteListing, fetchListingById } from "../src/lib/listingsService.js";

describe("listingsService", () => {
  it("landlord can create + update + delete a listing they own", async () => {
    const { user } = await signInAs("landlord");
    const { data: created, error: cErr } = await createListing({
      title: "Vitest scratch listing",
      description: "ephemeral",
      propertyType: "apartment",
      listingType: "lease",
      status: "active",
      ownerId: user.id,
    });
    expect(cErr).toBeFalsy();
    expect(created?.id).toBeTruthy();

    const { error: uErr } = await updateListing(created.id, { title: "Vitest scratch listing (renamed)" });
    expect(uErr).toBeFalsy();

    const { data: fetched } = await fetchListingById(created.id);
    expect(fetched?.title).toBe("Vitest scratch listing (renamed)");

    const { error: dErr } = await deleteListing(created.id);
    expect(dErr).toBeFalsy();
  });

  it("tenantA can read the seeded listing", async () => {
    await signInAs("tenantA");
    const ids = await fetchSeedIds();
    const { data, error } = await fetchListingById(ids.listingId);
    expect(error).toBeFalsy();
    expect(data?.title).toMatch(/VXR Test Listing/);
  });
});
