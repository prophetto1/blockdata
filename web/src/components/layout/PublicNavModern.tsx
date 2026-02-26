import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';
import { useIsDark } from '@/lib/useIsDark';

const UI_THEME_KEY = 'ui-theme';

export function PublicNavModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = useIsDark();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleColorScheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem(UI_THEME_KEY, next);
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  const links = [
    { label: 'How it works', to: '/how-it-works' },
    { label: 'Use cases', to: '/use-cases' },
    { label: 'Integrations', to: '/integrations' },
  ];

  return (
    <div
      className="fixed inset-x-0 top-0 z-1000 border-b bg-background"
      style={{ height: 62 }}
    >
      <div className="mx-auto flex h-full items-center justify-between px-4 sm:px-6 md:px-8">
        <button
          type="button"
          className="flex items-center bg-transparent border-none cursor-pointer p-0"
          onClick={() => navigate('/')}
        >
          <span className="text-[21px] font-extrabold" style={{ letterSpacing: '-0.02em' }}>
            BlockData
          </span>
        </button>

        <div className="hidden items-center gap-8 sm:flex">
          {links.map((l) => {
            const isActive = location.pathname === l.to;
            return (
              <button
                key={l.to}
                type="button"
                className="bg-transparent border-none cursor-pointer p-0"
                onClick={() => navigate(l.to)}
              >
                <span
                  className={`text-base font-medium transition-colors ${isActive ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {l.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:inline-flex"
            onClick={toggleColorScheme}
            aria-label="Toggle color scheme"
          >
            {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          {!isLoginPage && (
            <button
              type="button"
              className="hidden bg-transparent border-none cursor-pointer p-0 sm:block"
              onClick={() => navigate('/login')}
            >
              <span className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground">
                Log in
              </span>
            </button>
          )}
          {!isRegisterPage && (
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={() => navigate('/register')}
            >
              Get Started
            </button>
          )}

          {/* Mobile menu */}
          <div className="relative sm:hidden" ref={menuRef}>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Open menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <IconMenu2 size={22} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover p-1 shadow-md">
                {links.map((l) => (
                  <button
                    key={l.to}
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent"
                    onClick={() => { navigate(l.to); setMenuOpen(false); }}
                  >
                    {l.label}
                  </button>
                ))}
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent"
                  onClick={() => { toggleColorScheme(); setMenuOpen(false); }}
                >
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
                {!isLoginPage && (
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent"
                    onClick={() => { navigate('/login'); setMenuOpen(false); }}
                  >
                    Log in
                  </button>
                )}
                {!isRegisterPage && (
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent"
                    onClick={() => { navigate('/register'); setMenuOpen(false); }}
                  >
                    Get Started
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
