import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertCircle, Lock,
  Pencil, RefreshCw, Archive, Home, MapPin,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import { supabase } from "./lib/supabase";
import { relistListing, archiveListing } from "./lib/postRentService";

const BRAND  = "#F36C6C";
const INK    = "#101321";
const MUTED  = "#6B7280";
const BG     = "#FAF7F6";
const BORDER = "#EFE7E5";

export default function RelistPrompt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [listing, setListing] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [{ data: l, error: lErr }, { data: loc }] = await Promise.all([
      supabase.from("listings").select("id, title, status, landlord_id").eq("id", id).maybeSingle(),
      supabase.from("listing_locations").select("full_address, city, province").eq("listing_id", id).maybeSingle(),
    ]);
    if (lErr) setError(lErr.message);
    setListing(l ?? null);
    setLocation(loc ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isLandlord = listing?.landlord_id && user?.id && listing.landlord_id === user.id;

  const onRelistAsIs = async () => {
    setBusy(true);
    const { error: e } = await relistListing({ listingId: id, mode: "as_is" });
    setBusy(false);
    if (e) { alert(e.message); return; }
    navigate("/my-listings");
  };

  const onEditAndRelist = async () => {
    setBusy(true);
    const { error: e } = await relistListing({ listingId: id, mode: "edit" });
    setBusy(false);
    if (e) { alert(e.message); return; }
    navigate(`/enlist?edit=${id}`);
  };

  const onKeepArchived = async () => {
    setBusy(true);
    const { error: e } = await archiveListing({ listingId: id });
    setBusy(false);
    if (e) { alert(e.message); return; }
    navigate("/my-listings");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin" size={32} color={BRAND} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: BG }}>
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-sm text-center" style={{ color: MUTED }}>{error ?? "Listing not found."}</p>
        <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: BRAND }}>Go back</button>
      </div>
    );
  }

  if (!isLandlord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6" style={{ background: BG }}>
        <Lock size={36} className="text-slate-400" />
        <p className="text-sm font-semibold" style={{ color: INK }}>Landlord-only</p>
        <button onClick={() => navigate(-1)} className="text-sm underline" style={{ color: BRAND }}>Go back</button>
      </div>
    );
  }

  const address = location?.full_address ||
    [location?.city, location?.province].filter(Boolean).join(", ") ||
    "Address unavailable";

  return (
    <div className="min-h-screen pb-12" style={{ background: BG }}>
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: BORDER }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/my-listings")} className="p-2 rounded-xl hover:bg-slate-100">
            <ArrowLeft size={20} style={{ color: INK }} />
          </button>
          <h1 className="text-base font-bold" style={{ color: INK }}>Ready to relist?</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">

        {/* Listing summary */}
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: BORDER }}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${BRAND}1A` }}>
              <Home size={20} color={BRAND} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate" style={{ color: INK }}>{listing.title || "Untitled listing"}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={12} color={MUTED} />
                <span className="text-[12px] truncate" style={{ color: MUTED }}>{address}</span>
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                Currently: {listing.status}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
          Your previous tenancy has closed. Choose what to do with this listing.
        </p>

        {/* Choice buttons */}
        <div className="space-y-3">
          <ChoiceButton
            icon={Pencil}
            title="Edit & Relist"
            description="Open the listing in the editor — update price, photos, or terms before going live again."
            onClick={onEditAndRelist}
            busy={busy}
            primary
          />
          <ChoiceButton
            icon={RefreshCw}
            title="Relist as-is"
            description="Set the listing back to active immediately with the previous details."
            onClick={onRelistAsIs}
            busy={busy}
          />
          <ChoiceButton
            icon={Archive}
            title="Keep archived"
            description="Leave the listing archived. You can relist anytime from My Listings."
            onClick={onKeepArchived}
            busy={busy}
          />
        </div>
      </div>
    </div>
  );
}

function ChoiceButton({ icon: Icon, title, description, onClick, busy, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="w-full text-left bg-white rounded-2xl p-4 border hover:border-[#F36C6C] transition disabled:opacity-50"
      style={{ borderColor: BORDER }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: primary ? BRAND : `${BRAND}1A` }}
        >
          {busy
            ? <Loader2 size={18} className="animate-spin" color={primary ? "white" : BRAND} />
            : <Icon size={18} color={primary ? "white" : BRAND} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: INK }}>{title}</p>
          <p className="text-[12px] mt-1" style={{ color: MUTED }}>{description}</p>
        </div>
      </div>
    </button>
  );
}
