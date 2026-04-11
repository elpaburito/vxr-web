import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Star, ImageOff, Bed, Bath, Square } from "lucide-react";
import { useWishlist } from "../context/WishlistContext.jsx";

export default function PropertyCard({ property, onView }) {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [liked, setLiked] = useState(isInWishlist(property.id));

  const handleLike = (e) => {
    e.stopPropagation();
    const newLikedState = !liked;
    setLiked(newLikedState);
    toggleWishlist(property);
  };

  const handleCardClick = () => {
    if (onView) {
      onView(property.id);
    } else {
      navigate(`/unit/${property.id}`);
    }
  };

  const getBedrooms = () => {
    return property.bedrooms || '2';
  };

  const getBathrooms = () => {
    return property.bathrooms || '2';
  };

  const getArea = () => {
    return property.area || '25';
  };

  return (
    <div 
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-gray-100"
      onClick={handleCardClick}
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        {property.img ? (
          <img
            src={property.img}
            alt={property.title}
            className="w-[100%] h-[100%] object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : property.images && property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-[100%] h-[100%] object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-[100%] h-[100%] bg-gray-100 flex flex-col items-center justify-center gap-2">
            <ImageOff size={28} className="text-gray-300" />
            <span className="text-xs text-gray-300">No image yet</span>
          </div>
        )}

        {/* Heart button */}
        <button
          onClick={handleLike}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <Heart
            size={15}
            fill={liked ? "#EC6138" : "none"}
            stroke={liked ? "#EC6138" : "#666"}
            strokeWidth={2}
          />
        </button>

        <div className="absolute bottom-3 left-3">
          <span className="bg-white/90 backdrop-blur text-xs font-medium text-gray-600 px-2 py-1 rounded-full">
            {property.type || `${property.propertyType || 'Property'} · ${property.bedrooms || '1'} bd`}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
            {property.title || 'Untitled Listing'}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={12} fill="#FBBF24" stroke="#FBBF24" />
            <span className="text-xs font-medium text-gray-700">{property.rating || 4.8}</span>
            <span className="text-xs text-gray-400">({property.reviews || 0})</span>
          </div>
        </div>
        
        {/* Address */}
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
          {property.location || property.fullAddress || property.address || 'No address provided'}
        </p>

        {/* Property Details - Bed, Bath, Area */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Bed size={14} className="text-gray-400" />
            <span>{getBedrooms()} {parseInt(getBedrooms()) > 1 ? 'Beds' : 'Bed'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath size={14} className="text-gray-400" />
            <span>{getBathrooms()} {parseInt(getBathrooms()) > 1 ? 'Baths' : 'Bath'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Square size={14} className="text-gray-400" />
            <span>{getArea()}m²</span>
          </div>
        </div>

        {/* Price */}
        <p style={{ color: "#EC6138" }} className="text-sm font-bold mt-2">
          {property.monthlyRent ? `₱${parseInt(property.monthlyRent).toLocaleString()}` : property.price || '₱0'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Per Month</p>
      </div>
    </div>
  );
}