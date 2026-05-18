/**
 * Vitest setup — loads .env.test for non-VITE keys (test user
 * credentials, etc.) and exports helpers for signing in as a seeded
 * test user. VITE_* keys are already injected via vitest.config.js
 * `define` so src/lib/supabase.js can find them.
 */
import dotenv from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env.test") });

const REQUIRED = [
  "TEST_TENANT_A_EMAIL", "TEST_TENANT_A_PASSWORD",
  "TEST_TENANT_B_EMAIL", "TEST_TENANT_B_PASSWORD",
  "TEST_LANDLORD_EMAIL", "TEST_LANDLORD_PASSWORD",
];
for (const k of REQUIRED) {
  if (!process.env[k]) {
    throw new Error(
      `Missing ${k} in .env.test. Copy .env.test.example and fill in the seeded test user credentials.`,
    );
  }
}

const URL  = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.test. " +
    "These must point at the TEST Supabase project (not dev/prod).",
  );
}

/**
 * Returns a fresh Supabase client signed in as the requested role.
 * Each call creates its own client so concurrent tests can hold
 * different sessions without trampling each other's auth state.
 */
export async function signInAs(role) {
  const creds = {
    tenantA:  [process.env.TEST_TENANT_A_EMAIL,  process.env.TEST_TENANT_A_PASSWORD],
    tenantB:  [process.env.TEST_TENANT_B_EMAIL,  process.env.TEST_TENANT_B_PASSWORD],
    landlord: [process.env.TEST_LANDLORD_EMAIL,  process.env.TEST_LANDLORD_PASSWORD],
  }[role];
  if (!creds) throw new Error(`Unknown test role: ${role}`);
  const client = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: creds[0], password: creds[1],
  });
  if (error) throw new Error(`signInAs(${role}) failed: ${error.message}`);
  return { client, user: data.user, session: data.session };
}

/**
 * Resolve seeded fixture IDs at runtime (independent of the JSON twin
 * the seed script writes — keeps tests robust to a fresh seed).
 */
export async function fetchSeedIds() {
  const { client } = await signInAs("landlord");
  const { data: listings } = await client
    .from("listings")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1);
  const listingId = listings?.[0]?.id;
  const { data: contracts } = await client
    .from("contract")
    .select("id, application_id")
    .eq("listing_id", listingId)
    .limit(1);
  return {
    listingId,
    contractId: contracts?.[0]?.id,
    applicationId: contracts?.[0]?.application_id,
  };
}

export const PAYMONGO_PUBLIC_KEY = process.env.VITE_PAYMONGO_PUBLIC_KEY;
