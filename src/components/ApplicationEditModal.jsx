import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Save } from "lucide-react";
import {
  fetchApplicationForTenant,
  updateApplication,
} from "../lib/applicationsService";
import { Modal, Button } from "./vxr";
import { validateApplicationStep } from "../lib/applicationValidation";

const INPUT_CLS =
  "w-full px-3.5 py-2 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md font-body text-sm text-vxr-text outline-none focus:border-vxr-accent transition-colors disabled:opacity-60";

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block font-body text-xs font-semibold text-vxr-text-sub mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-vxr-danger font-body text-xs mt-1">{error}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h4 className="font-display text-sm font-bold text-vxr-text uppercase tracking-wider flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-vxr-accent" />
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export default function ApplicationEditModal({
  isOpen,
  applicationId,
  tenantId,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen || !applicationId || !tenantId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApplicationForTenant(applicationId, tenantId).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) setError(err.message || "Could not load application.");
      else if (!data) setError("Application not found.");
      else setFormData(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, applicationId, tenantId]);

  useEffect(() => {
    if (!isOpen) {
      setFormData(null);
      setErrors({});
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  const update = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    if (!formData) return false;
    // Edit modal only re-validates personal info + that employmentStatus is
    // still set. Full employment / rental / consent details aren't gated
    // again here — those were already validated at original submission.
    const e = validateApplicationStep(formData, {}, 1);
    if (!formData.employmentStatus) e.employmentStatus = "Employment status is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const { error: err } = await updateApplication(applicationId, tenantId, formData);
    setSaving(false);
    if (err) {
      setError(err.message || "Could not save changes.");
      return;
    }
    onSaved?.();
    onClose?.();
  };

  const isLocked = formData && formData.status !== "pending";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Edit Application"
      subtitle="Make changes while your application is still pending review."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            icon={saving ? Loader2 : Save}
            disabled={loading || saving || isLocked || !formData}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 font-body text-sm text-vxr-text-sub">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading application…
          </div>
        ) : error && !formData ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertCircle size={22} className="text-vxr-danger" />
            <p className="font-body text-sm text-vxr-text-sub">{error}</p>
          </div>
        ) : formData ? (
          <div className="space-y-6">
            {isLocked && (
              <div className="flex items-start gap-2 p-3 rounded-vxr-md bg-vxr-warning-soft border border-vxr-warning/30 text-vxr-warning font-body text-xs">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>This application is no longer pending and cannot be edited.</span>
              </div>
            )}

            <Section title="Personal Information">
              <Field label="Full Name" error={errors.fullName}>
                <input
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.fullName || ""}
                  onChange={(e) => update("fullName", e.target.value)}
                />
              </Field>
              <Field label="Date of Birth" error={errors.dateOfBirth}>
                <input
                  type="date"
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.dateOfBirth || ""}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                />
              </Field>
              <Field label="Contact Number" error={errors.contactNumber}>
                <input
                  type="tel"
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.contactNumber || ""}
                  onChange={(e) => update("contactNumber", e.target.value)}
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  type="email"
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.email || ""}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Current Address" error={errors.currentAddress}>
                  <textarea
                    rows={2}
                    className={INPUT_CLS}
                    disabled={isLocked}
                    value={formData.currentAddress || ""}
                    onChange={(e) => update("currentAddress", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Employment & Financial">
              <Field label="Employment Status" error={errors.employmentStatus}>
                <select
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.employmentStatus || ""}
                  onChange={(e) => update("employmentStatus", e.target.value)}
                >
                  <option value="">Select status</option>
                  <option value="Employed">Employed</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Student">Student</option>
                  <option value="Unemployed">Unemployed</option>
                  <option value="Retired">Retired</option>
                </select>
              </Field>
              <Field label="Monthly Income (₱)">
                <input
                  type="number"
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.monthlyIncome || ""}
                  onChange={(e) => update("monthlyIncome", e.target.value)}
                />
              </Field>
              <Field label="Job Title">
                <input
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.jobTitle || ""}
                  onChange={(e) => update("jobTitle", e.target.value)}
                />
              </Field>
              <Field label="Company Name">
                <input
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.companyName || ""}
                  onChange={(e) => update("companyName", e.target.value)}
                />
              </Field>
              <Field label="Length of Employment">
                <select
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.lengthOfEmployment || ""}
                  onChange={(e) => update("lengthOfEmployment", e.target.value)}
                >
                  <option value="">Select duration</option>
                  <option value="Less than 6 months">Less than 6 months</option>
                  <option value="6 months - 1 year">6 months - 1 year</option>
                  <option value="1 - 2 years">1 - 2 years</option>
                  <option value="2 - 5 years">2 - 5 years</option>
                  <option value="5+ years">5+ years</option>
                </select>
              </Field>
              <Field label="Work Address">
                <input
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.workAddress || ""}
                  onChange={(e) => update("workAddress", e.target.value)}
                />
              </Field>
            </Section>

            <Section title="Rental History">
              <Field label="Previous Address">
                <input
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.previousAddress || ""}
                  onChange={(e) => update("previousAddress", e.target.value)}
                />
              </Field>
              <Field label="Rental Duration">
                <input
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.rentalDuration || ""}
                  onChange={(e) => update("rentalDuration", e.target.value)}
                  placeholder="e.g., 2 years"
                />
              </Field>
              <Field label="Previous Landlord Name">
                <input
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.landlordName || ""}
                  onChange={(e) => update("landlordName", e.target.value)}
                />
              </Field>
              <Field label="Previous Landlord Phone">
                <input
                  type="tel"
                  className={INPUT_CLS}
                  disabled={isLocked}
                  value={formData.landlordPhone || ""}
                  onChange={(e) => update("landlordPhone", e.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Reason for Leaving">
                  <input
                    className={INPUT_CLS}
                    disabled={isLocked}
                    value={formData.reasonForLeaving || ""}
                    onChange={(e) => update("reasonForLeaving", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Declaration">
              <div className="md:col-span-2">
                <label className="flex items-start gap-3 cursor-pointer font-body text-sm text-vxr-text">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={!!formData.consentIdentity}
                    onChange={(e) => update("consentIdentity", e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-vxr-accent"
                  />
                  I confirm that all information provided is accurate and consent to
                  identity verification.
                </label>
              </div>
            </Section>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-vxr-md bg-vxr-danger-soft border border-vxr-danger/20 text-vxr-danger font-body text-xs">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
