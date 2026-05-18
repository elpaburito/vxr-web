import { describe, it, expect } from "vitest";
import { signInAs, fetchSeedIds } from "./setup.js";
import {
  getOrCreateConversation,
  sendMessage,
  fetchMessages,
  markMessagesRead,
  fetchUnreadCounts,
} from "../src/lib/messagingService.js";

describe("messagingService", () => {
  let conversationId;
  let tenantAId;
  let landlordId;
  let listingId;

  it("getOrCreateConversation returns a stable conversation for the seeded pair", async () => {
    const { user: tenant } = await signInAs("tenantA");
    tenantAId = tenant.id;
    const ids = await fetchSeedIds();
    listingId = ids.listingId;
    const { data: contract } = await import("../src/lib/contractsService.js")
      .then((m) => m.fetchContractById(ids.contractId));
    landlordId = contract.landlord_id;

    const { data, error } = await getOrCreateConversation(tenantAId, landlordId, listingId);
    expect(error).toBeFalsy();
    expect(data?.id).toBeTruthy();
    conversationId = data.id;

    // Same arguments → same conversation row.
    const { data: again } = await getOrCreateConversation(tenantAId, landlordId, listingId);
    expect(again.id).toBe(conversationId);
  });

  it("sendMessage + fetchMessages round-trips a text", async () => {
    const body = `vitest-${Date.now()}`;
    const { error: sErr } = await sendMessage(conversationId, tenantAId, body);
    expect(sErr).toBeFalsy();
    const { data: msgs, error: fErr } = await fetchMessages(conversationId);
    expect(fErr).toBeFalsy();
    expect(msgs.some((m) => m.content === body)).toBe(true);
  });

  it("landlord sees an unread count for tenant's message; markMessagesRead clears it", async () => {
    await signInAs("landlord");
    const beforeMap = await fetchUnreadCounts(landlordId);
    const before = beforeMap.get(conversationId) ?? 0;
    expect(before).toBeGreaterThan(0);

    await markMessagesRead(conversationId, landlordId);
    const afterMap = await fetchUnreadCounts(landlordId);
    const after = afterMap.get(conversationId) ?? 0;
    expect(after).toBe(0);
  });
});
