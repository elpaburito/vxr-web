import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./components/vxr";

const EXPLORE_LOCATIONS = [
  "Trece Martires",
  "Dasmariñas",
  "Pasig City",
  "Cavite",
  "Metro Manila",
];

export default function Footer() {
  const navigate = useNavigate();

  const goToLocation = (name) => {
    // Mirrors the homepage search pattern (HomePage2 → SearchPage via
    // navigation state). SearchPage reads location.state.searchQuery into
    // its `where` filter, so the chip lands directly on a filtered list.
    navigate("/search", { state: { searchQuery: name } });
  };

  return (
    <footer className="bg-vxr-surface border-t border-vxr-border pt-12 pb-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-8 border-b border-vxr-border">
          {/* Brand */}
          <div>
            <Logo size={28} />
            <p className="mt-4 font-body text-sm leading-relaxed text-vxr-text-sub max-w-sm">
              Verified rentals across the Philippines — search, apply, and pay
              in minutes.
            </p>
          </div>

          {/* Explore (location chips → /search) */}
          <div>
            <h4 className="font-display text-vxr-text font-bold text-sm mb-4 tracking-wide">
              Explore
            </h4>
            <ul className="space-y-3">
              {EXPLORE_LOCATIONS.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => goToLocation(name)}
                    className="font-body text-sm text-vxr-text-sub hover:text-vxr-text transition-colors"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Help & Legal — points at /profile where the existing Help /
              Privacy / Terms info modals already live. When dedicated
              legal pages exist, swap these targets. */}
          <div>
            <h4 className="font-display text-vxr-text font-bold text-sm mb-4 tracking-wide">
              Help &amp; Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/profile"
                  className="font-body text-sm text-vxr-text-sub hover:text-vxr-text transition-colors"
                >
                  Help &amp; Support
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="font-body text-sm text-vxr-text-sub hover:text-vxr-text transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="font-body text-sm text-vxr-text-sub hover:text-vxr-text transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-vxr-text-muted">
            © {new Date().getFullYear()} ViewxRent. All rights reserved.
          </p>
          <p className="font-body text-xs text-vxr-text-muted">
            Made for renters in the Philippines.
          </p>
        </div>
      </div>
    </footer>
  );
}
