const tones = {
  accent:  'bg-vxr-accent-soft text-vxr-accent',
  neutral: 'bg-vxr-surface2 text-vxr-text-sub',
  success: 'bg-vxr-success-soft text-vxr-success',
  warning: 'bg-vxr-warning-soft text-vxr-warning',
  danger:  'bg-vxr-danger-soft text-vxr-danger',
  info:    'bg-blue-100 text-blue-600',
};

export default function Badge({ children, tone = 'accent', icon: Icon, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body font-bold text-[10.5px] uppercase tracking-wider ${tones[tone]} ${className}`}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}
