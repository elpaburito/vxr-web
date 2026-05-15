export default function Card({ children, className = '', hoverable, ...rest }) {
  return (
    <div
      className={[
        'bg-vxr-surface rounded-vxr border border-vxr-border shadow-vxr-sm',
        hoverable && 'transition-all duration-200 ease-vxr-out hover:shadow-vxr-lg hover:-translate-y-0.5 cursor-pointer',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
