# Mobile Sync Guide — What to Update Beyond API Calls

API calls alone are not enough. This document covers all 7 layers the mobile app must implement to have full parity with the web.

---

## 1. Data Normalization

The DB stores raw snake_case columns but the web transforms them before use. Your mobile needs the same mappings (see `src/lib/contractsService.js: normalizeContract()`).

### `listing_type` → UI contract type
| DB value | UI value |
|---|---|
| `lease` | `fixed_term` |
| `rent` | `month_to_month` |

### Signature columns → signature object
DB has three separate columns per side. Combine into one object:
```
landlord_signature      → signature.image (if starts with "data:image/") or null
landlord_signed_name    → signature.name
landlord_signed_at      → signature.signedAt
```
Same pattern for `tenant_*`.

### `payment` join → payment object
The DB join returns an array. Take `[0]` and convert:
```
amount_cents / 100        → amount
stripe_payment_intent_id  → transactionId
method / payment_method_label → method
last4                     → last4
paid_at                   → paidAt
name / payer_name         → name
```

### `getContractStatus()` — derived UI status
Does **not** read the `status` column directly for display. Priority order:
```
has payment row             → "paid"
status = "fully_signed" OR both signatures present → "both_signed"
status = "awaiting_tenant" OR landlord signed      → "pending_tenant"
status = "awaiting_landlord" OR tenant signed      → "pending_landlord"
status = "cancelled"        → "cancelled"
fallback                    → "draft"
```
> The post-paid statuses (`terminating`, `expiring`, `terminated`, `ended`, `closed`) are used directly from `contract.status` — no mapping needed.

---

## 2. Business Rule Guards

These are enforced in the web's service layer before any DB call. The database may also enforce some via RLS/check constraints, but the mobile should mirror them to give the user a proper error message before a network round-trip.

| Rule | Service file |
|---|---|
| Tenant can only apply if `listings.status = 'active'` AND `is_verified = true` | `applicationsService.js` |
| Only one application per tenant per listing. Re-apply allowed only if previous status = `rejected` (UPDATE the old row instead of INSERT) | `applicationsService.js` |
| Termination type `'notice'` (30-day) only allowed for month-to-month contracts (`listing_type = 'rent'`) | `postRentService.js` |
| Termination type `'mutual'` only allowed for fixed-term contracts (`listing_type = 'lease'`) | `postRentService.js` |
| Only the landlord can initiate `non_renewal` or `eviction` | `postRentService.js` |
| `confirmTenantVacated` is idempotent — skip if `tenant_vacated_confirmed_at` is already set | `postRentService.js` |
| `closeContract` is blocked unless ALL of the following: | `postRentService.js` |
| → `contract.status` ∈ `{terminating, ended}` | |
| → `termination` row exists | |
| → `tenant_vacated_confirmed_at` is set (or `force=true` + `forceReason` provided) | |
| → no open/in-progress reports OR `reports_carry_over_ack = true` | |
| → outstanding balance zero OR `outstanding_balance_waived = true` | |

---

## 3. Computed / Derived Values (not stored in DB)

These must be calculated client-side from raw DB data.

| Value | Formula |
|---|---|
| `daysUntilEffective` | `daysDiff(termination.effective_date, today)` |
| `canConfirmVacated` | `daysUntilEffective <= 0` |
| `canOverrideMoveOut` | `!vacatedAt && !canConfirmVacated && daysUntilEffective > 0` |
| Security deposit refund | `max(termination.security_deposit_amount - sum(deductions.amount), 0)` |
| `getTerminationState()` | Parallel fetch of `contract + termination + deductions + open reports`, then compute totals |

### `getTerminationState()` output shape
```
{
  contract,
  termination,
  deductions,
  openReports,
  totals: {
    securityDeposit,    // from termination.security_deposit_amount or contract.security_deposit
    totalDeductions,    // sum of deductions[].amount
    amountReturned,     // max(securityDeposit - totalDeductions, 0)
  }
}
```

---

## 4. Full Status State Machines

### Application
```
pending → approved
pending → rejected  (tenant can re-apply after rejection)
```

### Listing
```
draft → active → rented → archived → active (relist via RelistPrompt)
                         → inactive
```
> `archived` is set automatically by `closeContract()`. Landlord must manually relist.

### Contract (full lifecycle)
```
[Signing phase]
awaiting_tenant
  → awaiting_landlord   (tenant signs)
  → fully_signed        (landlord signs)
  → paid                (Stripe payment confirmed)

[Post-paid: Month-to-Month]
paid
  → terminating         (30-day notice filed by either side)
  → terminated          (after effective_date, vacated confirmed, landlord closes)
  → closed

[Post-paid: Fixed-Term — mutual early exit]
paid
  → (mutual proposal, stays "paid" until both accept)
  → terminating         (both sides accepted)
  → terminated → closed

[Post-paid: Fixed-Term — end of term]
paid
  → expiring            (non_renewal filed, or end_date approaching)
  → ended               (end_date reached automatically)
  → closed              (landlord closes out)

[Post-paid: Eviction]
paid
  → terminating         (eviction, landlord-only)
  → terminated → closed
```

> **Mutual termination note:** The contract status stays `"paid"` after the initial proposal. It only flips to `"terminating"` once **both** `mutual_accepted_by_tenant_at` and `mutual_accepted_by_landlord_at` are set.

---

## 5. Storage Path Conventions

### Application documents (`application-documents` bucket)
- Stored as a **path**, not a public URL: `${userId}/${timestamp}-${label}-${safeFileName}`
- This is a private bucket. Landlords access via Supabase RLS — do **not** try to construct a public URL.
- Labels used: `id_front`, `id_back`, `income_proof`

### Listing images (`listing-images` bucket)
- Images may be stored as either a **relative path** (mobile upload) or a **full `https://` URL** (web upload).
- Your mobile must handle both: if the value starts with `http://` or `https://`, use it directly; otherwise call `getPublicUrl(path)`.

### Avatars
- Also stored in the `listing-images` bucket, not a dedicated avatar bucket.

### Contract PDFs (`listing-contracts` bucket)
- Stored as a relative path. Call `getPublicUrl(path)` to get a viewable URL.
- `listing.contract_template_url` = `null` means the listing uses the in-app generated template (no uploaded PDF).

---

## 6. Payment Flow Sequence

The Stripe payment flow is three steps and the mobile must call all three:

```
1. POST /functions/v1/create-payment-intent
     body: { contract_id }
     → { clientSecret, paymentIntentId, amount, currency }

2. Stripe SDK: confirmPayment(clientSecret)
     → waits for user to complete card entry / 3DS

3. POST /functions/v1/record-payment   ← MOBILE MUST CALL THIS
     body: { contract_id, payment_intent_id }
     → { ok: true }
     → flips contract.status to "paid"
```

> **Do not skip step 3.** The Stripe webhook (`stripe-webhook`) is a safety net for dropped connections, not the primary path. If the mobile skips `record-payment`, the user will see their payment pending until the webhook fires, which may take seconds or minutes.

### Amount computation (server-side only)
The Edge Function computes the charge as:
```
amount = monthly_rent + security_deposit + advance_rent   (in centavos / smallest currency unit)
```
The mobile should **not** send an amount — the server reads it from the contract row.

---

## 7. Amenity / Feature Label ↔ DB Column Map

The boolean flags are spread across 4 sub-tables. If your mobile displays amenity chips by label, use this map:

| Display Label | Sub-table | Column |
|---|---|---|
| Air Conditioning | `listing_amenities` | `has_aircon` |
| Refrigerator | `listing_amenities` | `has_refrigerator` |
| Washing Machine | `listing_amenities` | `has_washing_machine` |
| Water Heater | `listing_amenities` | `has_water_heater` |
| Stove | `listing_amenities` | `has_stove` |
| Cabinet | `listing_amenities` | `has_cabinet` |
| Bed | `listing_amenities` | `has_bed` |
| Balcony | `listing_details` | `has_balcony` |
| Storage | `listing_details` | `has_storage` |
| Natural Light | `listing_details` | `has_natural_light` |
| Security / CCTV | `listing_building_features` | `has_security` |
| Elevator | `listing_building_features` | `has_elevator` |
| Backup Power | `listing_building_features` | `has_backup_power` |
| Swimming Pool | `listing_building_features` | `has_pool` |
| Gym | `listing_building_features` | `has_gym` |
| Laundry Area | `listing_building_features` | `has_laundry_area` |
| Function Hall | `listing_building_features` | `has_function_hall` |
| Playground | `listing_building_features` | `has_playground` |
| WiFi | `listing_utilities` | `with_internet` |
| Water Included | `listing_utilities` | `with_water` |
| Electricity Included | `listing_utilities` | `with_electricity` |
| Parking | `listing_utilities` | `with_parking` |

---

## Priority Checklist

| # | Layer | Mobile risk if missing |
|---|---|---|
| 1 | Data normalization | Contract view crashes / wrong status shown |
| 2 | Business rule guards | User gets cryptic DB errors or silent failures |
| 3 | Computed values | Move-out flow broken, wrong deposit refund shown |
| 4 | Status state machines | Wrong UI shown for post-paid contract phases |
| 5 | Storage path conventions | Broken images, broken document access |
| 6 | Payment flow sequence | Payment appears pending indefinitely |
| 7 | Amenity label map | Amenities show blank or wrong values |
