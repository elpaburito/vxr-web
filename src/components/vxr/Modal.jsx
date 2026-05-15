import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', className = '' }) {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-vxr-text/40 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full ${sizes[size]} bg-vxr-surface rounded-vxr-sheet shadow-vxr-lg overflow-hidden ${className}`}
      >
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex-1">
            {title && <h2 className="font-display text-xl font-extrabold text-vxr-text tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-1 font-body text-sm text-vxr-text-sub">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 -mr-1 -mt-1 rounded-full hover:bg-vxr-surface2 flex items-center justify-center text-vxr-text-sub">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-vxr-border bg-vxr-surface2 flex justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
