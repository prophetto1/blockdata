import { useState } from 'react';
import { IconMenu2, IconMoonStars, IconSun } from '@tabler/icons-react';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import './TopCommandBar.css';

type TopCommandBarProps = {
  onToggleNav: () => void;
  shellGuides?: boolean;
}

const UI_THEME_KEY = 'ui-theme';

function resolveIsDark(): boolean {
  if (typeof document === 'undefined') return true;
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(UI_THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
      return stored === 'dark';
    }
  }

  return true;
}

export function TopCommandBar({
  onToggleNav,
  shellGuides = false,
}: TopCommandBarProps) {
  const { center, shellTopSlots } = useHeaderCenter();
  const [isDark, setIsDark] = useState(resolveIsDark);

  const toggleColorScheme = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem(UI_THEME_KEY, next);
    setIsDark((current) => !current);
  };

  const className = `top-command-bar${shellGuides ? ' top-command-bar--shell-guides' : ' top-command-bar--minimal'}`;
  const leftNode = shellTopSlots?.left ?? null;
  const middleNode = shellGuides ? (shellTopSlots?.middle ?? null) : center;
  const rightNode = shellTopSlots?.right ?? null;
  const showRightSlot = shellGuides || Boolean(shellTopSlots?.showRightInMinimal);

  return (
    <div
      className={className}
    >
      <div className="top-command-bar-left">
        <button
          type="button"
          aria-label="Toggle navigation"
          title="Toggle navigation"
          onClick={onToggleNav}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        >
          <IconMenu2 size={18} />
        </button>
        {shellGuides ? leftNode : null}
      </div>
      <div className="top-command-bar-center">
        {middleNode}
      </div>
      <div className="top-command-bar-right">
        <div className="top-command-bar-right-content">
          {showRightSlot ? (
            <div className="top-command-bar-right-slot">
              {rightNode}
            </div>
          ) : null}
          <button
            type="button"
            className="top-command-bar-theme-toggle inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Toggle color scheme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleColorScheme}
          >
            {isDark ? <IconSun size={20} /> : <IconMoonStars size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
