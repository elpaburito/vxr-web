// Source of truth for the lease / month-to-month template terms.
// Mirrors mobile's `contract_templates.dart`. The landlord can override
// the defaults per-listing via `listings.terms_override` (string array)
// and/or upload a fully custom contract via `listings.contract_template_url`.

export const kDefaultLeaseTerms = [
  "1. FIXED-TERM LEASE — This Lease Agreement is binding for the duration stated above. Neither party may terminate this agreement before the end date without mutual written consent or valid legal grounds. Early termination by the Tenant shall result in forfeiture of the security deposit unless otherwise agreed in writing.",
  "2. RENT PAYMENT — The Tenant agrees to pay the monthly rent of PHP [Amount] on or before the due date each month. Payments shall be made via [Bank Transfer / GCash / Cash] to [Account Name / Number]. A late payment fee of PHP [Amount] per day shall be charged for payments made after the grace period.",
  "3. SECURITY DEPOSIT — The Tenant has paid a security deposit of PHP [Amount], which shall be held by the Landlord for the duration of the lease. The deposit shall be returned within 30 days after the lease ends, less any deductions for unpaid rent, damages beyond normal wear and tear, or outstanding utility bills.",
  "4. RENT INCREASE — The monthly rent is fixed for the entire lease term and shall not be increased by the Landlord during this period. Any rent adjustment shall only take effect upon renewal of this agreement, subject to prior written notice of at least 60 days before the lease expiry.",
  "5. USE OF PREMISES — The leased premises shall be used exclusively as a private residential dwelling. The Tenant shall not use the property for any commercial, illegal, or immoral activities. Subletting or assignment of this lease requires the prior written consent of the Landlord.",
  "6. UTILITIES & SERVICES — The Tenant shall be responsible for the payment of the following utilities: [Electricity / Water / Internet / Cable]. The following utilities are included in the monthly rent: [specify or write N/A]. The Tenant must settle all utility accounts before vacating the premises.",
  "7. MAINTENANCE & REPAIRS — The Tenant agrees to keep the premises clean and in good condition. Minor repairs costing below PHP [Amount] shall be the Tenant's responsibility. Major structural repairs shall be borne by the Landlord, provided the Tenant gives prompt written notice. The Tenant shall not make alterations or improvements without the Landlord's prior written consent.",
  "8. HOUSE RULES — The Tenant agrees to observe the following house rules: (a) No pets unless explicitly permitted in writing; (b) No excessive noise between [10:00 PM – 7:00 AM]; (c) Guests are allowed but overnight guests staying more than [7 consecutive days] must be declared; (d) Proper waste disposal practices must be observed; (e) Common areas must be kept clean and unobstructed.",
  "9. LEASE RENEWAL — At least 60 days before the lease expiry, either party must notify the other of their intention to renew or terminate. If no notice is given, the lease shall convert to a month-to-month rental agreement under the same terms, subject to rent adjustment with 30-day notice.",
  "10. TERMINATION & EVICTION — The Landlord may terminate this lease and require the Tenant to vacate under the following grounds: (a) Non-payment of rent for two or more consecutive months; (b) Serious breach of any provision of this agreement; (c) Use of the property for illegal activities. Eviction proceedings shall follow the applicable provisions of Philippine law, including Republic Act No. 9653 (Rent Control Act).",
  "11. GOVERNING LAW — This Agreement shall be governed by the laws of the Republic of the Philippines. Any dispute arising from this Agreement shall first be resolved through amicable settlement. If unresolved, disputes shall be submitted to the proper courts of [City / Municipality], Philippines.",
  "12. ENTIRE AGREEMENT — This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions, representations, or agreements. Any amendment must be in writing and signed by both parties.",
];

export const kDefaultRentTerms = [
  "1. MONTH-TO-MONTH TENANCY — This Rental Agreement creates a month-to-month tenancy commencing on the start date above. The agreement shall automatically renew each month unless terminated by either party with the required written notice. There is no fixed end date; the tenancy continues indefinitely until properly terminated.",
  "2. TERMINATION NOTICE — Either party may terminate this Agreement by providing at least 30 days written notice to the other party. Notice must be delivered in person, by registered mail, or via the platform's official messaging system. The tenancy ends on the last day of the notice period. The Tenant remains liable for rent during the notice period regardless of early vacating.",
  "3. RENT PAYMENT — The Tenant agrees to pay the monthly rent of PHP [Amount] on or before the due date each month. Payments shall be made via [Bank Transfer / GCash / Cash] to [Account Name / Number]. A late payment fee of PHP [Amount] per day shall be charged after the grace period.",
  "4. RENT ADJUSTMENT — The Landlord reserves the right to adjust the monthly rent by providing the Tenant with at least 30 days prior written notice. The Tenant may accept the new rent or terminate the agreement in accordance with Clause 2. No adjustment shall violate applicable rent control regulations under R.A. 9653.",
  "5. SECURITY DEPOSIT — The Tenant has paid a security deposit of PHP [Amount]. The deposit shall be returned within 30 days after the Tenant fully vacates the premises, less lawful deductions for unpaid rent, damages, or unpaid utilities. The deposit shall not be applied as payment for the last month's rent without written consent of the Landlord.",
  "6. USE OF PREMISES — The premises shall be used exclusively as a private residential dwelling. Commercial use, subletting, and assignment are prohibited without the Landlord's prior written consent. The Tenant shall comply with all applicable laws, ordinances, and homeowners association rules.",
  "7. UTILITIES & SERVICES — The Tenant shall be responsible for: [Electricity / Water / Internet / Cable]. Included in the monthly rent: [specify or write N/A]. All utility accounts must be settled in full before the Tenant vacates the premises.",
  "8. MAINTENANCE & REPAIRS — The Tenant shall maintain the premises in a clean and habitable condition. Minor repairs below PHP [Amount] are the Tenant's responsibility. The Tenant must report any significant damage or needed repairs to the Landlord promptly. No structural alterations may be made without written approval.",
  "9. HOUSE RULES — The Tenant agrees to: (a) Refrain from creating excessive noise between [10:00 PM – 7:00 AM]; (b) Properly dispose of garbage as per local schedules; (c) Declare guests staying beyond [7 consecutive days]; (d) Not keep pets unless specifically permitted in writing; (e) Maintain shared areas in clean condition.",
  "10. LANDLORD ACCESS — The Landlord may enter the premises for inspection, repairs, or showing to prospective tenants with at least 24 hours prior notice, except in cases of emergency where immediate entry may be required to prevent damage or harm.",
  "11. NON-PAYMENT & BREACH — Failure to pay rent for two consecutive months, or serious breach of any provision of this Agreement, shall entitle the Landlord to terminate this Agreement and initiate eviction proceedings in accordance with Philippine law.",
  "12. GOVERNING LAW — This Agreement shall be governed by the laws of the Republic of the Philippines, including R.A. 9653 (Rent Control Act of 2009). Disputes shall first be resolved through amicable settlement; otherwise, submitted to courts of [City / Municipality], Philippines.",
  "13. ENTIRE AGREEMENT — This Agreement represents the full understanding between the parties. Any amendment must be made in writing and signed by both parties. This Agreement supersedes any prior oral or written representations.",
];

/** `type` is 'lease' (fixed-term) or 'rent' (month-to-month). */
export function defaultTermsForType(type) {
  return type === "rent" ? kDefaultRentTerms : kDefaultLeaseTerms;
}

export function isLeaseType(type) {
  return (type ?? "lease") !== "rent";
}

export function contractTitleForType(type) {
  return isLeaseType(type)
    ? "RESIDENTIAL LEASE AGREEMENT"
    : "MONTH-TO-MONTH RENTAL AGREEMENT";
}

/**
 * Pick the terms shown on a contract: the listing's `terms_override`
 * (a JSON array of strings) wins; otherwise fall back to the per-type
 * defaults. Mirrors mobile's `_resolveTerms`.
 */
export function resolveTerms(listingType, termsOverride) {
  if (Array.isArray(termsOverride)) {
    const coerced = termsOverride.map((t) => String(t ?? "")).filter(Boolean);
    if (coerced.length > 0) return coerced;
  } else if (typeof termsOverride === "string" && termsOverride) {
    try {
      const parsed = JSON.parse(termsOverride);
      if (Array.isArray(parsed)) {
        const coerced = parsed.map((t) => String(t ?? "")).filter(Boolean);
        if (coerced.length > 0) return coerced;
      }
    } catch {
      /* fall through */
    }
  }
  return defaultTermsForType(listingType);
}

/** Map the contract row's UI-shape `type` to the listing-shape one. */
export function listingTypeFromContract(contract) {
  return contract?.type === "month_to_month" ? "rent" : "lease";
}
