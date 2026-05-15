// Shared validation for the tenant application form.
// Used by RentalApplicationForm, ApplicationModal, and ApplicationEditModal.
// Returns an `errors` map keyed by field name; an empty object means valid.

export const INCOME_STATUS_NO_DETAILS = ["Unemployed", "Student", "Retired"];

const EMAIL_RE = /\S+@\S+\.\S+/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

export function employmentNeedsDetails(status) {
  return !!status && !INCOME_STATUS_NO_DETAILS.includes(status);
}

function checkPersonal(formData, e) {
  if (!formData.fullName?.trim())       e.fullName       = "Full name is required";
  if (!formData.dateOfBirth)            e.dateOfBirth    = "Date of birth is required";
  if (!formData.contactNumber?.trim())  e.contactNumber  = "Contact number is required";
  if (!formData.email?.trim())          e.email          = "Email is required";
  else if (!isValidEmail(formData.email)) e.email        = "Enter a valid email";
  if (!formData.currentAddress?.trim()) e.currentAddress = "Current address is required";
}

function checkEmployment(formData, e) {
  if (!formData.employmentStatus) {
    e.employmentStatus = "Employment status is required";
    return;
  }
  if (!employmentNeedsDetails(formData.employmentStatus)) return;
  if (!formData.jobTitle?.trim())        e.jobTitle           = "Job title is required";
  if (!formData.companyName?.trim())     e.companyName        = "Company name is required";
  if (!formData.monthlyIncome)           e.monthlyIncome      = "Monthly income is required";
  if (!formData.lengthOfEmployment)      e.lengthOfEmployment = "Length of employment is required";
  if (!formData.workAddress?.trim())     e.workAddress        = "Work address is required";
}

function checkRental(formData, e) {
  if (!formData.firstTimeRenter) {
    e.firstTimeRenter = "Please select an option";
    return;
  }
  if (formData.firstTimeRenter !== "No") return;
  if (!formData.previousAddress?.trim())  e.previousAddress  = "Previous address is required";
  if (!formData.rentalDuration)           e.rentalDuration   = "Rental duration is required";
  if (!formData.reasonForLeaving?.trim()) e.reasonForLeaving = "Reason for leaving is required";
  if (!formData.landlordName?.trim())     e.landlordName     = "Landlord name is required";
  if (!formData.landlordPhone?.trim())    e.landlordPhone    = "Landlord contact is required";
}

function checkIncomeDocs(docs, e) {
  if (!docs?.proofOfIncome) e.proofOfIncome = "Proof of income is required";
}

function checkDeclaration(formData, e) {
  if (!formData.consentIdentity)    e.consentIdentity    = "You must consent to identity verification";
  if (!formData.consentDataPrivacy) e.consentDataPrivacy = "You must agree to the data privacy policy";
}

// Validate a specific step (1-5). Step 4 needs `docs` for the file check.
export function validateApplicationStep(formData = {}, docs = {}, step = 1) {
  const e = {};
  switch (step) {
    case 1: checkPersonal(formData, e); break;
    case 2: checkEmployment(formData, e); break;
    case 3: checkRental(formData, e); break;
    case 4: checkIncomeDocs(docs, e); break;
    case 5: checkDeclaration(formData, e); break;
    default: break;
  }
  return e;
}

// Validate every step at once. For consumers that don't have a step UI
// (e.g. ApplicationEditModal) or to gate a final submit.
export function validateApplication(formData = {}, docs = {}) {
  const e = {};
  checkPersonal(formData, e);
  checkEmployment(formData, e);
  checkRental(formData, e);
  // Only require proofOfIncome when `docs` is provided. The edit modal
  // doesn't re-upload — it's content-only.
  if (docs && Object.prototype.hasOwnProperty.call(docs, "proofOfIncome")) {
    checkIncomeDocs(docs, e);
  }
  checkDeclaration(formData, e);
  return e;
}
