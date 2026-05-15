import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Trash2, Loader2, Check } from "lucide-react";
import { useWishlist } from "./context/WishlistContext.jsx";
import PropertyCard from "./components/PropertyCard.jsx";
import AppHeader from "./components/AppHeader.jsx";
import { PageHero, Button, EmptyState } from "./components/vxr";
import Footer from "./Footer.jsx";

export default function Wishlist() {
  const navigate = useNavigate();
  const { wishlist, loading, removeFromWishlist } = useWishlist();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmRemove = async () => {
    if (selectedIds.size === 0) return;
    const ok = window.confirm(
      `Remove ${selectedIds.size} item${selectedIds.size === 1 ? "" : "s"} from your wishlist?`
    );
    if (!ok) return;
    await Promise.all([...selectedIds].map((id) => removeFromWishlist(id)));
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-vxr-bg">
      <AppHeader showBack />

      <PageHero
        eyebrow={`${wishlist.length} saved`}
        title="Your wishlist"
        subtitle="Homes you've saved for later. Tap the heart on any listing to add it here."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {wishlist.length > 0 && (
          <div className="flex items-center justify-end mb-6">
            {selectMode ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={cancelSelect}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  disabled={selectedIds.size === 0}
                  onClick={confirmRemove}
                >
                  Remove ({selectedIds.size})
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={Trash2}
                onClick={enterSelectMode}
              >
                Edit
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 font-body text-vxr-text-sub">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading your saved properties…
          </div>
        ) : wishlist.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No saved homes yet"
            message="Tap the heart on any listing to save it here for later."
            action={
              <Button onClick={() => navigate("/home2")}>Browse homes</Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {wishlist.map((property) => {
              const checked = selectedIds.has(property.id);
              return (
                <div
                  key={property.id}
                  className="relative"
                  onClick={
                    selectMode
                      ? (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSelect(property.id);
                        }
                      : undefined
                  }
                  style={selectMode ? { cursor: "pointer" } : undefined}
                >
                  <PropertyCard
                    property={property}
                    onView={
                      selectMode
                        ? () => toggleSelect(property.id)
                        : () => navigate(`/unit/${property.id}`)
                    }
                  />
                  {selectMode && (
                    <div
                      className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center shadow-vxr-sm z-10 ${
                        checked
                          ? "bg-vxr-accent"
                          : "bg-white/95 border border-vxr-border"
                      }`}
                    >
                      {checked && <Check size={16} className="text-white" />}
                    </div>
                  )}
                  {selectMode && checked && (
                    <div className="absolute inset-0 rounded-vxr pointer-events-none ring-2 ring-vxr-accent" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
