// Frontend-only contract persistence (mock).
// Stores contracts keyed by applicant id in localStorage so signatures + payment
// state survive page refreshes without any backend.

import { SAMPLE_UNITS, SAMPLE_APPLICANTS, SAMPLE_APPLICATION_DETAILS } from "../data/enlistmentMock";

const KEY = (id) => `vxr_contract_${id}`;

export function loadContract(applicantId) {
  try {
    const raw = localStorage.getItem(KEY(applicantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveContract(applicantId, contract) {
  localStorage.setItem(KEY(applicantId), JSON.stringify(contract));
}

export function clearContract(applicantId) {
  localStorage.removeItem(KEY(applicantId));
}

export function buildDefaultContract(applicantId) {
  const applicant = SAMPLE_APPLICANTS.find((a) => a.id === applicantId);
  if (!applicant) return null;
  const unit = SAMPLE_UNITS.find((u) => u.id === applicant.unitId);
  const details = SAMPLE_APPLICATION_DETAILS;

  const today = new Date();
  const start = new Date(today);
  start.setDate(1);
  start.setMonth(start.getMonth() + 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  return {
    id: applicantId,
    type: "fixed_term", // 'fixed_term' | 'month_to_month'

    // Parties
    landlordName: "ViewxRent Host",
    landlordContact: "host@viewxrent.com / +63 912 345 6789",
    tenantName: applicant.name,
    tenantContact: `${details.email} / ${details.phone}`,

    // Property
    propertyAddress: unit?.address ?? unit?.location ?? "",
    propertyType: unit?.propertyType ?? "Apartment",

    // Dates
    enteredOn: today.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    duration: "12 months",

    // Money
    monthlyRent: unit?.price ?? 0,
    securityDeposit: unit?.price ?? 0,
    advanceRent: unit?.price ?? 0,
    paymentDueDate: 5,
    gracePeriodDays: 5,
    paymentMethod: "Bank Transfer / GCash",
    accountInfo: "ViewxRent — BPI 1234 5678 9012",
    lateFee: 200,

    // Rules
    minorRepairsThreshold: 500,
    quietHours: "10:00 PM – 7:00 AM",
    overnightGuestThreshold: 7,
    governingCity: "Makati City",

    // Signing state
    landlordSignature: null, // { name, signedAt }
    tenantSignature: null,

    // Payment state
    payment: null, // { amount, method, paidAt, transactionId, last4 }

    createdAt: today.toISOString(),
  };
}

export function getContractStatus(contract) {
  if (!contract) return "draft";
  if (contract.payment) return "paid";
  if (contract.landlordSignature && contract.tenantSignature) return "both_signed";
  if (contract.landlordSignature) return "pending_tenant";
  if (contract.tenantSignature) return "pending_landlord";
  return "draft";
}

export const CONTRACT_TYPES = {
  fixed_term: {
    label: "Fixed-Term Lease",
    short: "Fixed-Term",
    title: "RESIDENTIAL LEASE AGREEMENT",
    contractType: "FIXED-TERM LEASE",
    accent: "#1E3A8A", // navy
    accentSoft: "#DBEAFE",
  },
  month_to_month: {
    label: "Month-to-Month Rental",
    short: "Month-to-Month",
    title: "MONTH-TO-MONTH RENTAL AGREEMENT",
    contractType: "MONTH-TO-MONTH RENTAL",
    accent: "#15803D", // green
    accentSoft: "#DCFCE7",
  },
};
