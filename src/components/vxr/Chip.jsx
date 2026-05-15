export default function Chip({ label, active, onClick, icon: Icon, size = 'md', className = '' }) {
  const sizes = {
    sm: 'px-2.5 py-1 text-[11px] gap-1',
    md: 'px-3.5 py-1.5 text-xs gap-1.5',
  };
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center font-body whitespace-nowrap rounded-full border transition-colors duration-150 ease-vxr-out',
        sizes[size],
        active
          ? 'bg-vxr-accent border-vxr-accent text-white font-bold'
          : 'bg-vxr-surface2 border-vxr-border text-vxr-text font-medium hover:border-vxr-border-strong',
        className,
      ].join(' ')}
    >
      {Icon && <Icon size={size === 'sm' ? 11 : 12} />}
      {label}
    </button>
  );
}
