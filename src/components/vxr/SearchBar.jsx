import { Search, SlidersHorizontal } from 'lucide-react';

export default function SearchBar({
  placeholder = 'Search location or property…',
  value, onChange, onFilter, onSubmit, className = '',
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };
  return (
    <div className={`bg-white border border-vxr-border rounded-full pl-5 pr-1.5 py-1.5 flex items-center gap-3 shadow-vxr-md ${className}`}>
      <Search size={16} className="text-vxr-text-muted shrink-0" />
      <input
        type="text" placeholder={placeholder} value={value} onChange={onChange}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent border-none outline-none font-body text-sm text-vxr-text placeholder:text-vxr-text-muted py-2"
      />
      <button
        onClick={onFilter}
        className="bg-vxr-gradient text-white rounded-full px-4 py-2.5 inline-flex items-center gap-1.5 font-display font-bold text-[13px] shadow-vxr-cta hover:brightness-105"
      >
        <SlidersHorizontal size={14} /> Filters
      </button>
    </div>
  );
}
