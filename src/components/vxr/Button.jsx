const variants = {
  primary: 'bg-vxr-gradient text-white shadow-vxr-cta hover:brightness-105 active:brightness-95',
  secondary: 'bg-white text-vxr-text border border-vxr-border shadow-vxr-sm hover:border-vxr-border-strong hover:shadow-vxr-md',
  ghost: 'bg-transparent text-vxr-accent hover:bg-vxr-accent-soft',
  danger: 'bg-vxr-danger text-white shadow-[0_4px_12px_-2px_rgba(239,68,68,0.4)] hover:brightness-110',
  success: 'bg-vxr-success text-white shadow-[0_4px_12px_-2px_rgba(34,197,94,0.4)] hover:brightness-110',
};

const sizes = {
  sm: 'px-3.5 py-2 text-[13px] gap-1.5 rounded-vxr-md',
  md: 'px-5 py-3 text-sm gap-2 rounded-vxr',
  lg: 'px-7 py-4 text-[15px] gap-2.5 rounded-vxr',
};

const iconSizes = { sm: 14, md: 16, lg: 18 };

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  children,
  fullWidth,
  disabled,
  className = '',
  ...rest
}) {
  return (
    <button
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center whitespace-nowrap',
        'font-display font-bold tracking-tight',
        'transition-all duration-150 ease-vxr-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {Icon && <Icon size={iconSizes[size]} />}
      {children}
      {IconRight && <IconRight size={iconSizes[size]} />}
    </button>
  );
}
