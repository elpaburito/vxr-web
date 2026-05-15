import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  MapPin,
  Building2,
  Users,
  Star,
  AlertCircle,
} from "lucide-react";
import PropertyCard from "./components/PropertyCard.jsx";
import AppHeader from "./components/AppHeader.jsx";
import Footer from "./Footer";
import { useListings } from "./hooks/useListings";
import { PageHero, SearchBar, Card, Button } from "./components/vxr";

function SkeletonCard() {
  return (
    <div className="bg-vxr-surface rounded-vxr overflow-hidden border border-vxr-border animate-pulse">
      <div className="aspect-[4/3] bg-vxr-surface2" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-vxr-surface2 rounded w-3/4" />
        <div className="h-3 bg-vxr-surface3 rounded w-1/2" />
        <div className="h-3 bg-vxr-surface3 rounded w-full" />
      </div>
    </div>
  );
}

function ListingSection({ title, subtitle, data, loading, onSeeAll }) {
  return (
    <section className="py-10 md:py-14 w-full">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-vxr-text tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="font-body text-vxr-text-sub text-sm mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onSeeAll}
            className="font-body text-sm font-semibold flex items-center gap-1 text-vxr-accent hover:opacity-70 transition-opacity shrink-0"
          >
            See all <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-vxr-border rounded-vxr">
            <p className="font-body text-vxr-text-sub text-sm">
              No listings here yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ExploreSection() {
  const navigate = useNavigate();
  const exploreItems = [
    {
      icon: MapPin,
      title: "Popular Locations",
      description: "Top-searched neighborhoods",
      link: "/search",
    },
    {
      icon: Building2,
      title: "New Listings",
      description: "Fresh properties added this week",
      link: "/search?sort=newest",
    },
    {
      icon: Users,
      title: "Host Community",
      description: "Join our growing community of hosts",
      link: "/profile",
    },
    {
      icon: Star,
      title: "Top Rated",
      description: "Highest-rated properties",
      link: "/search?sort=rating",
    },
  ];

  return (
    <section className="py-12 md:py-16 px-4 bg-vxr-surface2/40">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-extrabold text-vxr-text mb-3 tracking-tight">
            Explore ViewxRent
          </h2>
          <p className="font-body text-vxr-text-sub text-lg">
            Find your next home in a few taps
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {exploreItems.map((item, i) => (
            <Card
              key={i}
              hoverable
              onClick={() => navigate(item.link)}
              className="p-6 text-center group"
            >
              <div className="w-14 h-14 rounded-full bg-vxr-accent-soft flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                <item.icon size={26} className="text-vxr-accent" />
              </div>
              <h3 className="font-display text-lg font-bold text-vxr-text mb-2">
                {item.title}
              </h3>
              <p className="font-body text-sm text-vxr-text-sub">
                {item.description}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button
            iconRight={ChevronRight}
            onClick={() => navigate("/search")}
          >
            Start Exploring
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function HomePage2() {
  const navigate = useNavigate();
  const { listings, loading, error } = useListings();
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    navigate("/search", { state: { searchQuery: query } });
  };

  const popular = useMemo(() => {
    return [...listings]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 4);
  }, [listings]);

  const affordable = useMemo(() => {
    return [...listings]
      .filter((l) => l.monthlyRent != null)
      .sort((a, b) => (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0))
      .slice(0, 4);
  }, [listings]);

  const premium = useMemo(() => {
    return [...listings]
      .filter((l) => l.monthlyRent != null)
      .sort((a, b) => (b.monthlyRent ?? 0) - (a.monthlyRent ?? 0))
      .slice(0, 4);
  }, [listings]);

  return (
    <div className="w-full min-h-screen bg-vxr-bg">
      <AppHeader />

      <PageHero
        eyebrow={`${listings.length.toLocaleString()} listings available`}
        title="Find your next home."
        subtitle="Verified rentals across the Philippines — search, compare, and apply in minutes."
      >
        <SearchBar
          placeholder="Search by city or property name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSubmit={handleSearch}
          onFilter={handleSearch}
          className="max-w-2xl"
        />
      </PageHero>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="flex items-start gap-3 bg-vxr-warning-soft border border-vxr-warning/30 rounded-vxr-md px-4 py-3 text-vxr-warning font-body text-sm">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load listings</div>
              <div className="text-xs mt-0.5 opacity-80">
                {error.message || "Please check your connection and try again."}
                {error.message?.includes("listings") &&
                  " Make sure the 'listings' table exists in Supabase."}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <ListingSection
          title="Popular homes"
          subtitle="Top-rated stays picked for you"
          data={popular}
          loading={loading}
          onSeeAll={() => navigate("/search?sort=rating")}
        />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div className="border-t border-vxr-border w-full" />
        </div>

        <ListingSection
          title="Affordable rentals"
          subtitle="Budget-friendly options"
          data={affordable}
          loading={loading}
          onSeeAll={() => navigate("/search?sort=price-asc")}
        />
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <div className="border-t border-vxr-border w-full" />
        </div>

        <ListingSection
          title="Premium spaces"
          subtitle="Luxury stays for the discerning"
          data={premium}
          loading={loading}
          onSeeAll={() => navigate("/search?sort=price-desc")}
        />
      </div>

      <ExploreSection />

      <Footer />
    </div>
  );
}
