# VXR Web — API Reference

> All database calls go through **Supabase PostgREST**. All storage calls go through the **Supabase Storage** client. Three calls go to **Supabase Edge Functions** (Stripe payment flow).

---

## Auth (`supabase.auth.*`)

| Call | Purpose |
|---|---|
| `getUser()` | Get current session user |
| `updateUser({ password })` | Change password |
| `resend({ type: "signup", email })` | Re-send email verification link |
| `signInWithOtp({ phone })` | Send phone OTP |
| `verifyOtp({ phone, token, type: "sms" })` | Verify phone OTP → flips `profiles.is_verified = true` |
| `signOut()` | Sign out |

---

## Database Tables

### `profiles`

| Operation | Filter / Payload |
|---|---|
| SELECT `id, email, full_name, phone, role, is_verified, avatar_url, created_at` | by `id`, or search `email/full_name`, or `in(ids)` |
| UPDATE | `role`, `is_verified`, `avatar_url`, `full_name`, `phone`, `updated_at` |

---

### `listings` / `listings_full` (view)

| Operation | Notes |
|---|---|
| SELECT from `listings_full` | Public browse; filters: status, city, type, search, price range |
| SELECT from `listings_full` by `id` | Single listing detail |
| SELECT from `listings_full` by `landlord_id` | My Listings page |
| SELECT `id, title, status, listing_type, is_verified, landlord_id, ...` | Admin listing list |
| INSERT | Create listing — base row only |
| UPDATE | `title, description, property_type, listing_type, status, cover_photo_url, contract_template_url, contract_template_name, terms_override, is_verified, verification_submitted_at, verification_doc_url` |
| DELETE by `id` | |

**Satellite tables written via UPSERT on create/update:**

| Table | Columns |
|---|---|
| `listing_details` | `bedrooms, bathrooms, square_meters, max_occupants, furnishing, flooring_type, floor_number, total_floors, year_built, has_balcony, has_storage, has_natural_light` |
| `listing_amenities` | `has_aircon, has_refrigerator, has_washing_machine, has_water_heater, has_stove, has_cabinet, has_bed` |
| `listing_utilities` | `with_water, with_electricity, with_internet, with_parking` |
| `listing_building_features` | `has_security, has_elevator, has_backup_power, has_pool, has_gym, has_laundry_area, has_function_hall, has_playground` |
| `listing_financials` | `monthly_rent, security_deposit, advance_payment, payment_terms, payment_method` |
| `listing_availability` | `is_immediate, available_from, lease_term` |
| `listing_policies` | `pets_allowed, smoking_allowed, no_curfew, guest_policy, subletting_allowed, modification_allowed` |
| `listing_requirements` | `requires_proof_of_income, requires_employment_cert, requires_valid_id, requires_references` |
| `listing_host_info` | `host_name, host_role, response_time` |
| `listing_locations` | `full_address, city, province, barangay, postal_code, nearby_landmarks, latitude, longitude` |

---

### `listing_image`

| Operation | Filter / Payload |
|---|---|
| SELECT `id, listing_id, url, is_cover, sort_order, type, upload_source` | `in(listing_ids)` |
| INSERT | `{ listing_id, url, is_cover, sort_order, type }` |
| UPDATE | `sort_order`, `is_cover` |
| DELETE by `id` | |

---

### `application`

| Operation | Filter / Payload |
|---|---|
| SELECT full row + `listings(...)` + `application_document(...)` | by `landlord_id` |
| SELECT `id, listing_id, status, submitted_at, landlord_id, listings(...)` | by `tenant_id` |
| SELECT `*` + `listings(...)` | by `id` |
| SELECT `id, status` | by `listing_id + tenant_id` (duplicate check) |
| INSERT | Full application row (see field list below) |
| UPDATE | `status, reviewed_at` (landlord); or full form fields on re-application (tenant) |
| DELETE `application_document` | by `application_id` (on re-application) |

**Application row fields:**
`listing_id, tenant_id, landlord_id, status, first_name, last_name, phone_number, email, date_of_birth, current_address, employment_status, job_title, company_name, monthly_income, employment_length, work_address, previous_address, stayed_duration, reason_for_leaving, previous_landlord, landlord_contact, agreed_to_declaration, declaration_name, declaration_date, submitted_at`

---

### `application_document`

| Operation | Payload |
|---|---|
| INSERT | `{ application_id, document_type, url, file_name }` — types: `valid_id_front`, `valid_id_back`, `proof_of_income` |
| DELETE | by `application_id` |

---

### `contract`

| Operation | Filter / Payload |
|---|---|
| SELECT `*, payment(*), listings(...)` | by `id` |
| SELECT `*, payment(*)` | by `tenant_id` or `landlord_id` (all contracts) |
| SELECT `*, listings(landlord_id)` + side-tables | by `tenant_id` + status `in(paid, terminating, expiring, terminated, ended)` — active dashboard |
| SELECT `id` | by `tenant_id` + same status set — existence check |
| SELECT `id, status, application_id` | by `application_id` |
| SELECT full + `listings, application, contract_termination` | by `landlord_id` + status set — Tenant Management |
| SELECT `id, status, listing_id, tenant_id, landlord_id, ...` | by `tenant_id` + `in(awaiting_tenant, awaiting_landlord, fully_signed)` — My Payments |
| SELECT `id` (count only) | Admin stats |
| INSERT | Full contract row (see `createContract` payload) |
| UPDATE | `status, terminated_by, termination_reason, notice_date, effective_end_date, landlord_signature, landlord_signed_name, landlord_signed_at, tenant_signature, tenant_signed_name, tenant_signed_at, updated_at` |

**Contract status flow:**
```
awaiting_tenant → awaiting_landlord → fully_signed → paid
  → terminating / expiring → terminated / ended → closed
```

**`createContract` payload fields:**
`listing_id, application_id, tenant_id, landlord_id, listing_type (lease|rent), status, landlord_name, landlord_contact, tenant_name, tenant_contact, property_address, property_type, entered_on, start_date, end_date, duration, monthly_rent, security_deposit, advance_rent, payment_due_date, grace_period_days, payment_method, account_info, late_fee, minor_repairs_threshold, quiet_hours, overnight_guest_threshold, governing_city`

> **Mobile note:** `listing_type = 'lease'` = Fixed-Term, `listing_type = 'rent'` = Month-to-Month

---

### `payment`

| Operation | Filter / Payload |
|---|---|
| SELECT `id, amount_cents, currency, status, paid_at, stripe_payment_intent_id, contract_id, contract(...)` | by `contract.tenant_id` — payment history |
| SELECT `paid_at, amount_cents, method, last4, name, stripe_payment_intent_id` | by `contract_id` — latest payment |
| INSERT / UPSERT | Written by Edge Functions only (not called directly from client) |

---

### `bookmark`

| Operation | Filter |
|---|---|
| SELECT `listing_id` | by `user_id` |
| SELECT `id, listing_id, created_at` | by `user_id` |
| UPSERT `{ user_id, listing_id }` | `onConflict: user_id,listing_id` |
| DELETE | by `user_id + listing_id` |

---

### `conversation` / `conversation_with_profiles` (view)

| Operation | Filter |
|---|---|
| SELECT `*` from `conversation_with_profiles` | by `tenant_id` or `landlord_id` |
| SELECT `id` from `conversation` | by `tenant_id + landlord_id + listing_id` |
| INSERT `{ tenant_id, landlord_id, listing_id }` | |

---

### `message`

| Operation | Filter / Payload |
|---|---|
| SELECT `id, conversation_id, sender_id, type, content, url, file_name, is_read, created_at` | by `conversation_id` ordered asc |
| SELECT `conversation_id` | by `is_read=false + sender_id != me` — unread counts |
| INSERT `{ conversation_id, sender_id, type, content }` | text message |
| INSERT `{ conversation_id, sender_id, type, url, file_name }` | attachment message |
| UPDATE `{ is_read: true }` | by `conversation_id + sender_id != me + is_read=false` |

**Message `type` values:** `text`, `image`, `file`

---

### `report`

| Operation | Filter / Payload |
|---|---|
| SELECT full row + `listings(title)` | by `tenant_id` |
| SELECT full row + `listings(...)` | by `listing_id in(landlord's listings)` |
| SELECT `id, title, status` | by `contract_id + status in(open, in_progress)` |
| SELECT `*` | by `id` |
| INSERT | `{ tenant_id, contract_id, listing_id, landlord_id, title, description, type, priority, status: "open" }` |
| UPDATE | `{ status, updated_at }` or `{ landlord_response, landlord_responded_at, updated_at }` |

**`type` (category) values:** `plumbing`, `electrical`, `structural`, `appliance`, `pest`, `cleanliness`, `other`

**`priority` values:** `low`, `medium`, `high`

**`status` values:** `open`, `in_progress`, `resolved`

---

### `contract_termination`

| Operation | Filter / Payload |
|---|---|
| SELECT `*` | by `contract_id` |
| INSERT | `{ contract_id, initiated_by, type, notice_date, effective_date, reason, security_deposit_amount, mutual_proposed_at, mutual_accepted_by_tenant_at, mutual_accepted_by_landlord_at }` |
| UPDATE | `mutual_accepted_by_tenant_at`, `mutual_accepted_by_landlord_at`, `mutual_withdrawn_at`, `tenant_vacated_confirmed_at`, `landlord_closed_at`, `reports_carry_over_ack`, `outstanding_balance_waived`, `outstanding_balance_waive_note` |

**`type` values:** `notice` (MTM 30-day), `mutual` (fixed-term), `non_renewal`, `eviction`, `expired`

**`initiated_by` values:** `tenant`, `landlord`

---

### `contract_deduction`

| Operation | Filter / Payload |
|---|---|
| SELECT `*` | by `termination_id` |
| INSERT | `{ termination_id, category, description, amount, photo_url }` |
| DELETE | by `id` |

---

### `contract_event` (audit log)

| Operation | Payload |
|---|---|
| INSERT | `{ contract_id, actor_id, event_type, payload }` |

**`event_type` values:** `termination_notice_requested`, `termination_mutual_requested`, `termination_mutual_accepted`, `termination_mutual_partial_accept`, `termination_mutual_withdrawn`, `tenant_vacated_confirmed`, `reports_carry_over_set`, `outstanding_balance_waived`, `contract_closed`

---

### `verifications`

| Operation | Filter / Payload |
|---|---|
| SELECT full verification row | by `user_id` (latest), or batch by `user_id in(...)` with `decision` filter |
| UPDATE | `{ decision, decision_reason, processed_at }` |

**`decision` values:** `pending`, `manual_review`, `approved`, `rejected`

---

### `cms_page` *(admin only)*

| Operation | |
|---|---|
| SELECT `*` | all, ordered by `updated_at` |
| INSERT / UPDATE | `{ slug, title, body, status }` |
| DELETE | by `id` |

---

### `cms_announcement` *(admin only)*

| Operation | |
|---|---|
| SELECT `*` | all, ordered by `created_at` |
| INSERT / UPDATE | announcement fields |
| DELETE | by `id` |

---

## Storage Buckets

| Bucket | Used For | Operations |
|---|---|---|
| `listing-images` | Listing photos + user avatars | upload, getPublicUrl, delete |
| `listing-contracts` | Landlord-uploaded contract PDF templates | upload, getPublicUrl, createSignedUrl, delete |
| `application-documents` | Tenant ID / income proof uploads | upload (path returned, not public URL) |
| `chat-attachments` | Message image/file attachments | upload, getPublicUrl |
| `verifications` | Admin ID verification documents | createSignedUrl (admin read only) |

---

## Edge Functions (Supabase Functions)

### `POST /functions/v1/create-payment-intent`

Requires: `Authorization: Bearer <jwt>` (tenant session)

```
Request body:  { contract_id: string }
Response:      { clientSecret: string, paymentIntentId: string, amount: number, currency: string }
Error:         { error: string }
```

- Amount computed server-side: `monthly_rent + security_deposit + advance_rent` (in centavos)
- Only succeeds if `contract.status === "fully_signed"` and caller is the tenant on the contract
- Reuses an existing open `PaymentIntent` for the same `contract_id` to avoid duplicates
- If the amount changed (contract edited), updates the existing intent

---

### `POST /functions/v1/record-payment`

Requires: `Authorization: Bearer <jwt>` (tenant session)

```
Request body:  { contract_id: string, payment_intent_id: string }
Response:      { ok: true }
Error:         { error: string }
```

- Re-fetches the intent from Stripe (does not trust the browser)
- Writes a `payment` row via `ON CONFLICT (stripe_payment_intent_id)` — idempotent
- Flips `contract.status` → `"paid"`
- Called by the client immediately after `stripe.confirmPayment()` resolves

---

### `POST /functions/v1/stripe-webhook`

No JWT — verified via `stripe-signature` header + `STRIPE_WEBHOOK_SECRET`

```
Listens for: payment_intent.succeeded, payment_intent.payment_failed
```

- Mirror of `record-payment` triggered directly by Stripe
- Handles cases where tenant closes the browser before `record-payment` is called (3DS redirects, network drops)
- Uses service-role key (bypasses RLS)
- Deploy with `--no-verify-jwt`

---

## Realtime Subscriptions

| Channel | Table | Event | Filter |
|---|---|---|---|
| `message:{conversationId}` | `message` | INSERT | `conversation_id=eq.{id}` |
| `conversation:{userId}` | `conversation` | UPDATE | none (client-side filtered) |

---

## Contract Field Name Map (Web camelCase ↔ DB snake_case)

| Web (camelCase) | DB (snake_case) |
|---|---|
| `landlordName` | `landlord_name` |
| `landlordContact` | `landlord_contact` |
| `tenantName` | `tenant_name` |
| `tenantContact` | `tenant_contact` |
| `propertyAddress` | `property_address` |
| `propertyType` | `property_type` |
| `enteredOn` | `entered_on` |
| `startDate` | `start_date` |
| `endDate` | `end_date` |
| `duration` | `duration` |
| `monthlyRent` | `monthly_rent` |
| `securityDeposit` | `security_deposit` |
| `advanceRent` | `advance_rent` |
| `paymentDueDate` | `payment_due_date` |
| `gracePeriodDays` | `grace_period_days` |
| `paymentMethod` | `payment_method` |
| `accountInfo` | `account_info` |
| `lateFee` | `late_fee` |
| `minorRepairsThreshold` | `minor_repairs_threshold` |
| `quietHours` | `quiet_hours` |
| `overnightGuestThreshold` | `overnight_guest_threshold` |
| `governingCity` | `governing_city` |
| `type` (`fixed_term`) | `listing_type` = `'lease'` |
| `type` (`month_to_month`) | `listing_type` = `'rent'` |
