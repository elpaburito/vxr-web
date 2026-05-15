import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Plus, Loader2, AlertCircle } from "lucide-react";
import AppHeader from "./components/AppHeader.jsx";
import MyListingCard from "./components/MyListingCard.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { fetchMyListings, deleteListingById } from "./lib/listingsService";
import { PageHero, Button, EmptyState } from "./components/vxr";

export default function MyListings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const loadListings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await fetchMyListings(user.id);
    setListings(data);
    setError(error);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    const { error } = await deleteListingById(id);
    if (error) {
      alert("Failed to delete: " + error.message);
      return;
    }
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-vxr-bg flex items-center justify-center font-body text-vxr-text-sub">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-vxr-bg">
      <AppHeader showBack />

      <PageHero
        eyebrow={`${listings.length} ${listings.length === 1 ? "listing" : "listings"}`}
        title="My listings"
        subtitle="Manage the properties you're renting out."
      >
        <Button icon={Plus} onClick={() => navigate("/enlist")}>
          Create new listing
        </Button>
      </PageHero>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-vxr-warning-soft border border-vxr-warning/30 text-vxr-warning font-body text-sm px-4 py-3 rounded-vxr-md">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load your listings</div>
              <div className="text-xs opacity-90">{error.message}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex items-center justify-center font-body text-vxr-text-sub">
            <Loader2 className="animate-spin mr-2" size={18} />
            Loading your listings...
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No listings yet"
            message="Create your first listing to start renting out your property."
            action={
              <Button icon={Plus} onClick={() => navigate("/enlist")}>
                Create your first listing
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((listing) => (
              <MyListingCard
                key={listing.id}
                listing={listing}
                onEdit={(l) => navigate(`/enlist?edit=${l.id}`)}
                onDelete={(l) => handleDelete(l.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
