import type { CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AGCHAIN_NAV_SECTIONS } from '@/components/agchain/AgchainLeftNav';
import { AgchainBenchmarkNav } from '@/components/agchain/AgchainBenchmarkNav';
import { AgchainProjectSwitcher } from '@/components/agchain/AgchainProjectSwitcher';
import { LeftRailShadcn as AgchainChromeRail } from '@/components/shell/LeftRailShadcn';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { styleTokens } from '@/lib/styleTokens';

const AGCHAIN_RAIL_1_WIDTH = 224;
const AGCHAIN_RAIL_2_WIDTH = 224;
const AGCHAIN_HEADER_HEIGHT = styleTokens.shell.headerHeight;
const AGCHAIN_BENCHMARK_DEFINITION_PATH = '/app/agchain/settings/project/benchmark-definition';

export function AgchainShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const showRail2 = location.pathname === AGCHAIN_BENCHMARK_DEFINITION_PATH;
  const totalRailWidth = AGCHAIN_RAIL_1_WIDTH + (showRail2 ? AGCHAIN_RAIL_2_WIDTH : 0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
            primaryContext={<AgchainProjectSwitcher />}
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
          width: `${AGCHAIN_RAIL_1_WIDTH}px`,
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
        />
      </aside>

      {showRail2 && (
        <aside
          data-testid="agchain-secondary-rail"
          style={{
            position: 'fixed',
            top: `${AGCHAIN_HEADER_HEIGHT}px`,
            bottom: 0,
            insetInlineStart: `${AGCHAIN_RAIL_1_WIDTH}px`,
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
