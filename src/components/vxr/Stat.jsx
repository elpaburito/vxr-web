import Card from './Card';

export default function Stat({ label, value, change, icon: Icon, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-vxr-sm bg-vxr-accent-soft flex items-center justify-center">
            <Icon size={15} className="text-vxr-accent" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-extrabold tracking-tight text-vxr-text">{value}</span>
        {change && (
          <span className={`font-mono text-[11px] font-bold ${change.startsWith('+') ? 'text-vxr-success' : 'text-vxr-danger'}`}>{change}</span>
        )}
      </div>
    </Card>
  );
}
