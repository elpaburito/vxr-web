import { CheckCircle, AlertCircle, X } from 'lucide-react';

const tones = {
  success: { bg: 'bg-vxr-success-soft', fg: 'text-vxr-success', icon: CheckCircle, border: 'border-vxr-success/20' },
  info:    { bg: 'bg-blue-50',          fg: 'text-blue-600',    icon: AlertCircle, border: 'border-blue-200' },
  warning: { bg: 'bg-vxr-warning-soft', fg: 'text-vxr-warning', icon: AlertCircle, border: 'border-vxr-warning/30' },
  danger:  { bg: 'bg-vxr-danger-soft',  fg: 'text-vxr-danger',  icon: AlertCircle, border: 'border-vxr-danger/30' },
};

export default function Toast({ tone = 'success', title, message, onDismiss, className = '' }) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-vxr bg-vxr-surface border ${t.border} shadow-vxr-lg max-w-md ${className}`}>
      <div className={`w-9 h-9 rounded-full ${t.bg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={t.fg} />
      </div>
      <div className="flex-1 min-w-0">
        {title && <div className="font-display text-sm font-bold text-vxr-text">{title}</div>}
        {message && <div className="font-body text-xs text-vxr-text-sub mt-0.5">{message}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-vxr-text-muted hover:text-vxr-text">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
