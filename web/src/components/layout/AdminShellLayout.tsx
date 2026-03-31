import { useCallback, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AdminLeftNav, getSecondaryNav, NAV_SECTIONS } from '@/components/admin/AdminLeftNav';
import { LeftRailShadcn as AdminChromeRail } from '@/components/shell/LeftRailShadcn';
import { styleTokens } from '@/lib/styleTokens';

const SIDEBAR_WIDTH_KEY = 'blockdata.shell.sidebar_width';
const ADMIN_SECONDARY_RAIL_WIDTH = 184;

export function AdminShellLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuth();
  const hasSecondaryRail = getSecondaryNav(pathname).length > 0;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return styleTokens.shell.navbarWidth;
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        return Math.max(styleTokens.shell.navbarMinWidth, Math.min(parsed, styleTokens.shell.navbarMaxWidth));
      }
    }
    return styleTokens.shell.navbarWidth;
  });
  const isResizingRef = useRef(false);

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

  const mainStyle: CSSProperties = {
    position: 'absolute',
    insetBlock: 0,
    insetInlineEnd: 0,
    insetInlineStart: hasSecondaryRail
      ? `${sidebarWidth + ADMIN_SECONDARY_RAIL_WIDTH}px`
      : `${sidebarWidth}px`,
    overflow: 'auto',
    backgroundColor: 'var(--background)',
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <aside
        data-testid="admin-platform-rail"
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetBlock: 0,
          width: `${sidebarWidth}px`,
          borderInlineEnd: '1px solid var(--border)',
          backgroundColor: 'var(--chrome, var(--background))',
          zIndex: 20,
        }}
      >
        <AdminChromeRail
          userLabel={profile?.display_name || profile?.email || user?.email}
          onSignOut={handleSignOut}
          disableAutoDrill
          navSections={NAV_SECTIONS}
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

      {hasSecondaryRail && (
        <aside
          style={{
            position: 'fixed',
            insetBlock: 0,
            insetInlineStart: `${sidebarWidth}px`,
            width: `${ADMIN_SECONDARY_RAIL_WIDTH}px`,
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
