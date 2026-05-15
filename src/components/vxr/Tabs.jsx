export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-7 border-b border-vxr-border ${className}`} style={{ borderBottomWidth: 1.5 }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id} onClick={() => onChange(tab.id)}
            className={`relative py-3 font-display font-bold text-sm transition-colors duration-150 ${isActive ? 'text-vxr-text' : 'text-vxr-text-sub hover:text-vxr-text'}`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-[1.5px] h-[2.5px] rounded bg-vxr-gradient" />
            )}
          </button>
        );
      })}
    </div>
  );
}
