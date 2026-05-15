import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Fullscreen carousel modal for viewing listing images.
 *
 * Props:
 *   images       — string[] of image URLs
 *   index        — number | null. null means closed.
 *   onClose      — () => void
 *   onNavigate   — (newIndex: number) => void
 */
export default function ImageLightbox({ images, index, onClose, onNavigate }) {
  const open = typeof index === "number" && images?.length > 0;
  const count = images?.length ?? 0;
  const clamped = open ? Math.max(0, Math.min(index, count - 1)) : 0;

  const goPrev = useCallback(() => {
    if (!open) return;
    onNavigate(clamped === 0 ? count - 1 : clamped - 1);
  }, [open, clamped, count, onNavigate]);

  const goNext = useCallback(() => {
    if (!open) return;
    onNavigate(clamped === count - 1 ? 0 : clamped + 1);
  }, [open, clamped, count, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, goPrev, goNext]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Touch swipe support
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-vxr-text/95 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium tabular-nums">
          {clamped + 1} <span className="text-white/50">/ {count}</span>
        </span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Stage */}
      <div
        className="flex-1 flex items-center justify-center px-2 md:px-16 relative"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {count > 1 && (
          <button
            onClick={goPrev}
            className="absolute left-3 md:left-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition z-10"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <img
          src={images[clamped]}
          alt=""
          className="max-w-full max-h-[78vh] object-contain select-none shadow-2xl"
          draggable={false}
          loading="eager"
        />

        {count > 1 && (
          <button
            onClick={goNext}
            className="absolute right-3 md:right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition z-10"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <div
          className="py-4 px-4 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 justify-center min-w-min">
            {images.map((url, i) => (
              <button
                key={`${url}-${i}`}
                onClick={() => onNavigate(i)}
                className={`flex-shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition ${
                  i === clamped
                    ? "border-white opacity-100"
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
                aria-label={`Go to image ${i + 1}`}
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
