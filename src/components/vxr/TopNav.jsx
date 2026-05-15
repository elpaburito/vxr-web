import { Bell, ArrowRight } from 'lucide-react';
import Logo from './Logo';
import Button from './Button';
import Avatar from './Avatar';

export default function TopNav({ items, active, onNav, user, onSignIn, onSignUp, className = '' }) {
  return (
    <header className={`sticky top-0 z-50 backdrop-blur-xl border-b border-vxr-border ${className}`} style={{ background: 'rgba(247,245,243,0.85)' }}>
      <nav className="max-w-7xl mx-auto px-8 flex items-center justify-between" style={{ height: 72 }}>
        <Logo size={36} onClick={() => onNav?.('home')} />
        {items && (
          <div className="hidden md:flex items-center gap-1">
            {items.map(item => (
              <a key={item.id}
                onClick={() => onNav?.(item.id)}
                className={[
                  'font-body text-[13px] font-semibold px-3.5 py-2 rounded-vxr-md cursor-pointer transition-colors',
                  active === item.id ? 'text-vxr-accent bg-vxr-accent-soft' : 'text-vxr-text-sub hover:text-vxr-text hover:bg-vxr-surface2'
                ].join(' ')}
              >{item.label}</a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button className="rounded-full bg-vxr-surface border border-vxr-border flex items-center justify-center relative" style={{ width: 38, height: 38 }}>
                <Bell size={16} className="text-vxr-text-sub" />
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-vxr-accent border-2 border-white" />
              </button>
              <Avatar name={user.name} gradient size={36} />
            </>
          ) : (
            <>
              <a onClick={onSignIn} className="font-body text-[13px] font-semibold text-vxr-text px-3 py-2 cursor-pointer">Sign in</a>
              <Button size="sm" iconRight={ArrowRight} onClick={onSignUp}>Get started</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
