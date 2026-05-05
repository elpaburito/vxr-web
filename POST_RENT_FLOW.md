# Post-Rent Flow

## Overview by Contract Type

```
Month-to-Month (listing_type = 'rent')
paid ──(30-day notice by either side)──► terminating ──► [tenant vacates + landlord closes]──► closed

Fixed-Term (listing_type = 'lease') — early mutual exit
paid ──(one side proposes mutual)──► [still "paid"]
     ──(other side accepts)──► terminating ──► [tenant vacates + landlord closes]──► closed

Fixed-Term — end of lease
paid ──(landlord files non_renewal  OR  end_date approaches)──► expiring
     ──(end_date reached)──► ended ──► [landlord closes]──► closed

Fixed-Term — eviction (landlord only)
paid ──(landlord initiates eviction)──► terminating ──► [tenant vacates + landlord closes]──► closed
```

---

## Step-by-Step: Month-to-Month (Notice)

| Step | Actor | Action | DB change |
|---|---|---|---|
| 1 | Tenant **or** Landlord | File 30-day notice (`type = 'notice'`) | `contract_termination` inserted; `contract.status → terminating`; `contract.effective_end_date` set to today +30 |
| 2 | Tenant | Wait for `effective_date` — sees countdown on InStayDashboard | — |
| 2b | Tenant *(override)* | Confirm vacated early before effective date *(override button)* | `termination.tenant_vacated_confirmed_at` set |
| 3 | Tenant | On/after effective date — **Confirm I have vacated** | `termination.tenant_vacated_confirmed_at` set |
| 4 | Landlord | Open **Move-Out Checklist** | — |
| 5 | Landlord | Add/remove security deposit deductions | `contract_deduction` rows inserted/deleted |
| 6 | Landlord | Resolve or acknowledge open reports | `termination.reports_carry_over_ack = true` or reports closed |
| 7 | Landlord | Waive outstanding balance (if any) | `termination.outstanding_balance_waived = true` |
| 8 | Landlord | Click **Close Contract** | `contract.status → closed`; `listings.status → archived`; `termination.landlord_closed_at` set |
| 9 | Landlord | **Relist Prompt** — choose to relist or keep archived | `listings.status → active` (or stays `archived`) |

---

## Step-by-Step: Fixed-Term Mutual Termination

| Step | Actor | Action | DB change |
|---|---|---|---|
| 1 | Tenant **or** Landlord | Propose mutual termination | `contract_termination` inserted with `mutual_proposed_at` set; **contract stays `paid`** |
| 2 | Other party | Accept the proposal | `mutual_accepted_by_tenant_at` or `mutual_accepted_by_landlord_at` set |
| — | System | Both accepted → contract flips | `contract.status → terminating` |
| 2b | Proposer | Withdraw before other accepts | `termination.mutual_withdrawn_at` set; contract stays `paid` |
| 3–9 | Same as MTM steps 3–9 | | |

> If only one side has accepted, the contract is **still `paid`** and appears "active" until the second acceptance.

---

## Step-by-Step: Fixed-Term Non-Renewal

| Step | Actor | Action | DB change |
|---|---|---|---|
| 1 | Landlord | File non-renewal | `contract_termination` inserted; `contract.status → expiring` |
| 2 | System *(at end_date)* | Contract auto-rolls | `contract.status → ended` *(DB trigger or scheduled job)* |
| 3–9 | Landlord | Move-out checklist + close | Same as MTM steps 4–9 |

---

## Step-by-Step: Eviction

| Step | Actor | Action | DB change |
|---|---|---|---|
| 1 | Landlord only | Initiate eviction with reason | `contract_termination` inserted (`type = 'eviction'`); `contract.status → terminating` |
| 2–9 | Same as MTM steps 2–9 | | |

---

## Move-Out Checklist Gates

All four gates must pass before **Close Contract** is enabled.

```
✅ contract.status ∈ {terminating, ended}
✅ termination.tenant_vacated_confirmed_at IS NOT NULL
     └─ OR force-close with a written reason (landlord override)
✅ No open/in-progress reports
     └─ OR reports_carry_over_ack = true
✅ outstanding_balance = 0
     └─ OR outstanding_balance_waived = true
```

Evaluated client-side by `evaluateMoveOutGates({ contract, termination, openReports, outstandingBalance })` — returns:

```js
{
  statusOk,      // contract.status in {terminating, ended}
  tenantVacated, // tenant_vacated_confirmed_at is set
  reportsClear,  // no open reports OR carry-over ack'd
  balanceClear,  // balance = 0 OR waived
  canClose,      // all four true
}
```

---

## Deduction Categories

Used in `contract_deduction.category`:

| Value | Label |
|---|---|
| `damage` | Damage to property |
| `cleaning` | Cleaning fee |
| `unpaid_rent` | Unpaid rent |
| `utilities` | Utilities owed |
| `keys` | Lost keys / replacement |
| `other` | Other |

---

## Security Deposit Refund Calculation

```
refund = max(termination.security_deposit_amount - sum(deductions[].amount), 0)
```

`security_deposit_amount` is copied from `contract.security_deposit` at the time the `contract_termination` row is created (snapshot, not live).

---

## After Close

```
closeContract()
  → contract.status        = "closed"
  → contract.actual_end_date = now
  → listings.status        = "archived"
  → termination.landlord_closed_at = now
  → redirect to RelistPrompt (/listings/:id/relist)

RelistPrompt — landlord chooses:
  ├─ Relist as-is       → listings.status = "active"
  ├─ Edit and relist    → listings.status = "active" → navigate to edit form (/enlist?edit=:id)
  └─ Keep archived      → listings.status stays "archived"
```

---

## Termination Types Reference

| `type` value | Label | Who can initiate | Contract type |
|---|---|---|---|
| `notice` | 30-day Notice | Tenant or Landlord | Month-to-month only |
| `mutual` | Mutual Termination | Tenant or Landlord | Fixed-term only |
| `non_renewal` | Non-Renewal | Landlord only | Fixed-term only |
| `eviction` | Eviction | Landlord only | Either |
| `expired` | Expired | System | Fixed-term (auto) |

---

## Screen / Service Map

| Screen | Who sees it | Key service calls |
|---|---|---|
| `InStayDashboard` | Tenant | `fetchMyActiveContract`, `getTermination`, `requestTermination`, `acceptMutualTermination`, `withdrawMutualTermination`, `confirmTenantVacated` |
| `TenantManagement` | Landlord | `fetchActiveTenants`, `requestTermination`, `acceptMutualTermination`, `withdrawMutualTermination` |
| `MoveOutChecklist` | Landlord only | `getTerminationState`, `addDeduction`, `removeDeduction`, `setReportsCarryOver`, `waiveOutstandingBalance`, `closeContract`, `evaluateMoveOutGates` |
| `RelistPrompt` | Landlord only | `relistListing`, `archiveListing` |

---

## Audit Events Logged to `contract_event`

| `event_type` | Triggered by |
|---|---|
| `termination_notice_requested` | `requestTermination` (notice) |
| `termination_mutual_requested` | `requestTermination` (mutual) |
| `termination_mutual_partial_accept` | `acceptMutualTermination` (one side) |
| `termination_mutual_accepted` | `acceptMutualTermination` (both sides) |
| `termination_mutual_withdrawn` | `withdrawMutualTermination` |
| `tenant_vacated_confirmed` | `confirmTenantVacated` |
| `reports_carry_over_set` | `setReportsCarryOver` |
| `outstanding_balance_waived` | `waiveOutstandingBalance` |
| `contract_closed` | `closeContract` |
