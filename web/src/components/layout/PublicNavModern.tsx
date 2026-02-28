import { useNavigate, useLocation } from 'react-router-dom';
import { Swap } from '@ark-ui/react/swap';
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useIsDark } from '@/lib/useIsDark';
import { Button } from '@/components/ui/button';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';

const UI_THEME_KEY = 'ui-theme';

export function PublicNavModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = useIsDark();
  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  const toggleColorScheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem(UI_THEME_KEY, next);
  };

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  return (
    <header className="fixed inset-x-0 top-0 z-1000 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 md:px-8">

        {/* Logo */}
        <button
          type="button"
          className="mr-8 flex shrink-0 items-center border-none bg-transparent p-0 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="inline-flex items-baseline text-sm font-semibold uppercase tracking-[0.2em]">
            <span className="text-foreground">Block</span>
            <span className="text-primary">Data</span>
          </span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-1">

          {/* Theme toggle */}
          <button
            type="button"
            className={ICON_STANDARD.utilityTopRight.buttonClass}
            onClick={toggleColorScheme}
            aria-label="Toggle color scheme"
          >
            <Swap.Root swap={isDark}>
              <Swap.Indicator
                type="on"
                className="inline-flex data-[state=open]:animate-in data-[state=open]:spin-in-90 data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:spin-out-90 data-[state=closed]:fade-out"
              >
                <HugeiconsIcon
                  icon={Sun03Icon}
                  size={utilityIconSize}
                  strokeWidth={utilityIconStroke}
                />
              </Swap.Indicator>
              <Swap.Indicator
                type="off"
                className="inline-flex data-[state=open]:animate-in data-[state=open]:spin-in-[-90deg] data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:spin-out-[-90deg] data-[state=closed]:fade-out"
              >
                <HugeiconsIcon
                  icon={Moon02Icon}
                  size={utilityIconSize}
                  strokeWidth={utilityIconStroke}
                />
              </Swap.Indicator>
            </Swap.Root>
          </button>

          {/* Divider */}
          <div className="mx-2 h-5 w-px bg-border/60" />

          {/* Log in */}
          {!isLoginPage && (
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
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
              onClick={() => navigate('/early-access')}
            >
              Get started
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
