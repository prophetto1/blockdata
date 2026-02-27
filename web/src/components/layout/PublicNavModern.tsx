import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SegmentGroup } from '@ark-ui/react/segment-group';
import { Swap } from '@ark-ui/react/swap';
import { IconMenu2, IconMoon, IconSun, IconX } from '@tabler/icons-react';
import { useIsDark } from '@/lib/useIsDark';
import { Button } from '@/components/ui/button';

const UI_THEME_KEY = 'ui-theme';

const NAV_LINKS = [
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Use cases', to: '/use-cases' },
  { label: 'Integrations', to: '/integrations' },
];

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
  const activeRoute = NAV_LINKS.find((l) => location.pathname === l.to)?.to;

  return (
    <header className="fixed inset-x-0 top-0 z-1000 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 md:px-8">

        {/* Logo */}
        <button
          type="button"
          className="mr-8 flex shrink-0 items-center border-none bg-transparent p-0 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="text-base font-semibold tracking-tight">
            BlockData
          </span>
        </button>

        {/* Desktop nav — Ark UI SegmentGroup with sliding indicator */}
        <SegmentGroup.Root
          value={activeRoute ?? ''}
          onValueChange={(details) => { if (details.value) navigate(details.value); }}
          className="hidden md:inline-flex relative isolate items-center gap-0.5 rounded-lg border border-border/40 bg-muted/50 p-1"
        >
          <SegmentGroup.Indicator
            className="absolute z-0 rounded-md bg-background shadow-sm"
            style={{
              width: 'var(--width)',
              height: 'var(--height)',
              top: 'var(--top)',
              left: 'var(--left)',
              transitionProperty: 'width, height, left, top',
              transitionDuration: '150ms',
              transitionTimingFunction: 'ease-out',
            }}
          />
          {NAV_LINKS.map((l) => (
            <SegmentGroup.Item
              key={l.to}
              value={l.to}
              className="relative z-1 inline-flex cursor-pointer items-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground select-none transition-colors hover:text-foreground data-[state=checked]:text-foreground"
            >
              <SegmentGroup.ItemText>{l.label}</SegmentGroup.ItemText>
              <SegmentGroup.ItemControl className="hidden" />
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-1">

          {/* Theme toggle — Ark UI Swap */}
          <button
            type="button"
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            onClick={toggleColorScheme}
            aria-label="Toggle color scheme"
          >
            <Swap.Root swap={isDark}>
              <Swap.Indicator
                type="on"
                className="inline-flex data-[state=open]:animate-in data-[state=open]:spin-in-90 data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:spin-out-90 data-[state=closed]:fade-out"
              >
                <IconSun size={16} />
              </Swap.Indicator>
              <Swap.Indicator
                type="off"
                className="inline-flex data-[state=open]:animate-in data-[state=open]:spin-in-[-90deg] data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:spin-out-[-90deg] data-[state=closed]:fade-out"
              >
                <IconMoon size={16} />
              </Swap.Indicator>
            </Swap.Root>
          </button>

          {/* Divider */}
          <div className="mx-2 hidden h-5 w-px bg-border/60 sm:block" />

          {/* Log in */}
          {!isLoginPage && (
            <button
              type="button"
              className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer sm:inline-flex"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
          )}

          {/* CTA */}
          {!isRegisterPage && (
            <Button
              size="sm"
              className="h-9 rounded-lg px-4 text-sm font-medium"
              onClick={() => navigate('/register')}
            >
              Get started
            </Button>
          )}

          {/* Mobile menu */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <Swap.Root swap={menuOpen}>
                <Swap.Indicator type="on" className="inline-flex">
                  <IconX size={18} />
                </Swap.Indicator>
                <Swap.Indicator type="off" className="inline-flex">
                  <IconMenu2 size={18} />
                </Swap.Indicator>
              </Swap.Root>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border/60 bg-popover p-2 shadow-xl">
                {NAV_LINKS.map((l) => (
                  <button
                    key={l.to}
                    type="button"
                    data-current={location.pathname === l.to ? '' : undefined}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-popover-foreground transition-colors hover:bg-accent data-current:text-primary"
                    onClick={() => { navigate(l.to); setMenuOpen(false); }}
                  >
                    {l.label}
                  </button>
                ))}
                <div className="my-2 h-px bg-border/60" />
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-popover-foreground transition-colors hover:bg-accent"
                  onClick={() => { toggleColorScheme(); setMenuOpen(false); }}
                >
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
                {!isLoginPage && (
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-popover-foreground transition-colors hover:bg-accent"
                    onClick={() => { navigate('/login'); setMenuOpen(false); }}
                  >
                    Log in
                  </button>
                )}
                {!isRegisterPage && (
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
                    onClick={() => { navigate('/register'); setMenuOpen(false); }}
                  >
                    Get started
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}