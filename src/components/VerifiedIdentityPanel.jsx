import { ShieldCheck } from "lucide-react";
import { Badge } from "./vxr";
import { getIdTypeDisplayName } from "../lib/verificationService.js";

/**
 * Landlord-side read-only panel showing the PII-safe identity data of a
 * verified tenant. Renders nothing when no verification data is attached.
 *
 * Expected shape on `data` (see applicationsService.fetchLandlordApplications):
 *   {
 *     id_type, extracted_name, extracted_id_number_masked,
 *     extracted_dob, processed_at,
 *   }
 *
 * Raw ID images are intentionally NOT shown — they stay in the private
 * verifications bucket, readable only by the owner and admins.
 */
export default function VerifiedIdentityPanel({ data }) {
  if (!data) return null;

  const date = data.processed_at
    ? new Date(data.processed_at).toLocaleDateString("en-PH", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
          Verified identity
        </div>
        <Badge tone="success" icon={ShieldCheck}>
          Identity Verified
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Field label="ID Type"     value={getIdTypeDisplayName(data.id_type)} />
        <Field label="Full Name"   value={data.extracted_name || "—"} />
        <Field label="ID Number"   value={data.extracted_id_number_masked || "—"} mono />
        <Field label="Date of Birth" value={data.extracted_dob || "—"} />
        {date && (
          <div className="sm:col-span-2">
            <Field label="Verified On" value={date} />
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-4">
        This information was extracted from a government-issued ID and verified
        by our AI system. Raw ID images are not shared.
      </p>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
        {label}
      </div>
      <div className={`text-sm font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
