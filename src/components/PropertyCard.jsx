import { useNavigate } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext.jsx";
import VxrPropertyCard from "./vxr/PropertyCard.jsx";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23F2F0EE'/><text x='50%25' y='50%25' fill='%23B0A8A2' font-family='sans-serif' font-size='14' text-anchor='middle' dy='.3em'>No image yet</text></svg>";

export default function PropertyCard({ property, onView }) {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const liked = isInWishlist(property.id);

  const image = property.img || (property.images && property.images[0]) || FALLBACK_IMG;
  const beds = property.bedrooms || "2";
  const baths = property.bathrooms || "2";
  const area = property.area ? `${property.area}m²` : "25m²";
  const location =
    property.location || property.fullAddress || property.address || "No address provided";
  const price = property.monthlyRent
    ? `₱${parseInt(property.monthlyRent).toLocaleString()}`
    : property.price || "₱0";
  const label = property.type || property.propertyType || null;

  const handleTap = () => {
    if (onView) onView(property.id);
    else navigate(`/unit/${property.id}`);
  };

  return (
    <VxrPropertyCard
      image={image}
      title={property.title || "Untitled Listing"}
      location={location}
      price={price}
      beds={beds}
      baths={baths}
      area={area}
      label={label}
      favorited={liked}
      onTap={handleTap}
      onFavorite={() => toggleWishlist(property)}
    />
  );
}
