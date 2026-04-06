import { useCallback, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AdminLeftNav, getAdminNavSections, getSecondaryNav } from '@/components/admin/AdminLeftNav';
import { HeaderCenterProvider } from '@/components/shell/HeaderCenterContext';
import { LeftRailShadcn as AdminChromeRail } from '@/components/shell/LeftRailShadcn';
import { styleTokens } from '@/lib/styleTokens';
import { AdminShellTopBand } from './AdminShellTopBand';

const LEGACY_SIDEBAR_WIDTH_KEY = 'blockdata.shell.sidebar_width';
const SIDEBAR_WIDTH_KEY = 'blockdata.admin-shell.sidebar_width';
const NAV_OPEN_KEY = 'blockdata.admin-shell.nav_open';
const ADMIN_SECONDARY_RAIL_WIDTH = 184;

function readStoredSidebarWidth() {
  if (typeof window === 'undefined') return styleTokens.shell.navbarWidth;
  const stored = window.localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? window.localStorage.getItem(LEGACY_SIDEBAR_WIDTH_KEY);
  if (stored) {
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      return Math.max(styleTokens.shell.navbarMinWidth, Math.min(parsed, styleTokens.shell.navbarMaxWidth));
    }
  }
  return styleTokens.shell.navbarWidth;
}

function readStoredNavOpen() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(NAV_OPEN_KEY) !== 'false';
}

function AdminShellLayoutFrame() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuth();
  const hasSecondaryRail = getSecondaryNav(pathname).length > 0;
  const navSections = getAdminNavSections(pathname);
  const [sidebarWidth, setSidebarWidth] = useState<number>(readStoredSidebarWidth);
  const [navOpen, setNavOpen] = useState<boolean>(readStoredNavOpen);
  const isResizingRef = useRef(false);
  const topBandHeight = styleTokens.admin.shellTopBandHeight;
  const leftChromeWidth = navOpen
    ? sidebarWidth + (hasSecondaryRail ? ADMIN_SECONDARY_RAIL_WIDTH : 0)
    : 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleResizeStart = useCallback((event: ReactMouseEvent) => {
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
      setSidebarWidth((width) => {
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
        return width;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const handleToggleNav = useCallback(() => {
    setNavOpen((current) => {
      const next = !current;
      window.localStorage.setItem(NAV_OPEN_KEY, next ? 'true' : 'false');
      return next;
    });
  }, []);

  const mainStyle: CSSProperties = {
    position: 'absolute',
    insetBlockStart: `${topBandHeight}px`,
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    insetInlineStart: `${leftChromeWidth}px`,
    overflow: 'auto',
    backgroundColor: 'var(--background)',
    transition: 'inset-inline-start 160ms ease-out',
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <AdminShellTopBand
        navOpen={navOpen}
        primaryRailWidth={sidebarWidth}
        height={topBandHeight}
        onToggleNav={handleToggleNav}
      />

      {navOpen && (
        <aside
          data-testid="admin-platform-rail"
          style={{
            position: 'fixed',
            insetInlineStart: 0,
            insetBlockStart: `${topBandHeight}px`,
            insetBlockEnd: 0,
            width: `${sidebarWidth}px`,
            borderInlineEnd: '1px solid var(--chrome, var(--background))',
            backgroundColor: 'var(--chrome, var(--background))',
            zIndex: 20,
          }}
        >
          <AdminChromeRail
            userLabel={profile?.display_name || profile?.email || user?.email}
            onSignOut={handleSignOut}
            disableAutoDrill
            navSections={navSections}
            hideHeaderChrome
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
      )}

      {navOpen && hasSecondaryRail && (
        <aside
          style={{
            position: 'fixed',
            insetBlockStart: `${topBandHeight}px`,
            insetBlockEnd: 0,
            insetInlineStart: `${sidebarWidth}px`,
            width: `${ADMIN_SECONDARY_RAIL_WIDTH}px`,
            backgroundColor: 'var(--chrome, var(--background))',
            zIndex: 19,
          }}
        >
          <AdminLeftNav />
        </aside>
      )}

      <main style={mainStyle}>
        <div data-testid="admin-shell-frame" className="h-full min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AdminShellLayout() {
  return (
    <HeaderCenterProvider>
      <AdminShellLayoutFrame />
    </HeaderCenterProvider>
  );
}
