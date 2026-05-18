import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Upload, Loader2, AlertCircle,
  User, Briefcase, Home, Wallet, FileText, X, ImageOff,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import { submitApplication } from "./lib/applicationsService";
import { fetchListingById } from "./lib/listingsService";
import {
  validateApplicationStep, employmentNeedsDetails,
} from "./lib/applicationValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

// Identity is now collected once via /profile (IdentityVerificationModal)
// and gated server-side in submitApplication, so the form no longer has
// a separate ID-upload step. Proof of income stays — it's a financial
// fitness signal, distinct from identity.
const STEPS = [
  { id: 1, label: "Personal",    icon: User },
  { id: 2, label: "Employment",  icon: Briefcase },
  { id: 3, label: "Rental",      icon: Home },
  { id: 4, label: "Income",      icon: Wallet },
  { id: 5, label: "Declaration", icon: FileText },
];

const EMPLOYMENT_OPTIONS = [
  "Employed",
  "Self-employed",
  "Freelance",
  "Student",
  "Unemployed",
  "Retired",
];

const EMPLOYMENT_LENGTH_OPTIONS = [
  "Less than 6 months",
  "6 months – 1 year",
  "1 – 2 years",
  "2 – 5 years",
  "5+ years",
];

const INITIAL_FORM = {
  // Step 1
  fullName: "",
  dateOfBirth: "",
  contactNumber: "",
  email: "",
  currentAddress: "",
  // Step 2
  employmentStatus: "",
  jobTitle: "",
  companyName: "",
  monthlyIncome: "",
  lengthOfEmployment: "",
  workAddress: "",
  // Step 3
  firstTimeRenter: "",
  previousAddress: "",
  rentalDuration: "",
  reasonForLeaving: "",
  landlordName: "",
  landlordPhone: "",
  // Step 4 — files stored separately
  // Step 5
  consentIdentity: false,
  consentDataPrivacy: false,
};

const INITIAL_DOCS = {
  proofOfIncome: null,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RentalApplicationForm() {
  const navigate = useNavigate();
  const { id: listingId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();

  const [listing, setListing] = useState(null);
  const [listingLoading, setListingLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [errors, setErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill email from auth
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email }));
    }
    if (profile?.full_name && !formData.fullName) {
      setFormData((prev) => ({ ...prev, fullName: profile.full_name }));
    }
  }, [user, profile]); // eslint-disable-line

  // Load listing info for the header card. Bounce back to the unit page
  // if the listing isn't verified or active — submitApplication would
  // reject the insert anyway, no point letting the tenant fill the form.
  useEffect(() => {
    if (!listingId) return;
    fetchListingById(listingId).then(({ data }) => {
      setListing(data);
      setListingLoading(false);
      if (data && (!data.isVerified || data.status !== "active")) {
        const reason = data.status !== "active"
          ? "This listing is not currently accepting applications."
          : "This listing is pending verification and cannot accept applications yet.";
        alert(reason);
        navigate(`/unit/${listingId}`, { replace: true });
      }
    });
  }, [listingId, navigate]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated === false) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  // Identity-verification gate. Mirrors the server-side gate in
  // submitApplication so the tenant doesn't waste time filling out a form
  // they can't submit. Bounces to /profile?verify=1 which auto-opens the
  // verification wizard.
  useEffect(() => {
    if (isAuthenticated === true && profile && profile.is_verified === false) {
      alert("Please verify your identity before applying.");
      navigate("/profile?verify=1", { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setDoc = (field, file) => {
    setDocs((prev) => ({ ...prev, [field]: file }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (targetStep) => {
    const e = validateApplicationStep(formData, docs, targetStep);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate(5)) return;
    if (!user?.id) { navigate("/login"); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data, error } = await submitApplication({
        listingId,
        tenantId: user.id,
        landlordId: listing?.ownerId ?? null,
        formData,
        documentFiles: docs,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F4F4F6] flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-emerald-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Your rental application has been sent to the landlord. You'll be notified once it's reviewed.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/unit/${listingId}`)}
              className="h-12 rounded-xl bg-gradient-to-r bg-vxr-gradient text-white font-semibold hover:opacity-90 transition"
            >
              Back to Listing
            </button>
            <button
              onClick={() => navigate("/home2")}
              className="h-12 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const needsEmploymentDetails = employmentNeedsDetails(formData.employmentStatus);

  return (
    <div className="min-h-screen bg-[#F4F4F6] flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? goBack() : navigate(-1))}
            className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">
              Rental Application
            </p>
            <p className="text-sm font-bold text-slate-900 leading-tight truncate">
              {listingLoading ? "Loading…" : listing?.title ?? "Unit"}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-full">
            {step} / 5
          </span>
          <NotificationBell framed />
        </div>
      </header>

      {/* ── Progress stepper ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <StepBar current={step} />
        </div>
      </div>

      {/* ── Listing summary strip ── */}
      {listing && (
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <img
              src={listing.cover ?? listing.img ?? undefined}
              alt={listing.title}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="w-12 h-12 rounded-xl object-cover bg-slate-100 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{listing.title}</p>
              <p className="text-xs text-slate-500 truncate">{listing.location}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-vxr-accent text-sm">₱{(listing.monthlyRent ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-slate-400">/month</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Form body ── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-5">
        {step === 1 && (
          <Step1
            data={formData}
            errors={errors}
            onChange={update}
          />
        )}
        {step === 2 && (
          <Step2
            data={formData}
            errors={errors}
            onChange={update}
            needsDetails={needsEmploymentDetails}
          />
        )}
        {step === 3 && (
          <Step3
            data={formData}
            errors={errors}
            onChange={update}
          />
        )}
        {step === 4 && (
          <Step4
            docs={docs}
            errors={errors}
            setDoc={setDoc}
          />
        )}
        {step === 5 && (
          <Step5
            data={formData}
            errors={errors}
            onChange={update}
            listing={listing}
            applicantName={formData.fullName}
          />
        )}

        {submitError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {submitError}
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex gap-3 pt-2 pb-8">
          {step > 1 && (
            <button
              onClick={goBack}
              className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={goNext}
              className="flex-1 h-12 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#FF7043,#FF8A80)" }}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-12 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#FF7043,#FF8A80)" }}
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              ) : (
                <><Check size={16} /> Submit Application</>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done    = current > s.id;
        const active  = current === s.id;
        const Icon    = s.icon;
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all
                  ${done   ? "bg-emerald-500 text-white shadow-sm"
                  : active ? "text-white shadow-md"
                  :          "bg-slate-100 text-slate-400"}`}
                style={active ? { background: "linear-gradient(135deg,#FF7043,#FF8A80)" } : undefined}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={14} />}
              </div>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-vxr-accent" : done ? "text-emerald-600" : "text-slate-400"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all ${current > s.id ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared form primitives ───────────────────────────────────────────────────

function FormCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5 mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const inputClass = (err) =>
  `w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 bg-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-vxr-accent/40 transition placeholder:text-slate-400 ${
    err ? "border-red-400" : "border-slate-200 focus:border-vxr-accent"
  }`;

function Input({ error, ...props }) {
  return <input className={inputClass(error)} {...props} />;
}

function Textarea({ error, ...props }) {
  return <textarea className={`${inputClass(error)} resize-none`} rows={2} {...props} />;
}

function Select({ error, children, ...props }) {
  return (
    <select className={inputClass(error)} {...props}>
      {children}
    </select>
  );
}

// ─── Step 1: Personal Information ─────────────────────────────────────────────

function Step1({ data, errors, onChange }) {
  return (
    <FormCard title="Personal Information" subtitle="Tell us about yourself">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name" required error={errors.fullName}>
          {/* We keep fullName as single field matching existing service */}
          <Input
            value={data.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder="Juan Dela Cruz"
            error={errors.fullName}
          />
        </Field>

        <Field label="Date of Birth" required error={errors.dateOfBirth}>
          <Input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            error={errors.dateOfBirth}
          />
        </Field>

        <Field label="Contact Number" required error={errors.contactNumber}>
          <Input
            type="tel"
            value={data.contactNumber}
            onChange={(e) => onChange("contactNumber", e.target.value)}
            placeholder="+63 912 345 6789"
            error={errors.contactNumber}
          />
        </Field>

        <Field label="Email Address" required error={errors.email}>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="juan@example.com"
            error={errors.email}
          />
        </Field>
      </div>

      <Field label="Current Address" required error={errors.currentAddress}>
        <Textarea
          value={data.currentAddress}
          onChange={(e) => onChange("currentAddress", e.target.value)}
          placeholder="Your full residential address"
          error={errors.currentAddress}
        />
      </Field>
    </FormCard>
  );
}

// ─── Step 2: Employment & Financial ───────────────────────────────────────────

function Step2({ data, errors, onChange, needsDetails }) {
  return (
    <FormCard title="Employment & Financial" subtitle="Share your current work and income details">
      <Field label="Employment Status" required error={errors.employmentStatus}>
        <Select
          value={data.employmentStatus}
          onChange={(e) => onChange("employmentStatus", e.target.value)}
          error={errors.employmentStatus}
        >
          <option value="">Select employment status</option>
          {EMPLOYMENT_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </Field>

      {needsDetails && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Job Title" required error={errors.jobTitle}>
              <Input
                value={data.jobTitle}
                onChange={(e) => onChange("jobTitle", e.target.value)}
                placeholder="Software Engineer"
                error={errors.jobTitle}
              />
            </Field>

            <Field label="Company Name" required error={errors.companyName}>
              <Input
                value={data.companyName}
                onChange={(e) => onChange("companyName", e.target.value)}
                placeholder="Acme Corp."
                error={errors.companyName}
              />
            </Field>

            <Field label="Monthly Income (₱)" required error={errors.monthlyIncome}>
              <Input
                type="number"
                value={data.monthlyIncome}
                onChange={(e) => onChange("monthlyIncome", e.target.value)}
                placeholder="50000"
                min="0"
                error={errors.monthlyIncome}
              />
            </Field>

            <Field label="Length of Employment" required error={errors.lengthOfEmployment}>
              <Select
                value={data.lengthOfEmployment}
                onChange={(e) => onChange("lengthOfEmployment", e.target.value)}
                error={errors.lengthOfEmployment}
              >
                <option value="">Select duration</option>
                {EMPLOYMENT_LENGTH_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Work Address" required error={errors.workAddress}>
            <Textarea
              value={data.workAddress}
              onChange={(e) => onChange("workAddress", e.target.value)}
              placeholder="Your work address"
              error={errors.workAddress}
            />
          </Field>
        </>
      )}
    </FormCard>
  );
}

// ─── Step 3: Rental History ────────────────────────────────────────────────────

function Step3({ data, errors, onChange }) {
  return (
    <FormCard title="Rental History" subtitle="Help the landlord understand your renting background">
      <Field label="Are you a first-time renter?" required error={errors.firstTimeRenter}>
        <div className="flex gap-3 mt-1">
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange("firstTimeRenter", opt)}
              className={`flex-1 h-11 rounded-xl font-semibold text-sm transition border ${
                data.firstTimeRenter === opt
                  ? "text-white border-transparent"
                  : "bg-[#F5F5F7] text-slate-600 border-slate-200 hover:border-vxr-accent"
              }`}
              style={data.firstTimeRenter === opt
                ? { background: "linear-gradient(135deg,#FF7043,#FF8A80)", border: "none" }
                : undefined}
            >
              {opt}
            </button>
          ))}
        </div>
        {errors.firstTimeRenter && <p className="text-red-500 text-xs mt-1">{errors.firstTimeRenter}</p>}
      </Field>

      {data.firstTimeRenter === "No" && (
        <>
          <Field label="Previous Address" required error={errors.previousAddress}>
            <Textarea
              value={data.previousAddress}
              onChange={(e) => onChange("previousAddress", e.target.value)}
              placeholder="Your previous residential address"
              error={errors.previousAddress}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Rental Duration" required error={errors.rentalDuration}>
              <Select
                value={data.rentalDuration}
                onChange={(e) => onChange("rentalDuration", e.target.value)}
                error={errors.rentalDuration}
              >
                <option value="">Select duration</option>
                <option value="Less than 6 months">Less than 6 months</option>
                <option value="6 months – 1 year">6 months – 1 year</option>
                <option value="1 – 2 years">1 – 2 years</option>
                <option value="2 – 5 years">2 – 5 years</option>
                <option value="5+ years">5+ years</option>
              </Select>
            </Field>

            <Field label="Reason for Leaving" required error={errors.reasonForLeaving}>
              <Input
                value={data.reasonForLeaving}
                onChange={(e) => onChange("reasonForLeaving", e.target.value)}
                placeholder="e.g. Relocation"
                error={errors.reasonForLeaving}
              />
            </Field>

            <Field label="Previous Landlord Name" required error={errors.landlordName}>
              <Input
                value={data.landlordName}
                onChange={(e) => onChange("landlordName", e.target.value)}
                placeholder="Landlord's full name"
                error={errors.landlordName}
              />
            </Field>

            <Field label="Landlord Contact" required error={errors.landlordPhone}>
              <Input
                type="tel"
                value={data.landlordPhone}
                onChange={(e) => onChange("landlordPhone", e.target.value)}
                placeholder="+63 912 345 6789"
                error={errors.landlordPhone}
              />
            </Field>
          </div>
        </>
      )}
    </FormCard>
  );
}

// ─── Step 4: Proof of Income ──────────────────────────────────────────────────

function Step4({ docs, errors, setDoc }) {
  return (
    <FormCard
      title="Proof of Income"
      subtitle="Help the landlord assess affordability"
    >
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 mb-2">
        Your government-issued ID has already been verified during identity
        verification — no need to upload it again here.
      </div>

      <FileUploadCard
        label="Proof of Income"
        required
        hint="Payslip, COE, or bank statement (last 3 months) · JPG, PNG, or PDF"
        file={docs.proofOfIncome}
        error={errors.proofOfIncome}
        onChange={(file) => setDoc("proofOfIncome", file)}
      />
    </FormCard>
  );
}

function FileUploadCard({ label, required, hint, file, error, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onChange(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}

      {file ? (
        <div className={`relative rounded-xl border ${error ? "border-red-400" : "border-slate-200"} overflow-hidden bg-[#F5F5F7]`}>
          {preview ? (
            <img src={preview} alt={label} className="w-full max-h-40 object-contain py-3" />
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <FileText size={20} className="text-vxr-accent flex-shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1">{file.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-red-50 transition"
          >
            <X size={12} className="text-slate-500" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2 transition hover:border-vxr-accent hover:bg-orange-50 ${
            error ? "border-red-400 bg-red-50" : "border-slate-200 bg-[#F5F5F7]"
          }`}
        >
          <Upload size={22} className={error ? "text-red-400" : "text-slate-400"} />
          <span className="text-sm font-medium text-slate-600">Click to upload</span>
          <span className="text-xs text-slate-400">JPG, PNG or PDF</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Step 5: Declaration & Consent ────────────────────────────────────────────

function Step5({ data, errors, onChange, listing, applicantName }) {
  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Declaration text */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Declaration & Consent</h2>
        <p className="text-sm text-slate-500 mb-5">Read carefully before submitting</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed space-y-3 max-h-56 overflow-y-auto">
          <p>
            I, <strong>{applicantName || "[Your Name]"}</strong>, hereby declare that all information provided in this rental application is true, complete, and accurate to the best of my knowledge.
          </p>
          <p>
            I understand that any false, misleading, or incomplete information may result in the rejection of this application or termination of any lease agreement.
          </p>
          <p>
            I consent to the collection, processing, and verification of my personal data — including identity documents and financial records — solely for the purpose of evaluating this rental application, in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).
          </p>
          <p>
            I authorize the landlord or their agents to conduct background checks, verify references, and contact prior landlords or employers as part of the screening process.
          </p>
          {listing && (
            <p>
              Property: <strong>{listing.title}</strong> · Monthly Rent: <strong>₱{(listing.monthlyRent ?? 0).toLocaleString()}</strong>
            </p>
          )}
          <p className="text-slate-500 text-xs">Date: {today}</p>
        </div>
      </div>

      {/* Consent checkboxes */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <ConsentCheckbox
          id="consentIdentity"
          checked={data.consentIdentity}
          onChange={(v) => onChange("consentIdentity", v)}
          error={errors.consentIdentity}
          label="I consent to identity verification and authorize the landlord to verify the documents I have submitted."
        />
        <ConsentCheckbox
          id="consentDataPrivacy"
          checked={data.consentDataPrivacy}
          onChange={(v) => onChange("consentDataPrivacy", v)}
          error={errors.consentDataPrivacy}
          label="I agree to the collection and processing of my personal data in accordance with the Data Privacy Act of 2012."
        />
      </div>
    </div>
  );
}

function ConsentCheckbox({ id, checked, onChange, error, label }) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition ${
          checked ? "border-vxr-accent bg-orange-50" : error ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-vxr-accent"
        }`}
      >
        <button
          type="button"
          id={id}
          role="checkbox"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition ${
            checked ? "bg-vxr-accent border-vxr-accent" : error ? "border-red-400" : "border-slate-300"
          }`}
        >
          {checked && <Check size={11} className="text-white" strokeWidth={3} />}
        </button>
        <span className="text-sm text-slate-700 leading-snug">{label}</span>
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
