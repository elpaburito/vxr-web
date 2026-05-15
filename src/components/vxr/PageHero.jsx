export default function PageHero({ eyebrow, title, subtitle, children, className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-vxr-gradient ${className}`} style={{ padding: '48px 32px' }}>
      <div className="absolute -top-16 -right-16 w-[220px] h-[220px] rounded-full bg-white/10" />
      <div className="absolute -bottom-20 left-[30%] w-[240px] h-[240px] rounded-full bg-white/[0.07]" />
      <div className="relative mx-auto" style={{ maxWidth: 1280 }}>
        {eyebrow && (
          <div className="font-body text-[11px] font-bold uppercase text-white/85 mb-2.5" style={{ letterSpacing: '0.12em' }}>
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-4xl font-extrabold text-white leading-[1.1] tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-2 font-body text-[15px] text-white/85 max-w-2xl">{subtitle}</p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
