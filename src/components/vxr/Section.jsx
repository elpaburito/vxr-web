export default function Section({ eyebrow, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-5 ${className}`}>
      <div>
        {eyebrow && (
          <div className="font-body text-[11px] font-bold uppercase text-vxr-accent mb-1.5" style={{ letterSpacing: '0.12em' }}>
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-2xl font-extrabold text-vxr-text leading-tight tracking-tight">{title}</h2>
        {subtitle && (
          <p className="mt-1.5 font-body text-sm text-vxr-text-sub max-w-xl">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
