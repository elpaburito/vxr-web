export default function Input({
  label,
  hint,
  error,
  icon: Icon,
  suffix,
  className = '',
  ...inputProps
}) {
  const borderClass = error
    ? 'border-vxr-danger focus-within:border-vxr-danger'
    : 'border-vxr-border focus-within:border-vxr-accent';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
          {label}
        </label>
      )}
      <div className={`bg-vxr-surface2 border-[1.5px] rounded-vxr-md px-3.5 py-3 flex items-center gap-2.5 transition-colors duration-150 ${borderClass}`}>
        {Icon && <Icon size={16} className="text-vxr-text-muted shrink-0" />}
        <input
          {...inputProps}
          className="flex-1 bg-transparent border-none outline-none font-body text-sm text-vxr-text placeholder:text-vxr-text-muted"
        />
        {suffix}
      </div>
      {(hint || error) && (
        <span className={`text-[11px] font-body ${error ? 'text-vxr-danger' : 'text-vxr-text-muted'}`}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
