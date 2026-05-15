export default function Avatar({ name = '?', src, size = 40, gradient, className = '' }) {
  const initials = (name || '?')
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div
      className={[
        'rounded-full border-2 border-white shadow-vxr-sm overflow-hidden shrink-0 flex items-center justify-center font-display font-bold',
        gradient ? 'bg-vxr-gradient text-white' : 'bg-vxr-surface2 text-vxr-text',
        className,
      ].join(' ')}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : initials
      }
    </div>
  );
}
