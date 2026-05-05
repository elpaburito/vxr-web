import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, MapPin, Bed, Bath, Square,
  FileText, Eye, Check, X, AlertCircle, Users, ChevronRight,
  Loader2, Inbox, Send, Edit3,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { supabase } from "./lib/supabase";
import ApplicationEditModal from "./components/ApplicationEditModal.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { STATUS_STYLE } from "./data/enlistmentMock";
import {
  fetchLandlordApplications, fetchTenantApplications, updateApplicationStatus,
} from "./lib/applicationsService";
import { fetchMyListings } from "./lib/listingsService";
import { hasUserListings } from "./lib/profileService";
import {
  fetchContractByApplication, createContract, getContractStatus, buildContractFromApplication,
  normalizeContract,
} from "./lib/contractsService";

export default function EnlistmentApplications() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Capability flags
  const [isLandlord, setIsLandlord] = useState(false);
  const [tabKey, setTabKey] = useState("submitted"); // "incoming" | "submitted"

  // View state: "units" → "applications" → "details"
  const [view, setView] = useState("units");
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);

  // Supabase data
  const [units, setUnits] = useState([]);        // landlord's listings
  const [applicants, setApplicants] = useState([]); // all applications for this landlord
  const [tenantApps, setTenantApps] = useState([]); // applications submitted BY this user
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Edit-pending-application modal
  const [editAppId, setEditAppId] = useState(null);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const landlord = await hasUserListings(user.id);
      setIsLandlord(landlord);
      // Default landlord-by-default to incoming, others stay on submitted
      setTabKey(landlord ? "incoming" : "submitted");

      const [listingsResult, landlordAppsResult, tenantAppsResult] = await Promise.all([
        landlord ? fetchMyListings(user.id) : Promise.resolve({ data: [] }),
        landlord ? fetchLandlordApplications(user.id) : Promise.resolve({ data: [] }),
        fetchTenantApplications(user.id),
      ]);
      if (listingsResult.error) throw listingsResult.error;
      if (landlordAppsResult.error) throw landlordAppsResult.error;
      if (tenantAppsResult.error) throw tenantAppsResult.error;
      setUnits(listingsResult.data ?? []);
      setApplicants(landlordAppsResult.data ?? []);
      setTenantApps(tenantAppsResult.data ?? []);
    } catch (err) {
      setDataError(err?.message || "Failed to load data.");
    } finally {
      setDataLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId);

  // Applicant counts per unit
  const unitsWithCounts = useMemo(
    () =>
      units.map((u) => ({
        ...u,
        // Normalize to the shape the UI components expect
        beds:  u.bedrooms ?? 0,
        baths: u.bathrooms ?? 0,
        size:  u.squareMeters ? `${u.squareMeters}m²` : "—",
        image: u.cover ?? u.img ?? null,
        price: u.monthlyRent ?? 0,
        applicantCount: applicants.filter((a) => a.listing_id === u.id).length,
      })),
    [units, applicants]
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

  const handleUpdateStatus = async (id, status) => {
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await updateApplicationStatus(id, status);
  };

  const showLandlordFlow = isLandlord && tabKey === "incoming";

  const headerTitle = showLandlordFlow
    ? (view === "units" ? "Applicants"
      : view === "applications" ? "Applications"
      : "Application Details")
    : "My Applications";

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
        {dataLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading…
          </div>
        ) : dataError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-500">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm">{dataError}</p>
            <button onClick={loadData} className="text-xs text-[#EC6138] underline">Retry</button>
          </div>
        ) : (
          <>
            {/* Role tabs — only when both modes are useful */}
            {isLandlord && view === "units" && (
              <RoleTabs
                tabKey={tabKey}
                onChange={(k) => { setTabKey(k); setView("units"); }}
                incomingCount={applicants.length}
                submittedCount={tenantApps.length}
              />
            )}

            {showLandlordFlow ? (
              <>
                {view === "units" && (
                  <UnitsView units={unitsWithCounts} onOpen={goToApplications} />
                )}
                {view === "applications" && selectedUnit && (
                  <ApplicationsView
                    unit={unitsWithCounts.find(u => u.id === selectedUnitId)}
                    applicants={applicants
                      .filter((a) => a.listing_id === selectedUnit.id)
                      .map((a) => ({
                        ...a,
                        name: [a.first_name, a.last_name].filter(Boolean).join(" ") || "Applicant",
                        applied: a.created_at ? new Date(a.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—",
                      }))}
                    onView={goToDetails}
                  />
                )}
                {view === "details" && selectedApplicant && (
                  <DetailsView
                    applicant={{
                      ...selectedApplicant,
                      name: [selectedApplicant.first_name, selectedApplicant.last_name].filter(Boolean).join(" ") || "Applicant",
                      applied: selectedApplicant.created_at
                        ? new Date(selectedApplicant.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                        : "—",
                    }}
                    currentUser={{ id: user?.id, profile }}
                    onApprove={() => handleUpdateStatus(selectedApplicant.id, "approved")}
                    onReject={() => handleUpdateStatus(selectedApplicant.id, "rejected")}
                  />
                )}
              </>
            ) : (
              <TenantApplicationsView
                applications={tenantApps}
                onBrowse={() => navigate("/home2")}
                onEdit={(id) => setEditAppId(id)}
              />
            )}
          </>
        )}
      </main>

      <ApplicationEditModal
        isOpen={!!editAppId}
        applicationId={editAppId}
        tenantId={user?.id}
        onClose={() => setEditAppId(null)}
        onSaved={loadData}
      />
    </div>
  );
}

// ============================================================================
// Role tabs (visible only when the user is both landlord and tenant)
// ============================================================================

function RoleTabs({ tabKey, onChange, incomingCount, submittedCount }) {
  const tabs = [
    { key: "incoming",  label: "Incoming",  Icon: Inbox, count: incomingCount  },
    { key: "submitted", label: "Submitted", Icon: Send,  count: submittedCount },
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-1 grid grid-cols-2 mb-5 shadow-sm max-w-md">
      {tabs.map(({ key, label, Icon, count }) => {
        const active = tabKey === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              active ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
            }`}
            style={active ? { boxShadow: "0 2px 8px rgba(0,0,0,0.07)" } : undefined}
          >
            <Icon size={14} />
            {label}
            <span
              className={`text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center ${
                active ? "bg-[#EC6138] text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tenant view — applications submitted by the current user
// ============================================================================

const CONTRACT_CTA = {
  awaiting_tenant:   { label: "Sign contract",       go: (id) => `/contract/${id}` },
  awaiting_landlord: { label: "Awaiting landlord",   go: (id) => `/contract/${id}` },
  fully_signed:      { label: "Proceed to payment",  go: ()   => `/my-payments` },
  paid:              { label: "View active rental",  go: ()   => `/my-rental` },
  cancelled:         { label: "View contract",       go: (id) => `/contract/${id}` },
};

function TenantApplicationsView({ applications, onBrowse, onEdit }) {
  const navigate = useNavigate();
  const [statusTab, setStatusTab] = useState("pending");

  // Group applications by status so the Submitted tab mirrors the
  // landlord's Incoming view (Pending / Approved / Rejected).
  const counts = {
    pending:  applications.filter((a) => (a.status ?? "pending") === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };
  const filtered = applications.filter((a) => (a.status ?? "pending") === statusTab);

  if (applications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={Send}
          title="You haven't applied yet"
          subtitle="Browse listings to submit your first rental application."
        />
        <div className="text-center mt-4">
          <button
            onClick={onBrowse}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
          >
            Browse listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Applications</h1>
      <p className="text-sm text-slate-500 -mt-1 mb-3">
        Track every rental you've applied to — pending, approved, and rejected.
      </p>

      {/* Status sub-tabs */}
      <div className="inline-flex bg-slate-100 rounded-full p-1 mb-1">
        {["pending", "approved", "rejected"].map((key) => {
          const active = statusTab === key;
          const labelMap = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
          return (
            <button
              key={key}
              onClick={() => setStatusTab(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {labelMap[key]}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-slate-100 text-slate-600" : "bg-white text-slate-400"}`}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={`No ${statusTab} applications`}
          subtitle={
            statusTab === "pending"
              ? "Applications you submit will appear here while landlords review them."
              : statusTab === "approved"
                ? "Approved applications will appear here once a landlord accepts you."
                : "Rejected applications will appear here."
          }
        />
      )}

      {filtered.map((app) => {
        const status = (app.status ?? "pending").toLowerCase();
        const style  = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
        const listing = app.listings ?? {};
        const contract = Array.isArray(app.contract) ? app.contract[0] : app.contract;
        const cta = contract?.id ? CONTRACT_CTA[contract.status] : null;
        const applied = app.submitted_at || app.created_at;

        return (
          <div
            key={app.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden">
              {listing.cover_photo_url
                ? <img src={listing.cover_photo_url} alt="" className="w-full h-full object-cover" />
                : <Home size={20} className="m-auto mt-4 text-slate-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-[15px] truncate">
                  {listing.title || "Listing"}
                </h3>
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: style.bg, color: style.color }}
                >
                  {style.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Applied {applied ? new Date(applied).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </p>
              {listing.property_type && (
                <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{listing.property_type}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              {listing.id && (
                <button
                  onClick={() => navigate(`/unit/${listing.id}`)}
                  className="text-xs font-semibold text-slate-700 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition"
                >
                  View listing
                </button>
              )}
              {status === "pending" && onEdit && (
                <button
                  onClick={() => onEdit(app.id)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#EC6138] px-3.5 py-1.5 rounded-full border border-[#EC6138]/40 bg-white hover:bg-orange-50 transition"
                >
                  <Edit3 size={12} /> Edit details
                </button>
              )}
              {cta && (
                <button
                  onClick={() => navigate(cta.go(contract.id))}
                  className="text-xs font-semibold text-white px-3.5 py-1.5 rounded-full transition hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
                >
                  {cta.label}
                </button>
              )}
            </div>
          </div>
        );
      })}
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

function DetailsView({ applicant, currentUser, onApprove, onReject }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null); // 'approve' | 'reject' | null
  const [contractLoading, setContractLoading] = useState(false);
  const [contractStatus, setContractStatus] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [signedUrls, setSignedUrls] = useState({}); // doc.url (path) → signed URL
  const [lightboxUrl, setLightboxUrl] = useState(null); // fullscreen image overlay
  const style = STATUS_STYLE[applicant.status] ?? STATUS_STYLE.pending;

  // Generate signed URLs for each document in storage
  useEffect(() => {
    const docs = applicant.application_document ?? [];
    if (docs.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        docs.map(async (d) => {
          const { data, error } = await supabase.storage
            .from("application-documents")
            .createSignedUrl(d.url, 3600);
          return [d.url, error ? null : data?.signedUrl];
        })
      );
      if (!cancelled) setSignedUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [applicant.id, applicant.application_document]);

  // Load contract status for approved applicants
  useEffect(() => {
    if (applicant.status !== "approved") return;
    fetchContractByApplication(applicant.id).then(({ data }) => {
      if (data) {
        setContractId(data.id);
        // Normalize first — the raw row's `payment` join is `[]` (truthy)
        // when no payments exist, which would make getContractStatus
        // incorrectly report "paid".
        setContractStatus(getContractStatus(normalizeContract(data)));
      }
    });
  }, [applicant.id, applicant.status]);

  const handleViewContract = async () => {
    if (contractId) {
      navigate(`/contract/${contractId}`);
      return;
    }
    setContractLoading(true);
    try {
      const payload = buildContractFromApplication(applicant, currentUser);
      const { data, error } = await createContract(payload);
      if (error) { alert("Failed to create contract: " + error.message); return; }
      navigate(`/contract/${data.id}`);
    } finally {
      setContractLoading(false);
    }
  };

  // Build document list from application_document join
  const DOC_LABELS = {
    valid_id_front:  { name: "Valid ID (Front)",  type: "image" },
    valid_id_back:   { name: "Valid ID (Back)",   type: "image" },
    proof_of_income: { name: "Proof of Income",   type: "document" },
  };
  const documents = (applicant.application_document ?? []).map((d) => ({
    name: DOC_LABELS[d.document_type]?.name ?? d.document_type,
    url:  d.url,
    type: DOC_LABELS[d.document_type]?.type ?? "document",
  }));

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
          <Field label="Date of Birth"     value={applicant.date_of_birth   ?? "—"} />
          <Field label="Email"             value={applicant.email            ?? "—"} />
          <Field label="Phone"             value={applicant.phone_number      ?? "—"} />
          <Field label="Applied"           value={applicant.applied          ?? "—"} />
          <div className="sm:col-span-2">
            <Field label="Current Address" value={applicant.current_address  ?? "—"} />
          </div>
        </div>
      </Card>

      {/* Employment */}
      <Card>
        <SectionHead>Employment</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Employment Status"    value={applicant.employment_status     ?? "—"} />
          <Field label="Job Title"            value={applicant.job_title             ?? "—"} />
          <Field label="Company"             value={applicant.company_name           ?? "—"} />
          <Field label="Monthly Income"      value={applicant.monthly_income != null ? `₱${Number(applicant.monthly_income).toLocaleString()}` : "—"} />
          <Field label="Length of Employment" value={applicant.employment_length     ?? "—"} />
          <Field label="Work Address"        value={applicant.work_address           ?? "—"} />
        </div>
      </Card>

      {/* Rental History */}
      <Card>
        <SectionHead>Rental History</SectionHead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="First-Time Renter"   value={applicant.first_time_renter === false ? "No" : "Yes"} />
          <Field label="Previous Address"    value={applicant.previous_address        ?? "—"} />
          <Field label="Reason for Leaving"  value={applicant.reason_for_leaving      ?? "—"} />
          <Field label="Rental Duration"     value={applicant.stayed_duration         ?? "—"} />
          <Field label="Previous Landlord"   value={applicant.previous_landlord       ?? "—"} />
          <Field label="Landlord Contact"    value={applicant.landlord_contact        ?? "—"} />
        </div>
      </Card>

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <SectionHead>Documents</SectionHead>
          <div className="space-y-4">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.name}
                doc={doc}
                signedUrl={signedUrls[doc.url] ?? null}
                onViewImage={(url) => setLightboxUrl(url)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Lightbox overlay for full-size image */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm font-semibold"
            >
              ✕ Close
            </button>
            <img
              src={lightboxUrl}
              alt="Document"
              className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

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
            onClick={handleViewContract}
            disabled={contractLoading}
            className="w-full h-12 rounded-xl text-white font-semibold transition shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
          >
            {contractLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {contractStatus === "paid"
              ? "View Active Contract"
              : contractStatus === "both_signed"
              ? "Continue to Payment"
              : contractStatus === "pending_tenant"
              ? "Awaiting Tenant Signature"
              : contractStatus === "pending_landlord"
              ? "Sign Contract"
              : contractId
              ? "View Contract"
              : "Create Contract"}
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

function DocumentRow({ doc, signedUrl, onViewImage }) {
  const isImage = doc.type === "image";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
          <FileText size={15} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{doc.name}</div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wide">{doc.type}</div>
        </div>
        {signedUrl ? (
          isImage ? (
            <button
              onClick={() => onViewImage(signedUrl)}
              className="text-xs font-semibold text-slate-700 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              Expand
            </button>
          ) : (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-slate-700 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              View
            </a>
          )
        ) : (
          <span className="text-xs font-semibold text-slate-400 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white cursor-not-allowed">
            {doc.url ? "Loading…" : "No file"}
          </span>
        )}
      </div>

      {/* Image preview — only for ID photos */}
      {isImage && signedUrl && (
        <div
          className="mx-3 mb-3 rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer"
          onClick={() => onViewImage(signedUrl)}
        >
          <img
            src={signedUrl}
            alt={doc.name}
            className="w-full max-h-56 object-contain"
          />
        </div>
      )}
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
