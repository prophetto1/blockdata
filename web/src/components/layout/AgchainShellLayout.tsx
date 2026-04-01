import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AGCHAIN_NAV_SECTIONS } from '@/components/agchain/AgchainLeftNav';
import { AgchainBenchmarkNav } from '@/components/agchain/AgchainBenchmarkNav';
import { AgchainOrganizationSwitcher } from '@/components/agchain/AgchainOrganizationSwitcher';
import { AgchainProjectSwitcher } from '@/components/agchain/AgchainProjectSwitcher';
import { LeftRailShadcn as AgchainChromeRail } from '@/components/shell/LeftRailShadcn';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { styleTokens } from '@/lib/styleTokens';

const AGCHAIN_SIDEBAR_WIDTH_KEY = 'agchain.shell.sidebar_width';
const AGCHAIN_RAIL_2_WIDTH = 224;
const AGCHAIN_HEADER_HEIGHT = styleTokens.shell.headerHeight;
const AGCHAIN_BENCHMARK_DEFINITION_PATH = '/app/agchain/settings/project/benchmark-definition';

function readStoredWidth(): number {
  if (typeof window === 'undefined') return styleTokens.shell.navbarWidth;
  const raw = window.localStorage.getItem(AGCHAIN_SIDEBAR_WIDTH_KEY);
  if (!raw) return styleTokens.shell.navbarWidth;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return styleTokens.shell.navbarWidth;
  return Math.max(styleTokens.shell.navbarMinWidth, Math.min(parsed, styleTokens.shell.navbarMaxWidth));
}

export function AgchainShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => readStoredWidth());
  const isResizingRef = useRef(false);

  const showRail2 = location.pathname === AGCHAIN_BENCHMARK_DEFINITION_PATH;
  const rail1Width = sidebarWidth;
  const totalRailWidth = rail1Width + (showRail2 ? AGCHAIN_RAIL_2_WIDTH : 0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    isResizingRef.current = true;
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(
        styleTokens.shell.navbarMinWidth,
        Math.min(startWidth + delta, styleTokens.shell.navbarMaxWidth),
      );
      setSidebarWidth(nextWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth((current) => {
        window.localStorage.setItem(AGCHAIN_SIDEBAR_WIDTH_KEY, String(current));
        return current;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const mainStyle: CSSProperties = {
    position: 'absolute',
    insetBlockStart: `${AGCHAIN_HEADER_HEIGHT}px`,
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    insetInlineStart: `${totalRailWidth}px`,
    overflow: 'auto',
    backgroundColor: 'var(--background)',
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <header
        data-testid="agchain-top-header"
        style={{
          position: 'fixed',
          insetInlineStart: `${totalRailWidth}px`,
          insetInlineEnd: 0,
          top: 0,
          height: `${AGCHAIN_HEADER_HEIGHT}px`,
          zIndex: 30,
          backgroundColor: 'var(--chrome, var(--background))',
        }}
        >
          <TopCommandBar
            onToggleNav={() => {}}
            hideProjectSwitcher
            hideSearch
          />
        <div
          data-testid="agchain-shell-top-divider"
          aria-hidden
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            bottom: 0,
            height: '1px',
            backgroundColor: 'var(--sidebar-border)',
          }}
        />
      </header>

      <aside
        data-testid="agchain-platform-rail"
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetBlock: 0,
          width: `${rail1Width}px`,
          borderInlineEnd: '1px solid var(--border)',
          backgroundColor: 'var(--chrome, var(--background))',
          zIndex: 20,
        }}
      >
        <AgchainChromeRail
          userLabel={profile?.display_name || profile?.email || user?.email}
          onSignOut={handleSignOut}
          navSections={AGCHAIN_NAV_SECTIONS}
          headerBrand={(
            <span className="inline-flex items-baseline text-sm font-semibold uppercase tracking-[0.2em]">
              <span className="text-sidebar-foreground">Block</span>
              <span className="text-primary">Data</span>
              <span className="ml-1.5 text-sidebar-foreground">Bench</span>
            </span>
          )}
          headerContent={(
            <div className="flex w-full flex-col gap-2">
              <AgchainOrganizationSwitcher />
              <AgchainProjectSwitcher />
            </div>
          )}
        />
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            insetInlineEnd: -2,
            width: 4,
            cursor: 'col-resize',
            zIndex: 21,
          }}
          className="group"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-primary/30" />
        </div>
      </aside>

      {showRail2 && (
        <aside
          data-testid="agchain-secondary-rail"
          style={{
            position: 'fixed',
            top: `${AGCHAIN_HEADER_HEIGHT}px`,
            bottom: 0,
            insetInlineStart: `${rail1Width}px`,
            width: `${AGCHAIN_RAIL_2_WIDTH}px`,
            zIndex: 19,
          }}
        >
          <AgchainBenchmarkNav />
        </aside>
      )}

      <main style={mainStyle}>
        <div data-testid="agchain-shell-frame" className="h-full min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
