import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, MapPin, Bed, Bath, Square,
  FileText, Eye, Check, X, AlertCircle, Users, ChevronRight,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  SAMPLE_UNITS, SAMPLE_APPLICANTS, SAMPLE_APPLICATION_DETAILS, STATUS_STYLE,
} from "./data/enlistmentMock";
import { loadContract, getContractStatus } from "./lib/contractStorage";

export default function EnlistmentApplications() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // View state: "units" → "applications" → "details"
  const [view, setView] = useState("units");
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);

  const [applicants, setApplicants] = useState(SAMPLE_APPLICANTS);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  const selectedUnit = SAMPLE_UNITS.find((u) => u.id === selectedUnitId);
  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId);

  // Applicant counts per unit
  const unitsWithCounts = useMemo(
    () =>
      SAMPLE_UNITS.map((u) => ({
        ...u,
        applicantCount: applicants.filter((a) => a.unitId === u.id).length,
      })),
    [applicants]
  );

  const goToApplications = (unitId) => {
    setSelectedUnitId(unitId);
    setView("applications");
  };

  const goToDetails = (applicantId) => {
    setSelectedApplicantId(applicantId);
    setView("details");
  };

  const goBack = () => {
    if (view === "details") {
      setSelectedApplicantId(null);
      setView("applications");
    } else if (view === "applications") {
      setSelectedUnitId(null);
      setView("units");
    } else {
      navigate(-1);
    }
  };

  const updateStatus = (id, status) => {
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const headerTitle =
    view === "units" ? "Applicants"
    : view === "applications" ? "Applications"
    : "Application Details";

  return (
    <div className="w-full min-h-screen bg-[#F4F4F6] flex flex-col">
      <Header
        title={headerTitle}
        onBack={goBack}
        navigate={navigate}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        initial={initial}
        isAuthenticated={isAuthenticated}
      />

      <main className="flex-1 max-w-[80rem] w-full mx-auto px-4 lg:px-6 py-6">
        {view === "units" && (
          <UnitsView units={unitsWithCounts} onOpen={goToApplications} />
        )}
        {view === "applications" && selectedUnit && (
          <ApplicationsView
            unit={selectedUnit}
            applicants={applicants.filter((a) => a.unitId === selectedUnit.id)}
            onView={goToDetails}
          />
        )}
        {view === "details" && selectedApplicant && (
          <DetailsView
            applicant={selectedApplicant}
            onApprove={() => updateStatus(selectedApplicant.id, "approved")}
            onReject={() => updateStatus(selectedApplicant.id, "rejected")}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// VIEW 1 — Units list with applicant counts
// ============================================================================

function UnitsView({ units, onOpen }) {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Your Units</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a unit to review its applications.
          </p>
        </div>
        <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full font-medium">
          {units.length} {units.length === 1 ? "unit" : "units"}
        </span>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No units yet"
          subtitle="Create a listing first to start receiving applications."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} onOpen={() => onOpen(unit.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function UnitCard({ unit, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left hover:shadow-xl hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
        <img
          src={unit.image}
          alt={unit.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {unit.applicantCount > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            <Users size={12} />
            {unit.applicantCount}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-900 text-[15px] leading-snug">
            {unit.title}
          </h3>
          <ChevronRight size={16} className="text-slate-400 mt-0.5 flex-shrink-0 group-hover:text-[#EC6138] transition" />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
          <span className="inline-flex items-center gap-1">
            <Bed size={12} />
            {unit.beds} Bed
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath size={12} />
            {unit.baths} Bath
          </span>
          <span className="inline-flex items-center gap-1">
            <Square size={12} />
            {unit.size}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <MapPin size={12} />
          <span className="truncate">{unit.location}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <span className="text-lg font-bold text-[#EC6138]">
              ₱{unit.price.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500">/month</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Applicants ({unit.applicantCount})
          </span>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// VIEW 2 — Applications list with status tabs
// ============================================================================

function ApplicationsView({ unit, applicants, onView }) {
  const [tab, setTab] = useState("pending");

  const filtered = applicants.filter((a) => a.status === tab);
  const counts = {
    pending: applicants.filter((a) => a.status === "pending").length,
    approved: applicants.filter((a) => a.status === "approved").length,
    rejected: applicants.filter((a) => a.status === "rejected").length,
  };

  return (
    <>
      {/* Unit summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 mb-5">
        <img
          src={unit.image}
          alt={unit.title}
          className="w-20 h-20 rounded-xl object-cover bg-slate-100 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900">{unit.title}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin size={12} />
            <span className="truncate">{unit.location}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
            <span className="inline-flex items-center gap-1"><Bed size={12} />{unit.beds}</span>
            <span className="inline-flex items-center gap-1"><Bath size={12} />{unit.baths}</span>
            <span className="inline-flex items-center gap-1"><Square size={12} />{unit.size}</span>
            <span className="text-[#EC6138] font-semibold ml-1">
              ₱{unit.price.toLocaleString()}/mo
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 grid grid-cols-3 mb-5 shadow-sm">
        {["pending", "approved", "rejected"].map((key) => {
          const active = tab === key;
          const labelMap = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              style={active ? { boxShadow: "0 2px 8px rgba(0,0,0,0.07)" } : undefined}
            >
              {labelMap[key]}
              <span
                className={`text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center ${
                  active
                    ? "text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={active ? { backgroundColor: STATUS_STYLE[key].color } : undefined}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`No ${tab} applications`}
          subtitle="Applications will appear here once submitted."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <ApplicantCard
              key={a.id}
              applicant={a}
              onView={() => onView(a.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ApplicantCard({ applicant, onView }) {
  const style = STATUS_STYLE[applicant.status];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] text-white font-bold flex items-center justify-center text-lg flex-shrink-0">
        {applicant.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-slate-900 text-[15px]">{applicant.name}</h3>
          <span
            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: style.bg, color: style.color }}
          >
            {style.label}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Applied: {applicant.applied}</p>
      </div>

      <button
        onClick={onView}
        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90 hover:shadow-md"
        style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
      >
        <Eye size={14} />
        View Application
      </button>
    </div>
  );
}

// ============================================================================
// VIEW 3 — Application details
// ============================================================================

function DetailsView({ applicant, onApprove, onReject }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null); // 'approve' | 'reject' | null
  const data = SAMPLE_APPLICATION_DETAILS;
  const style = STATUS_STYLE[applicant.status];

  // For approved applicants, surface the live contract / payment status from
  // localStorage so the action button reflects what the next step actually is.
  const contract = applicant.status === "approved" ? loadContract(applicant.id) : null;
  const contractStatus = contract ? getContractStatus(contract) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Personal Info */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Applicant
            </div>
            <h2 className="text-xl font-bold text-slate-900">{applicant.name}</h2>
          </div>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: style.bg, color: style.color }}
          >
            {style.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Date of Birth" value={data.dob} />
          <Field label="Email" value={data.email} />
          <Field label="Phone" value={data.phone} />
          <Field label="Applied" value={applicant.applied} />
          <div className="sm:col-span-2">
            <Field label="Current Address" value={data.currentAddress} />
          </div>
        </div>
      </Card>

      {/* Employment */}
      <Card>
        <SectionHead>Employment</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Employment Status" value={data.employmentStatus} />
          <Field label="Job Title" value={data.jobTitle} />
          <Field label="Company" value={data.company} />
          <Field label="Monthly Income" value={data.monthlyIncome} />
          <Field label="Length of Employment" value={data.lengthOfEmployment} />
          <Field label="Work Address" value={data.workAddress} />
        </div>
      </Card>

      {/* Rental History */}
      <Card>
        <SectionHead>Rental History</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Previous Address" value={data.previousAddress} />
          <Field label="Reason for Leaving" value={data.reasonForLeaving} />
          <Field label="Rental Duration" value={data.rentalDuration} />
          <Field label="Previous Landlord" value={data.previousLandlord} />
          <Field label="Landlord Contact" value={data.landlordContact} />
          <Field label="Reason for Leaving" value={data.rentalReasonLeaving} />
        </div>
      </Card>

      {/* Documents */}
      <Card>
        <SectionHead>Documents</SectionHead>
        <div className="space-y-2">
          {data.documents.map((doc) => (
            <DocumentRow key={doc.name} doc={doc} />
          ))}
        </div>
      </Card>

      {/* Action buttons */}
      {applicant.status === "pending" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setConfirm("approve")}
            className="h-12 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Approve Applicant
          </button>
          <button
            onClick={() => setConfirm("reject")}
            className="h-12 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2"
          >
            <X size={16} />
            Reject Applicant
          </button>
        </div>
      ) : applicant.status === "approved" ? (
        <div className="pt-2 space-y-2">
          <button
            onClick={() => navigate(`/contract/${applicant.id}`)}
            className="w-full h-12 rounded-xl text-white font-semibold transition shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
          >
            <FileText size={16} />
            {contractStatus === "paid"
              ? "View Active Contract"
              : contractStatus === "both_signed"
              ? "Continue to Payment"
              : contractStatus === "pending_tenant"
              ? "Awaiting Tenant Signature"
              : contractStatus === "pending_landlord"
              ? "Sign Contract"
              : "View Contract"}
          </button>
          {contractStatus && (
            <ContractStatusHint status={contractStatus} />
          )}
        </div>
      ) : (
        <div className="pt-2">
          <div
            className="h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
            style={{ background: "#E03C3C" }}
          >
            <X size={16} />
            Rejected
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <ConfirmDialog
          intent={confirm}
          applicantName={applicant.name}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === "approve") onApprove();
            else onReject();
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function ContractStatusHint({ status }) {
  const map = {
    draft:            { color: "#475569", bg: "#F1F5F9", label: "Draft contract — not yet sent for signing" },
    pending_landlord: { color: "#E07820", bg: "#FFF0E6", label: "Awaiting landlord signature" },
    pending_tenant:   { color: "#E07820", bg: "#FFF0E6", label: "Awaiting tenant signature" },
    both_signed:      { color: "#1E40AF", bg: "#DBEAFE", label: "Both parties signed — ready for payment" },
    paid:             { color: "#15803D", bg: "#DCFCE7", label: "Payment received — contract active" },
  };
  const m = map[status];
  if (!m) return null;
  return (
    <div
      className="text-[11px] font-semibold px-3 py-1.5 rounded-md text-center"
      style={{ background: m.bg, color: m.color }}
    >
      {m.label}
    </div>
  );
}

function ConfirmDialog({ intent, applicantName, onCancel, onConfirm }) {
  const isApprove = intent === "approve";
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: isApprove ? "#E6F7EE" : "#FFECEC" }}
          >
            <AlertCircle size={22} style={{ color: isApprove ? "#1DB954" : "#E03C3C" }} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Are you sure?</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Are you sure you want to{" "}
            <span className="font-semibold" style={{ color: isApprove ? "#1DB954" : "#E03C3C" }}>
              {isApprove ? "approve" : "reject"}
            </span>{" "}
            <span className="font-semibold text-slate-900">{applicantName}</span>?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onCancel}
            className="h-11 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-lg text-white font-semibold transition hover:opacity-90"
            style={{ background: isApprove ? "#1DB954" : "#E03C3C" }}
          >
            Yes, {isApprove ? "approve" : "reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Reusable bits
// ============================================================================

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6">
      {children}
    </div>
  );
}

function SectionHead({ children }) {
  return (
    <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">
      {children}
    </h3>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-[13.5px] font-semibold text-slate-800 leading-snug">
        {value}
      </div>
    </div>
  );
}

function DocumentRow({ doc }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
        <FileText size={15} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">
          {doc.name}
        </div>
        <div className="text-[11px] text-slate-400 uppercase tracking-wide">
          {doc.type}
        </div>
      </div>
      <button className="text-xs font-semibold text-slate-700 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition">
        View
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#EC6138]/10 to-[#FF8E9E]/10 flex items-center justify-center mb-4">
        <Icon size={28} className="text-[#EC6138]" />
      </div>
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ============================================================================
// Header (matches the brand used across the rest of the app)
// ============================================================================

function Header({ title, onBack, navigate, dropdownOpen, setDropdownOpen, initial, isAuthenticated }) {
  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
      onClick={() => setDropdownOpen(false)}
    >
      <div
        style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.22)",
              border: "none",
              cursor: "pointer",
              width: 36, height: 36, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} color="white" />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-[15px] tracking-wide leading-none">
                {title}
              </span>
              <span className="text-[10px] text-white/70 mt-0.5 font-medium">
                ViewxRent
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <button
            onClick={() => navigate("/home2")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 4,
            }}
          >
            <Home size={22} color="white" />
          </button>

          <button style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 4, position: "relative",
          }}>
            <Bell size={22} color="white" />
            <span style={{
              position: "absolute", top: 2, right: 2,
              width: 8, height: 8, borderRadius: "50%",
              background: "#ff3b30", border: "1.5px solid #f0a090",
            }} />
          </button>

          {isAuthenticated && (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "white", border: "none", cursor: "pointer",
                borderRadius: 999, padding: "5px 14px 5px 6px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #EC6138, #FF8E9E)",
                color: "white", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>
                {initial}
              </div>
              <div style={{
                width: 0, height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "8px solid #222",
              }} />
            </button>
          )}

          {dropdownOpen && <ProfileDropdown />}
        </div>
      </div>
    </nav>
  );
}
