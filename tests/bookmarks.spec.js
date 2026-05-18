import { describe, it, expect, afterAll } from "vitest";
import { signInAs, fetchSeedIds } from "./setup.js";
import { addBookmark, removeBookmark, fetchBookmarkedIds } from "../src/lib/bookmarksService.js";

let tenantAId;
let listingId;

describe("bookmarksService", () => {
  it("tenantA can add a bookmark", async () => {
    const { user } = await signInAs("tenantA");
    tenantAId = user.id;
    ({ listingId } = await fetchSeedIds());
    const { error } = await addBookmark(tenantAId, listingId);
    expect(error).toBeFalsy();
    const { data } = await fetchBookmarkedIds(tenantAId);
    expect(data).toContain(listingId);
  });

  it("re-adding the same bookmark is idempotent", async () => {
    const { error } = await addBookmark(tenantAId, listingId);
    expect(error).toBeFalsy();
    const { data } = await fetchBookmarkedIds(tenantAId);
    expect(data.filter((id) => id === listingId).length).toBe(1);
  });

  it("RLS prevents tenantB from reading tenantA's bookmarks", async () => {
    await signInAs("tenantB");
    const { data } = await fetchBookmarkedIds(tenantAId);
    expect(data).not.toContain(listingId);
  });

  it("removeBookmark deletes the row", async () => {
    await signInAs("tenantA");
    const { error } = await removeBookmark(tenantAId, listingId);
    expect(error).toBeFalsy();
    const { data } = await fetchBookmarkedIds(tenantAId);
    expect(data).not.toContain(listingId);
  });

  afterAll(async () => {
    if (tenantAId && listingId) {
      await signInAs("tenantA");
      await removeBookmark(tenantAId, listingId);
    }
  });
});
