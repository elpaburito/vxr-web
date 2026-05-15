import { useNavigate } from "react-router-dom";
import { MapPin, Bed, Bath, Square, Edit2, Trash2 } from "lucide-react";
import { Badge, Button } from "./vxr";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23F2F0EE'/><text x='50%25' y='50%25' fill='%23B0A8A2' font-family='sans-serif' font-size='14' text-anchor='middle' dy='.3em'>No image yet</text></svg>";

export function statusBadge(status) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return { tone: "success", label: "Active" };
    case "rented":
      return { tone: "accent", label: "Rented" };
    case "draft":
      return { tone: "warning", label: "Draft" };
    case "pending":
      return { tone: "warning", label: "Pending review" };
    case "archived":
      return { tone: "neutral", label: "Archived" };
    case "rejected":
      return { tone: "danger", label: "Rejected" };
    case "inactive":
      return { tone: "neutral", label: "Inactive" };
    default:
      return { tone: "neutral", label: (status || "Unknown").toUpperCase() };
  }
}

export default function MyListingCard({ listing, onEdit, onDelete }) {
  const navigate = useNavigate();

  const image = listing.img || (listing.images && listing.images[0]) || FALLBACK_IMG;
  const beds = listing.bedrooms || "—";
  const baths = listing.bathrooms || "—";
  const area = listing.area ? `${listing.area}m²` : "—";
  const location =
    listing.location ||
    listing.fullAddress ||
    listing.address ||
    [listing.city, listing.province].filter(Boolean).join(", ") ||
    "No address provided";
  const price = listing.monthlyRent
    ? `₱${parseInt(listing.monthlyRent).toLocaleString()}`
    : listing.price || "₱0";
  const status = statusBadge(listing.status);

  const handleCardClick = () => navigate(`/unit/${listing.id}`);

  return (
    <div
      onClick={handleCardClick}
      className="bg-vxr-surface rounded-vxr border border-vxr-border shadow-vxr-sm overflow-hidden cursor-pointer transition-all duration-200 ease-vxr-out hover:shadow-vxr-lg hover:-translate-y-0.5 group flex flex-col"
    >
      <div
        className="relative bg-vxr-surface2 overflow-hidden"
        style={{ height: 180 }}
      >
        <img
          src={image}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-vxr-out group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="font-display text-[15px] font-bold text-vxr-text tracking-tight truncate">
          {listing.title || "Untitled Listing"}
        </div>
        <div className="flex items-center gap-1 mt-1 text-[11.5px] text-vxr-text-sub truncate">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        <div className="flex justify-between items-center mt-3.5 pt-3.5 border-t border-vxr-border">
          <div className="flex gap-2.5">
            {[[Bed, beds], [Bath, baths], [Square, area]].map(([Ico, v], i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] text-vxr-text-sub"
              >
                <Ico size={11} /> {v}
              </span>
            ))}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-base font-extrabold text-vxr-accent">
              {price}
            </span>
            <span className="text-[11px] text-vxr-text-sub">/mo</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-vxr-border">
          <Button
            variant="secondary"
            size="sm"
            icon={Edit2}
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(listing);
            }}
          >
            Edit
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(listing);
            }}
            className="w-9 h-9 rounded-vxr-md hover:bg-vxr-danger-soft text-vxr-text-sub hover:text-vxr-danger flex items-center justify-center transition-colors shrink-0 border border-vxr-border"
            aria-label="Delete listing"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
