import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertCircle, Lock,
  Pencil, RefreshCw, Archive, Home, MapPin,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import { supabase } from "./lib/supabase";
import { relistListing, archiveListing } from "./lib/postRentService";
import { Card, Button } from "./components/vxr";
import NotificationBell from "./components/NotificationBell.jsx";

export default function RelistPrompt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [listing, setListing] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [{ data: l, error: lErr }, { data: loc }] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, status, landlord_id")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("listing_locations")
        .select("full_address, city, province")
        .eq("listing_id", id)
        .maybeSingle(),
    ]);
    if (lErr) setError(lErr.message);
    setListing(l ?? null);
    setLocation(loc ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isLandlord =
    listing?.landlord_id && user?.id && listing.landlord_id === user.id;

  const onRelistAsIs = async () => {
    setBusy(true);
    const { error: e } = await relistListing({ listingId: id, mode: "as_is" });
    setBusy(false);
    if (e) {
      alert(e.message);
      return;
    }
    navigate("/my-listings");
  };

  const onEditAndRelist = async () => {
    setBusy(true);
    const { error: e } = await relistListing({ listingId: id, mode: "edit" });
    setBusy(false);
    if (e) {
      alert(e.message);
      return;
    }
    navigate(`/enlist?edit=${id}`);
  };

  const onKeepArchived = async () => {
    setBusy(true);
    const { error: e } = await archiveListing({ listingId: id });
    setBusy(false);
    if (e) {
      alert(e.message);
      return;
    }
    navigate("/my-listings");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vxr-bg">
        <Loader2 className="animate-spin text-vxr-accent" size={32} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 bg-vxr-bg">
        <AlertCircle size={36} className="text-vxr-danger" />
        <p className="font-body text-sm text-center text-vxr-text-sub">
          {error ?? "Listing not found."}
        </p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  if (!isLandlord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 bg-vxr-bg">
        <Lock size={36} className="text-vxr-text-muted" />
        <p className="font-display text-sm font-bold text-vxr-text">Landlord-only</p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const address =
    location?.full_address ||
    [location?.city, location?.province].filter(Boolean).join(", ") ||
    "Address unavailable";

  return (
    <div className="min-h-screen pb-12 bg-vxr-bg">
      <header
        className="sticky top-0 z-10 backdrop-blur-xl border-b border-vxr-border"
        style={{ background: "rgba(247,245,243,0.85)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/my-listings")}
            className="p-2 rounded-vxr-md hover:bg-vxr-surface2 text-vxr-text-sub transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-base font-extrabold text-vxr-text flex-1">
            Ready to relist?
          </h1>
          <NotificationBell framed />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-vxr-md bg-vxr-accent-soft flex items-center justify-center">
              <Home size={20} className="text-vxr-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base font-bold text-vxr-text truncate">
                {listing.title || "Untitled listing"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={12} className="text-vxr-text-muted" />
                <span className="font-body text-xs text-vxr-text-sub truncate">
                  {address}
                </span>
              </div>
              <p className="mt-2 font-body text-[11px] font-bold uppercase tracking-wider text-vxr-text-muted">
                Currently: {listing.status}
              </p>
            </div>
          </div>
        </Card>

        <p className="font-body text-sm leading-relaxed text-vxr-text-sub">
          Your previous tenancy has closed. Choose what to do with this listing.
        </p>

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
      className="w-full text-left bg-vxr-surface rounded-vxr border border-vxr-border shadow-vxr-sm p-4 hover:border-vxr-accent hover:shadow-vxr-md transition disabled:opacity-50"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-vxr-md flex items-center justify-center flex-shrink-0 ${
            primary ? "bg-vxr-gradient shadow-vxr-cta" : "bg-vxr-accent-soft"
          }`}
        >
          {busy ? (
            <Loader2
              size={18}
              className={`animate-spin ${primary ? "text-white" : "text-vxr-accent"}`}
            />
          ) : (
            <Icon
              size={18}
              className={primary ? "text-white" : "text-vxr-accent"}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-bold text-vxr-text">{title}</p>
          <p className="font-body text-xs text-vxr-text-sub mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}
