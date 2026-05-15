import { Heart, MapPin, Bed, Bath, Square, Star } from 'lucide-react';
import { useState } from 'react';

export default function PropertyCard({
  image, title, location, price, beds, baths, area,
  label, rating, favorited, onTap, onFavorite,
}) {
  const [, setHovering] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onTap}
      className="bg-vxr-surface rounded-vxr border border-vxr-border shadow-vxr-sm overflow-hidden cursor-pointer transition-all duration-200 ease-vxr-out hover:shadow-vxr-lg hover:-translate-y-0.5 group"
    >
      <div className="relative bg-vxr-surface2 overflow-hidden" style={{ height: 200 }}>
        <img
          src={image} alt={title}
          className="w-full h-full object-cover transition-transform duration-300 ease-vxr-out group-hover:scale-105"
        />
        {label && (
          <div className="absolute top-3 left-3 bg-vxr-accent text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            {label}
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onFavorite?.(); }}
          className="absolute top-2.5 right-2.5 rounded-full bg-white/95 backdrop-blur flex items-center justify-center border-none cursor-pointer"
          style={{ width: 34, height: 34 }}
        >
          <Heart size={15} className="text-vxr-accent" fill={favorited ? '#FF7043' : 'none'} />
        </button>
        {rating && (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px] font-bold text-vxr-text">
            <Star size={11} className="text-vxr-accent" fill="#FF7043" />
            {rating}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-display text-[15px] font-bold text-vxr-text tracking-tight truncate">
              {title}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11.5px] text-vxr-text-sub">
              <MapPin size={11} /> {location}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3.5 pt-3.5 border-t border-vxr-border">
          <div className="flex gap-2.5">
            {[[Bed, beds], [Bath, baths], [Square, area]].map(([Ico, v], i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] text-vxr-text-sub">
                <Ico size={11} /> {v}
              </span>
            ))}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display text-base font-extrabold text-vxr-accent">{price}</span>
            <span className="text-[11px] text-vxr-text-sub">/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
