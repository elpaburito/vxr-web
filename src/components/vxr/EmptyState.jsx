export default function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-vxr-accent-soft flex items-center justify-center mb-4">
          <Icon size={22} className="text-vxr-accent" />
        </div>
      )}
      {title && (
        <h3 className="font-display text-lg font-extrabold text-vxr-text tracking-tight">{title}</h3>
      )}
      {message && (
        <p className="mt-2 font-body text-sm text-vxr-text-sub max-w-sm">{message}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
