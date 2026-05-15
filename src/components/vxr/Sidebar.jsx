import Logo from './Logo';
import Avatar from './Avatar';

export default function Sidebar({ items, active, onNav, user, className = '' }) {
  return (
    <aside className={`w-60 bg-vxr-surface border-r border-vxr-border flex flex-col p-5 shrink-0 ${className}`}>
      <Logo size={32} />
      <nav className="mt-8 flex flex-col gap-1 flex-1">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <a key={item.id}
              onClick={() => onNav?.(item.id)}
              className={[
                'relative flex items-center gap-2.5 px-3 py-2.5 rounded-vxr-md cursor-pointer font-body text-[13.5px] transition-colors',
                isActive
                  ? 'bg-vxr-accent-soft text-vxr-accent font-bold'
                  : 'text-vxr-text-sub hover:text-vxr-text hover:bg-vxr-surface2 font-medium',
              ].join(' ')}
            >
              {isActive && <span className="absolute -left-5 top-2 bottom-2 w-[3px] rounded bg-vxr-accent" />}
              {Icon && <Icon size={16} className={isActive ? 'text-vxr-accent' : 'text-vxr-text-muted'} />}
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-vxr-accent text-white text-[10px] font-bold px-1.5 py-px rounded-full">{item.badge}</span>
              )}
            </a>
          );
        })}
      </nav>
      {user && (
        <div className="mt-5 p-3 rounded-vxr-md bg-vxr-surface2 flex items-center gap-2.5">
          <Avatar name={user.name} gradient size={32} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-xs font-bold text-vxr-text truncate">{user.name}</div>
            <div className="text-[10px] text-vxr-text-sub truncate">{user.email}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
