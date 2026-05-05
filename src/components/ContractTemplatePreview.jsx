import { useEffect, useMemo, useRef, useState } from "react";
import { X, Download, Printer, Loader2 } from "lucide-react";
import {
  defaultTermsForType,
  resolveTerms,
  contractTitleForType,
  isLeaseType,
} from "../lib/contractTemplates";

// Brand palettes lifted from the supplied PDF templates so the preview
// matches what the tenant will actually sign.
//   Lease (fixed-term) → navy header, soft blue rows.
//   Rent (month-to-month) → forest green header, soft green rows.
const LEASE_THEME = {
  header:    "#1F3B5C", // dark navy
  accent:    "#1F3B5C",
  rowBg:     "#E9EFF6",
  rowAlt:    "#DCE5F0",
  divider:   "#1F3B5C",
};
const RENT_THEME = {
  header:    "#1E4D2E", // dark forest green
  accent:    "#1E4D2E",
  rowBg:     "#E5F1E9",
  rowAlt:    "#D6E8DC",
  divider:   "#1E4D2E",
};

const INK   = "#1A1A2E";
const MUTED = "#6B7280";

function fmtMoney(n, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return `PHP ${v.toLocaleString()}`;
}

function fmtDate(iso, fallback) {
  if (!iso) return fallback;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  } catch { return iso; }
}

function joinAddress(formData) {
  return [formData?.address, formData?.barangay, formData?.city, formData?.province]
    .filter(Boolean).join(", ");
}

function leaseEndDate(formData) {
  const start = formData?.availableFrom;
  const months = Number(formData?.leaseTerm);
  if (!start || !Number.isFinite(months) || months <= 0) return null;
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Read-only preview of the in-app default contract template. Layout
 * mirrors the official ViewxRent PDF templates: a coloured banner, a
 * "Parties & Property Details" two-column table, the numbered terms,
 * and a signature block. Empty form fields render as bracketed
 * placeholders ([Landlord Full Name], etc.) just like the PDF.
 */
export default function ContractTemplatePreview({ formData, hostName, onClose }) {
  const printRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const isLease = isLeaseType(formData?.listingType);
  const type = isLease ? "lease" : "rent";
  const theme = isLease ? LEASE_THEME : RENT_THEME;
  const terms = useMemo(() => resolveTerms(type, formData?.termsOverride), [type, formData?.termsOverride]);
  const title = contractTitleForType(type);
  const contractTypeLabel = isLease ? "FIXED-TERM LEASE" : "MONTH-TO-MONTH RENTAL";

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Build the rows of the Parties & Property Details table. Order
  // matches the PDF; bracketed placeholders fall back when the form
  // hasn't been filled yet so the export still reads as a template.
  const detailRows = useMemo(() => {
    const address = joinAddress(formData) || "[Unit No., Building, Street, City]";
    const propType = formData?.propertyType
      ? formData.propertyType.charAt(0).toUpperCase() + formData.propertyType.slice(1)
      : "[Apartment / House / Condo / Studio]";
    const start = formData?.availability === "immediate"
      ? "Upon move-in"
      : fmtDate(formData?.availableFrom, "[Month DD, YYYY]");
    const monthlyRent = fmtMoney(formData?.monthlyRent, "PHP [Amount in figures]");
    const securityDeposit = fmtMoney(
      formData?.securityDeposit,
      isLease ? "PHP [Amount — typically 1–2 months rent]" : "PHP [Amount — typically 1 month rent]"
    );
    const advance = fmtMoney(
      formData?.advancePayment,
      isLease ? "PHP [Amount — typically 1–2 months]" : "PHP [Amount — typically 1 month]"
    );
    const dueDate  = "[Day of the month, e.g., 5th]";
    const grace    = "[e.g., 5 days after due date]";

    const common = [
      ["LANDLORD / LESSOR",   hostName || formData?.hostName || "[Landlord Full Name]",
       "TENANT / LESSEE",     "[Tenant Full Name]"],
      ["LANDLORD CONTACT",    "[Phone / Email]",
       "TENANT CONTACT",      "[Phone / Email]"],
      ["PROPERTY ADDRESS",    address,
       "PROPERTY TYPE",       propType],
    ];

    if (isLease) {
      const months = Number(formData?.leaseTerm);
      const duration = Number.isFinite(months) && months > 0
        ? `${months} months`
        : "[6 months / 12 months / 24 months]";
      const endDate = fmtDate(leaseEndDate(formData), "[Month DD, YYYY]");
      return [
        ...common,
        ["LEASE START DATE",     start,
         "LEASE END DATE",       endDate],
        ["LEASE DURATION",       duration,
         "MONTHLY RENT (PHP)",   monthlyRent],
        ["SECURITY DEPOSIT (PHP)", securityDeposit,
         "ADVANCE RENT (PHP)",     advance],
        ["PAYMENT DUE DATE",     dueDate,
         "GRACE PERIOD",         grace],
      ];
    }

    return [
      ...common,
      ["RENTAL START DATE",      start,
       "INITIAL TERM",           "Month-to-Month (auto-renews)"],
      ["MONTHLY RENT (PHP)",     monthlyRent,
       "SECURITY DEPOSIT (PHP)", securityDeposit],
      ["ADVANCE RENT (PHP)",     advance,
       "PAYMENT DUE DATE",       dueDate],
      ["GRACE PERIOD",           grace,
       "TERMINATION NOTICE",     "30 days written notice by either party"],
    ];
  }, [formData, hostName, isLease]);

  const handleExport = async () => {
    const element = printRef.current;
    if (!element) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const safeName = (formData?.title || "contract-template")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      html2pdf()
        .set({
          margin: [0.65, 0.65, 0.65, 0.65],
          filename: `${safeName}-contract-template.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(element)
        .save()
        .finally(() => setExporting(false));
    } catch {
      setExporting(false);
      window.print();
    }
  };

  // Inline styles so the print-window export uses the same look without
  // requiring tailwind to be loaded in the popup.
  const sX = {
    banner:  { background: theme.header, color: "#fff", padding: "22px 28px 16px", borderRadius: "12px 12px 0 0" },
    title:   { fontSize: 22, textAlign: "center", margin: "0 0 14px", letterSpacing: ".02em", fontWeight: 800 },
    metaRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, gap: 16, flexWrap: "wrap" },
    rule:    { height: 2, background: theme.divider, margin: 0 },
    h2:      { fontSize: 13, color: theme.accent, textTransform: "uppercase", letterSpacing: ".06em", margin: "22px 0 10px", fontWeight: 700 },
    cell:    { verticalAlign: "top", padding: "10px 14px", width: "50%", fontSize: 12.5 },
    lbl:     { display: "block", color: theme.accent, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 },
    val:     { display: "block", color: INK },
    sigLine: { borderTop: `1.5px solid ${INK}`, paddingTop: 6, textAlign: "center", color: MUTED, marginTop: 48 },
    notary:  { marginTop: 18, padding: "12px 14px", border: "1px solid #C7CDD6", background: "#F8FAFC", fontSize: 11.5, color: INK, lineHeight: 1.6, borderRadius: 4 },
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full"
        style={{ maxHeight: "92vh", maxWidth: 880, display: "flex", flexDirection: "column" }}
      >
        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide"
              style={{ background: `${theme.accent}1A`, color: theme.accent }}
            >
              {contractTypeLabel}
            </span>
            <h3 className="text-sm font-semibold text-gray-700">Contract Template Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition hover:opacity-90 disabled:opacity-70"
              style={{ background: theme.accent }}
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {exporting ? "Exporting…" : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Print this preview"
            >
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-800" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable contract body — also used as the print-window source */}
        <div className="overflow-y-auto" style={{ background: "#F4F6FA", padding: 18 }}>
          <div ref={printRef} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(15,23,42,0.06)" }}>
            <div className="banner" style={sX.banner}>
              <h1 style={sX.title}>{title}</h1>
              <div className="meta" style={sX.metaRow}>
                <div className="entered" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>This Agreement is entered into on:</span>
                  <span className="line" style={{ display: "inline-block", borderBottom: "1px solid rgba(255,255,255,0.85)", minWidth: 200, height: 14 }} />
                </div>
                <div style={{ textAlign: "right" }}>
                  CONTRACT TYPE: {contractTypeLabel}
                </div>
              </div>
            </div>

            <div style={{ ...sX.rule }} />

            <div className="wrap" style={{ padding: "4px 28px 28px" }}>
              <h2 style={sX.h2}>Parties &amp; Property Details</h2>
              <table className="details" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, margin: "0 0 6px" }}>
                <tbody>
                  {detailRows.map((row, i) => (
                    <tr key={i} className={`r${i % 2}`}>
                      <td style={{ ...sX.cell, background: i % 2 === 0 ? theme.rowBg : theme.rowAlt }}>
                        <span style={sX.lbl}>{row[0]}</span>
                        <span style={sX.val}>{row[1]}</span>
                      </td>
                      <td style={{ ...sX.cell, background: i % 2 === 0 ? theme.rowBg : theme.rowAlt }}>
                        <span style={sX.lbl}>{row[2]}</span>
                        <span style={sX.val}>{row[3]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ ...sX.rule, marginTop: 22 }} />

              <h2 style={sX.h2}>Terms and Conditions</h2>
              {terms.map((raw, i) => {
                // Each term starts with "N. TITLE — body". Split for the
                // PDF look (bold heading line, body paragraph below).
                const m = raw.match(/^\s*\d+\.\s*([^—]+?)\s*—\s*(.+)$/s);
                const heading = m ? m[1].trim() : `Section ${i + 1}`;
                const body    = m ? m[2].trim() : raw;
                return (
                  <div key={i} className="term-block" style={{ marginBottom: 12 }}>
                    <div className="term-title" style={{ fontWeight: 700, color: theme.accent, fontSize: 12, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>
                      {i + 1}. {heading}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, textAlign: "justify", color: INK }}>{body}</p>
                  </div>
                );
              })}

              <div style={{ ...sX.rule, marginTop: 22 }} />

              <h2 style={sX.h2}>Signatures</h2>
              <p className="ack" style={{ fontSize: 11.5, marginTop: 0, color: INK }}>
                {isLease
                  ? "By signing below, both parties acknowledge that they have read, understood, and agreed to all the terms and conditions of this Lease Agreement."
                  : "By signing below, both parties confirm they have read, understood, and agree to all terms of this Month-to-Month Rental Agreement."}
              </p>

              <div className="sig-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, marginTop: 14 }}>
                <div className="col">
                  <div className="sig-line" style={sX.sigLine}>
                    <span className="role" style={{ fontWeight: 600, color: INK }}>Landlord's Signature</span>
                    <span className="field" style={{ display: "block", color: MUTED, marginTop: 4 }}>Printed Name: _______________________</span>
                    <span className="field" style={{ display: "block", color: MUTED }}>Date: ________________________________</span>
                  </div>
                </div>
                <div className="col">
                  <div className="sig-line" style={sX.sigLine}>
                    <span className="role" style={{ fontWeight: 600, color: INK }}>Tenant's Signature</span>
                    <span className="field" style={{ display: "block", color: MUTED, marginTop: 4 }}>Printed Name: _______________________</span>
                    <span className="field" style={{ display: "block", color: MUTED }}>Date: ________________________________</span>
                  </div>
                </div>
              </div>

              {isLease && (
                <div className="notary" style={sX.notary}>
                  Subscribed and sworn to before me this _____ day of __________, 20___, at
                  ________________________, Philippines. Notary Public: _________________________ Doc. No.
                  _____ Commission Expires: _____________________ Page No. _____ Book No. _____ Series of
                  20___
                </div>
              )}

              <footer style={{ marginTop: 24, paddingTop: 10, borderTop: "1px solid #E5E7EB", textAlign: "center", color: "#9CA3AF", fontSize: 10.5 }}>
                This is a template contract. Consult a licensed attorney before use. Subject to Philippine law including R.A. 9653 (Rent Control Act of 2009).
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
