# VXR Review — Thesis Defense Readiness

**Date:** 2026-05-15
**Scope:** Tenant + landlord journeys end-to-end across the React web app
(`d:\school works\vxr-web\my-react-app`) and the Flutter mobile app
(`D:\school works\mobile-proj\GithubMob`), plus the shared Supabase backend.
Both apps share one Supabase project; strict web↔mobile parity diffs were
explicitly **out of scope** for this pass.
**Methodology:** Flow-order static review (UI → service → DB/Edge Function),
plus a `npm run build` sanity check on the web app (passed, with a chunk-size
warning). Each finding lists `file:line` so you can jump in and judge for
yourself; not all of these are bugs, some are defense-prep liabilities
("a panelist will ask about this").

---

## Executive Summary

**Findings by severity:** 2 Critical · 6 High · 8 Medium · 6 Low (22 total)

**Top three to fix first:**

1. **The `verify-identity` Edge Function source lives in the mobile repo only.**
   The web app invokes it (`src/lib/verificationService.js:201-204`) but the
   web repo has no `supabase/functions/verify-identity/` directory — only the
   mobile repo does (`D:\school works\mobile-proj\GithubMob\supabase\functions\verify-identity\index.ts`).
   If someone deploys functions from the web repo, they silently bypass the
   AI verification pipeline.

2. **ContractView "Clear signatures" button has no role gate.** Either party
   (tenant or landlord) can wipe **both** signatures at any time before
   payment ([src/ContractView.jsx:160-165, 469-477](src/ContractView.jsx#L160-L165)).
   Tenant can erase the landlord's signature unilaterally. Likely DB-side RLS
   permits it because both are contract parties; needs a server-side column
   gate or a UI role check.

3. **The success page promises an email receipt that isn't sent.**
   [src/ContractPayment.jsx:867-869](src/ContractPayment.jsx#L867-L869) says
   "A copy of this receipt has been sent to your email" unconditionally — no
   code in `src/`, `paymentsService.js`, or the Edge Functions sends an
   email. Easy panel question, no good answer.

The rest of the system is in surprisingly good shape: PayMongo Edge Functions
do server-side amount computation, tenant-only gating, idempotent webhooks
with HMAC verification, and "don't downgrade succeeded" logic; the
`submitApplication` service re-checks the listing-verified gate and the
tenant-verified gate server-side; AdminGuard correctly wraps both admin
pages. The biggest cosmetic risk is **legacy Stripe code still wired alongside
PayMongo** — a panelist will see two payment processors and ask which one is
real (answer: PayMongo; Stripe should be deleted).

---

## Critical

### C-1 — `verify-identity` Edge Function source is missing from the web repo

**Area:** Backend / Identity verification
**Location:**
- Caller: [src/lib/verificationService.js:201-218](src/lib/verificationService.js#L201-L218)
- Web functions dir: [supabase/functions/](supabase/functions/) — no `verify-identity` folder
- Source of truth (mobile repo only): `D:\school works\mobile-proj\GithubMob\supabase\functions\verify-identity\index.ts`

**Evidence:** `Glob "supabase/functions/verify-identity/*"` returns zero
results in the web repo. The mobile repo contains the full Gemini-based AI
verification pipeline. The web caller invokes it by name
(`supabase.functions.invoke("verify-identity", ...)`), so it relies on the
function being deployed in the shared Supabase project from the *other*
repo.

**Why it matters for defense:** A panelist will ask "show me your identity
verification code." You'll have to switch repos. Worse, if anyone deploys
edge functions from the web repo (e.g. CI/CD wired to web), the AI
function falls out of sync with whatever the mobile repo last pushed. The
fallback at `verificationService.js:206-218` quietly catches the missing
function and returns `decision: "pending"` — so users see "an admin will
review your submission" and the AI pipeline silently no-ops.

**Suggested fix:** Pick one repo as the source of truth for `supabase/`
(recommend web, since `modules.sql` lives there) and copy
`verify-identity/` over. Delete the duplicate set of payment Edge Functions
from the mobile repo to avoid future drift — or vice versa. Add a one-line
note in CLAUDE.md or README pointing to the canonical location.

---

### C-2 — "Clear signatures" can be triggered by either party, wiping the other's signature

**Area:** Tenant + Landlord contract signing
**Location:** [src/ContractView.jsx:160-165](src/ContractView.jsx#L160-L165),
button at [src/ContractView.jsx:469-477](src/ContractView.jsx#L469-L477),
service call to [src/lib/contractsService.js:503-518](src/lib/contractsService.js#L503-L518)

**Evidence:** The button renders whenever `isLocked && status !== "paid"`
(L469) — `isLocked` is true as soon as *either* signature exists. Neither
the button nor `resetContractSignatures()` checks whether the caller is
landlord or tenant; both columns get nulled. The Supabase RLS on `contract`
almost certainly allows UPDATE by either party (since they need to update
their own signature columns), so the database won't block it either.

**Why it matters for defense:** A panelist running the demo as the tenant
can erase the landlord's signature. It's a denial-of-service on the
contract flow and breaks the principle that a signature is binding.

**Suggested fix:** Two options, do both —
1. UI: only show the button to the user whose own signature is the most
   recent (or just hide it once `fully_signed`).
2. DB: add a column-level RLS policy on `contract` so each user can only
   set their own `*_signature*` columns to NULL. Easiest is a `BEFORE
   UPDATE` trigger that rejects writes where the change touches the
   counterparty's signature columns.

---

## High

### H-1 — Success page promises an email that's never sent

**Area:** Tenant payment UX
**Location:** [src/ContractPayment.jsx:867-869](src/ContractPayment.jsx#L867-L869)

**Evidence:** Line 868: `<p className="mt-6 text-center text-[11px] text-slate-400">A copy of this receipt has been sent to your email.</p>` —
shown unconditionally on `SuccessView`. No `supabase.functions.invoke` for
an email function, no `mailto:`, no SMTP integration anywhere in the repo.

**Why it matters for defense:** Easy gotcha. A panelist who notices the
line will ask "where does the email get sent?" and you won't have an
answer.

**Suggested fix:** Either (a) delete the line, or (b) wire a tiny
`send-receipt` Edge Function using Supabase Resend / Postmark integration.
(a) is the honest cheap fix.

---

### H-2 — Mobile app hardcodes Supabase URL + anon key in `main.dart`

**Area:** Mobile bootstrap
**Location:** `D:\school works\mobile-proj\GithubMob\lib\main.dart:14-17`

**Evidence:**
```dart
await Supabase.initialize(
  anonKey: "eyJhbGciOiJIUzI1NiIs...",
  url: "https://mqsdtgvxyrvkornnifen.supabase.co",
);
```

**Why it matters for defense:** The anon key alone *is* publishable and RLS
protects the data, so this isn't a security exposure. But: (a) the project
ref is now permanently in git history, (b) there's no way to switch
environments (staging vs prod) without rebuilding, (c) a panelist familiar
with Flutter will ask "why didn't you use `--dart-define` or `flutter_dotenv`?"

**Suggested fix:** Move to `--dart-define`:
```dart
await Supabase.initialize(
  url:     const String.fromEnvironment("SUPABASE_URL"),
  anonKey: const String.fromEnvironment("SUPABASE_ANON_KEY"),
);
```
Document the build command in the mobile README.

---

### H-3 — Legacy Stripe code is still wired alongside PayMongo

**Area:** Payments
**Locations:**
- [src/lib/paymentsService.js:97-99](src/lib/paymentsService.js#L97-L99) (backward-compat shims with "Delete after the next release" comment)
- [src/lib/contractsService.js:458-471](src/lib/contractsService.js#L458-L471) (`recordContractPayment` writes the same transaction ID to both `stripe_payment_intent_id` AND `paymongo_payment_intent_id` columns)
- [src/lib/contractsService.js:39-49](src/lib/contractsService.js#L39-L49) (normalize prefers PayMongo id, falls back to Stripe)
- [supabase/functions/stripe-webhook/](supabase/functions/stripe-webhook/), [supabase/functions/create-payment-intent/](supabase/functions/create-payment-intent/), [supabase/functions/record-payment/](supabase/functions/record-payment/) — three Stripe Edge Functions still deployable
- Web `package.json` still imports `@stripe/stripe-js@9.4.0`

**Why it matters for defense:** A panelist will ask "are you using Stripe or
PayMongo?" Both. The mock payment path writes the same ID to both columns
unconditionally, which is conceptually messy and risks future bugs (e.g. a
unique constraint on both columns colliding for a single mock payment).

**Suggested fix:** Pick a release-cut commit, then:
1. Delete `src/lib/stripe.js` (the file is gone per `git status` — good).
2. Delete the three Stripe Edge Functions.
3. Remove `@stripe/stripe-js` from `package.json`.
4. In `recordContractPayment` (L458), stop writing `stripe_payment_intent_id`.
5. Plan a small migration to drop the `stripe_*` columns from `payment` /
   `payment_transactions`.
6. Delete the shims at `paymentsService.js:98-99` since the comment already
   says they're due for removal.

---

### H-4 — `payment_method_allowed` excludes `bank_transfer`, but the UI offers it

**Area:** Tenant payment
**Locations:**
- Edge Function: [supabase/functions/paymongo-create-payment-intent/index.ts:126](supabase/functions/paymongo-create-payment-intent/index.ts#L126)
  (`payment_method_allowed: ["card", "gcash", "paymaya", "grab_pay"]` — no `bank_transfer`)
- UI: [src/ContractPayment.jsx:542](src/ContractPayment.jsx#L542) (offers `"bank_transfer"` in the method grid)
- Attach path: [src/ContractPayment.jsx:357-359](src/ContractPayment.jsx#L357-L359) accepts the bank_transfer choice and calls `createEwalletPaymentMethod({ type: "bank_transfer" })`

**Evidence:** The PaymentIntent is created with PayMongo refusing
`bank_transfer`. If a tenant picks "Bank Transfer" in the picker, the
client creates a PayMongo PM of type `bank_transfer`, then the attach call
fails because the PI doesn't allow it.

**Why it matters for defense:** This is exactly the kind of "click the
fourth option and the demo breaks" issue a panelist will find by
exploration.

**Suggested fix:** Either add `"bank_transfer"` to the allowed list on the
Edge Function (and confirm PayMongo PH actually supports it on your
account), or remove `"bank_transfer"` from the UI grid in `ContractPayment.jsx:542`.

---

### H-5 — Mock-payment client flag and server flag are independent

**Area:** Payments / security
**Locations:**
- Client: [.env.example:14](.env.example#L14) (`VITE_MOCK_PAYMENTS_ENABLED=false`)
- Server: gating is server-side via `MOCK_PAYMENTS_ENABLED` env on the Edge Function `paymongo-record-mock-payment` (per setup docs)
- Saved method has `is_mock` flag at [src/lib/paymentMethodsService.js:13](src/lib/paymentMethodsService.js#L13) and [src/ContractPayment.jsx:310-328](src/ContractPayment.jsx#L310-L328)

**Evidence:** The UI shows mock methods if they exist in the DB; the
Edge Function checks its own `MOCK_PAYMENTS_ENABLED` env var; the client's
`VITE_MOCK_PAYMENTS_ENABLED` flag isn't actually checked anywhere visible
in `ContractPayment.jsx` — the mock branch fires whenever
`pickedSaved?.is_mock` is true.

**Why it matters for defense:** If a tenant or admin once creates a mock
method (via `paymongo-add-method` with `is_mock: true`), that method
remains usable forever — unless the server-side `MOCK_PAYMENTS_ENABLED`
flag is false, in which case the Edge Function refuses. Two independent
guards is fine **if both are off in production**, but the client flag in
`.env.example` is misleading because the client doesn't actually gate on
it.

**Suggested fix:** Either (a) wire `import.meta.env.VITE_MOCK_PAYMENTS_ENABLED`
into the UI so mock methods are hidden when false, or (b) remove the
client flag from `.env.example` entirely and document that mock methods
are server-gated only. (b) is cleaner.

---

### H-6 — Contract auto-overwrites zero rent/deposit values silently

**Area:** Contract correctness
**Locations:**
- [src/ContractPayment.jsx:55-64](src/ContractPayment.jsx#L55-L64)
- [src/ContractView.jsx:67-78](src/ContractView.jsx#L67-L78)

**Evidence:** Both views, on load, detect `Number(c.monthlyRent) === 0`
and silently overwrite `monthly_rent`/`security_deposit`/`advance_rent`
from `listing_financials`, then fire a fire-and-forget `updateContract`.
Comment notes this is for legacy contracts where the data wasn't there.

**Why it matters for defense:** A signed contract is a legal artifact; the
amount should be locked at signing time. A panelist will ask "what happens
if the landlord changes the listing price after the contract is signed?" —
right now the answer is "the next page load overwrites the contract with
the new price, silently." Especially bad post-signature.

**Suggested fix:** Gate the self-heal on contract status. Only run the
backfill when `status === "draft"` (or whatever pre-signing state). After
either signature exists, the contract amounts must not change without an
explicit re-sign flow.

---

## Medium

### M-1 — `paymongo-record-payment` paidAt fallback chain is buggy

**Area:** Payments
**Location:** [supabase/functions/paymongo-record-payment/index.ts:92-93](supabase/functions/paymongo-record-payment/index.ts#L92-L93)

**Evidence:**
```ts
const paidAt = attrs.last_payment_error?.created_at ??
  (firstPayment.paid_at ? new Date(firstPayment.paid_at * 1000).toISOString() : nowIso);
```
The first fallback is `attrs.last_payment_error?.created_at` — that's the
timestamp of the most recent payment **failure**, not success. On a
PaymentIntent that had one failed attempt then succeeded, this records the
failure time as the paid time.

**Suggested fix:** Drop the first fallback:
```ts
const paidAt = firstPayment.paid_at
  ? new Date(firstPayment.paid_at * 1000).toISOString()
  : nowIso;
```

---

### M-2 — `recordContractPayment` tries to flip `listings.status="rented"` from the tenant client, which is a no-op

**Area:** Payments cleanup
**Location:** [src/lib/contractsService.js:481-496](src/lib/contractsService.js#L481-L496)

**Evidence:** Comment at L481-485 acknowledges that RLS will block
tenants from updating the listing, so the update is a no-op for them and
the webhook does the real work. Dead code.

**Suggested fix:** Remove L486-496 — the webhook and `paymongo-record-payment`
Edge Function both handle this; the client doesn't need to attempt it.

---

### M-3 — `lock` override on the Supabase client disables auth concurrency protection

**Area:** Auth
**Location:** [src/lib/supabase.js:12-19](src/lib/supabase.js#L12-L19)

**Evidence:** `lock: async (_name, _acquireTimeout, fn) => await fn()` —
this disables Supabase's auth lock entirely. Original purpose: prevent
concurrent token refreshes from racing. Disabling it is sometimes done to
avoid IndexedDB issues in older Safari, but the comment explaining why is
absent.

**Why it matters:** Two tabs refreshing the session simultaneously can
race; rare but real. A panelist who reads the code will ask why this is
overridden.

**Suggested fix:** Either remove the override (defaults are usually fine
on modern browsers) or add a one-line comment explaining the workaround.

---

### M-4 — AdminGuard shows "Access denied" flash while profile loads

**Area:** Admin UX / auth
**Location:** [src/components/AdminGuard.jsx:10-61](src/components/AdminGuard.jsx#L10-L61),
[src/context/AuthContext.jsx:78-82](src/context/AuthContext.jsx#L78-L82)

**Evidence:** `useAuth().loading` only gates the initial session read; the
profile fetch at AuthContext.jsx:80 is fire-and-forget. So a legitimate
admin landing on `/admin` will briefly see "Access denied" while
`loadProfile` runs, then the page swaps in. Not a security issue (just UX)
but it looks like a bug to anyone watching.

**Suggested fix:** Add a `profileLoading` flag in AuthContext that starts
`true` once a user exists and flips false after `loadProfile` completes;
AdminGuard waits on `loading || profileLoading`.

---

### M-5 — `EnlistmentApplications.jsx` imports from `./data/enlistmentMock` — file exists but the name implies mock data

**Area:** Hygiene
**Location:** [src/EnlistmentApplications.jsx:13](src/EnlistmentApplications.jsx#L13)

**Evidence:** The import is for `STATUS_STYLE` only (a UI constant), not
mock data — but the filename `enlistmentMock.js` invites the question "is
this page using mock data?" Especially since `src/data/listings.js` was
just deleted (per `git status`).

**Suggested fix:** Move `STATUS_STYLE` into `src/constants/application.js`
or inline into the component file, and delete `enlistmentMock.js` if it
holds nothing else.

---

### M-6 — `ListingsContext` is defined and provided but no page consumes it

**Area:** Dead code
**Location:** [src/context/ListingsContext.jsx](src/context/ListingsContext.jsx),
provider wired at [src/AppRouter.jsx:34](src/AppRouter.jsx#L34)

**Evidence:** Per the structural exploration, no page calls `useListings`.
Pages fetch directly from `listingsService.js`.

**Suggested fix:** Delete the context file and remove the provider wrap.
Or commit to using it (e.g. cache the search results in context) — but
that's a refactor, not a defense-readiness fix.

---

### M-7 — Mobile `property_data.dart` is a 2937-LOC monolith of DB queries

**Area:** Mobile architecture
**Location:** `D:\school works\mobile-proj\GithubMob\lib\property_data.dart` (2937 LOC)

**Evidence:** All Supabase queries for listings, applications, contracts,
payments, messages, reports, and bookmarks live in one file. The
`property_data.dart` name no longer matches what it contains.

**Why it matters for defense:** A panelist who opens this file will note
the smell. Architectural questions ("how do you separate concerns?") get
harder to answer.

**Suggested fix:** Don't refactor before defense — too risky. **Do** be
ready to acknowledge it: "We bundled the data layer into one file to ship;
the next iteration splits it into per-domain services
(`ListingsRepository`, `ApplicationsRepository`, etc.)."

---

### M-8 — Web bundle is 1.16 MB (304 KB gzipped) + a 976 KB html2pdf chunk

**Area:** Performance
**Location:** `npm run build` output, `dist/assets/`

**Evidence:** `dist/assets/index-CcnSZbod.js 1,162.46 kB` and
`dist/assets/html2pdf-Bh62Zl6o.js 975.75 kB`. Vite warns about the
500 KB chunk size limit.

**Suggested fix:** Dynamic-import `html2pdf.js` only when the user clicks
"Export / Print" on `ContractView` — that alone removes ~975 KB from the
initial bundle. Routes can also be lazy-loaded with `React.lazy`. For
defense this is **nice-to-have**, not a blocker.

---

## Low

### L-1 — UnitDetails shadows `profile` from auth with the host profile

**Location:** [src/UnitDetails.jsx:53, 90-93](src/UnitDetails.jsx#L53-L93)
The destructure `({ data: profile }) => setHostProfile(profile)` in the
nested callback shadows the auth-context `profile` variable. Functionally
correct (the setter uses the right value), confusing on read. Rename to
`hostProfileData`.

### L-2 — Route `/wishlists` is plural but the page concept is singular

**Location:** [src/AppRouter.jsx:42](src/AppRouter.jsx#L42), file
`src/Wishlist.jsx`. Cosmetic.

### L-3 — Stripe shims in `paymentsService.js` have "delete after next release" comment that hasn't been honored

**Location:** [src/lib/paymentsService.js:97-99](src/lib/paymentsService.js#L97-L99)
Covered by H-3.

### L-4 — `package.json` includes `@stripe/stripe-js` even though Stripe is no longer the active processor

**Location:** [package.json](package.json) — dev dep cleanup; covered by H-3.

### L-5 — Many components exceed 800 LOC

Listed in Appendix A.

### L-6 — Some "swallowed" `.catch(() => {})` calls

E.g. [src/ContractPayment.jsx:63](src/ContractPayment.jsx#L63),
[src/ContractView.jsx:77](src/ContractView.jsx#L77). The self-heal write
is intentionally fire-and-forget; OK as-is, but a comment explaining
*why* the catch is empty would head off a panelist question.

---

## Appendix A — Files over 800 LOC

| File | LOC | Notes |
|---|---|---|
| `lib/manage_listing.dart` (mobile) | ~4542 | Listing CRUD + image upload + amenities. Huge. |
| `lib/property_data.dart` (mobile) | ~2937 | All DB queries. See M-7. |
| `lib/panorama_capture_screen.dart` (mobile) | ~2432 | 360° capture + stitching. |
| [src/HouseEnlistment.jsx](src/HouseEnlistment.jsx) | ~1350 | Landlord multi-step form. |
| [src/EnlistmentApplications.jsx](src/EnlistmentApplications.jsx) | ~1064 | Landlord application inbox. |
| [src/ContractView.jsx](src/ContractView.jsx) | ~1026 | Both-party contract surface. |
| [src/SearchPage.jsx](src/SearchPage.jsx) | ~934 | Tenant browse. |
| [src/MyPayments.jsx](src/MyPayments.jsx) | ~897 | Tenant payment ledger. |
| [src/ContractPayment.jsx](src/ContractPayment.jsx) | ~888 | PayMongo checkout. |
| [src/ProfilePage.jsx](src/ProfilePage.jsx) | ~872 | Profile + verification entry. |
| [src/RentalApplicationForm.jsx](src/RentalApplicationForm.jsx) | ~857 | 5-step tenant application. |

**Defense answer:** "We prioritized feature completeness over file-size
discipline. The natural seam in each large file is the multi-step form
state or the data-fetching layer; the planned refactor extracts those
into hooks/services."

---

## Appendix B — Dead, stale, or noteworthy code

- **`src/lib/paymentsService.js:97-99`** — `createStripePaymentIntent` / `recordStripePayment` shims with "Delete after the next release" comment still present.
- **`src/context/ListingsContext.jsx`** — provider wired but no consumer (see M-6).
- **`supabase/functions/stripe-webhook/`, `create-payment-intent/`, `record-payment/`** — Stripe edge functions still present (see H-3).
- **`src/lib/contractsService.js:481-496`** — tenant client tries to flip `listings.status="rented"`; RLS blocks it; webhook does the real work (see M-2).
- **`src/data/enlistmentMock.js`** — name implies mock data; only exports a `STATUS_STYLE` UI constant.
- **`src/data/listings.js`** — deleted in working tree (per `git status`), good — confirm no stale imports remain (build passed, so probably fine).

---

## Appendix C — Defense Q&A starters

Likely panel questions and one-paragraph answers grounded in the code.

**Q1: "How do you prevent a malicious tenant from forging a payment?"**
The browser cannot dictate the amount. `paymongo-create-payment-intent`
([supabase/functions/paymongo-create-payment-intent/index.ts:47-75](supabase/functions/paymongo-create-payment-intent/index.ts#L47-L75))
reads the contract from the DB using the caller's JWT, checks
`user.id === contract.tenant_id` and `contract.status === "fully_signed"`,
and computes `monthly_rent + security_deposit + advance_rent` *server
side*. The amount sent to PayMongo never crosses the wire from the
browser. PayMongo's webhook (`paymongo-webhook`) is the source of truth
for fulfillment and verifies its HMAC signature
([supabase/functions/paymongo-webhook/index.ts:171-174](supabase/functions/paymongo-webhook/index.ts#L171-L174))
before writing.

**Q2: "What happens if the PayMongo webhook fires twice?"**
Both `payment` and `payment_transactions` writes use `upsert` with
`onConflict: "paymongo_payment_intent_id"` and explicitly refuse to
downgrade a `succeeded` row
([supabase/functions/paymongo-webhook/index.ts:62-70, 139](supabase/functions/paymongo-webhook/index.ts#L62-L70)).
A duplicate `payment.paid` event is a no-op. A late `payment.failed`
arriving after success is also dropped.

**Q3: "Why can a user be both tenant and landlord?"**
`profiles.is_landlord` is a *capability* flag — set to true when the user
creates their first listing. The primary `role` column still tracks
admin vs non-admin. A user can rent one property while owning another;
contract membership is checked per-contract by `tenant_id`/`landlord_id`,
not by a global role.

**Q4: "How is identity verification enforced — can someone bypass the gate?"**
Three layers: (a) the UI gate in `RentalApplicationForm.jsx:134-139`
redirects unverified tenants to `/profile?verify=1`; (b) the service-layer
gate in `applicationsService.js:58-71` re-checks `profiles.is_verified`
before any storage upload or DB insert; (c) the RLS policies on
`application` reject the INSERT directly if the listing or tenant isn't
verified. Bypassing layer (a) just trips (b); bypassing (b) trips (c).
The AI pipeline that decides verification lives in the
`verify-identity` Edge Function in the *mobile* repo (see C-1).

**Q5: "Where's the source of truth for shared schema between web and mobile?"**
`supabase/modules.sql` plus per-module SQL files in
`d:\school works\vxr-web\my-react-app\supabase\`. The mobile repo has a
parallel set that mirrors the same tables. They're kept in sync manually
— see the [mobile-shares-db memory](../../C:/Users/PC/.claude/projects/d--school-works-vxr-web-my-react-app/memory/project_mobile_shares_db.md).
Drift is real (see C-1, M-7); the explicit "out of scope" of this review
was the parity audit.

**Q6: "What's your story on payment idempotency end-to-end?"**
Three idempotency points: (1) `paymongo-create-payment-intent` reuses an
open `pending`/`requires_action` ledger row before creating a new
PaymentIntent ([supabase/functions/paymongo-create-payment-intent/index.ts:86-117](supabase/functions/paymongo-create-payment-intent/index.ts#L86-L117));
(2) `paymongo-record-payment` and the webhook both upsert by
`paymongo_payment_intent_id` and refuse to downgrade `succeeded`; (3)
contract status flips to `paid` only after the row is written, so a retry
of the record-payment call is safe.

**Q7: "Why is Stripe code still in the repo?"**
Carryover from the prototype that used Stripe before we switched to
PayMongo for Philippine peso support. The active flow is exclusively
PayMongo; the Stripe edge functions and the `stripe_payment_intent_id`
column remain so existing payment rows still resolve. They should be
removed before next release (see H-3).

---

## Verification Checklist

- [x] Every row in the planned tenant + landlord journey tables has been
  read or had a finding logged.
- [x] Severity counts in the Executive Summary (2/6/8/6 = 22) match the
  body of this document.
- [x] All Critical and High findings name a file and line that resolve in
  the codebase as of 2026-05-15.
- [x] `npm run build` ran successfully from `d:\school works\vxr-web\my-react-app`
  (one chunk-size warning, captured as M-8).
- [x] Defense Q&A Appendix has 7 questions with code-grounded answers.

---

*End of review.*
