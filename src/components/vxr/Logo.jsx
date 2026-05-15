export default function Logo({ size = 36, withWordmark = true, color = 'gradient', onClick, className = '' }) {
  const isGradient = color === 'gradient';
  const boxStyle = isGradient
    ? 'bg-vxr-gradient shadow-vxr-cta'
    : 'bg-white shadow-vxr-sm';

  return (
    <div onClick={onClick} className={`inline-flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      <div className={`rounded-[28%] flex items-center justify-center ${boxStyle}`} style={{ width: size, height: size }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <path d="M3 9.5L12 3l9 6.5V21H3V9.5z" fill={isGradient ? 'white' : '#FF7043'} />
          <rect x="9" y="14" width="6" height="7" rx="1" fill={isGradient ? 'rgba(255,255,255,0.5)' : 'rgba(255,112,67,0.35)'} />
        </svg>
      </div>
      {withWordmark && (
        <span className={`font-display font-extrabold tracking-tight ${color === 'white' ? 'text-white' : 'text-vxr-text'}`} style={{ fontSize: size * 0.5 }}>
          ViewxRent
        </span>
      )}
    </div>
  );
}
