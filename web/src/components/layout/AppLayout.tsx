import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { IconLayoutSidebarRightExpand, IconLayoutSidebarRightCollapse } from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { LeftRailShadcn } from '@/components/shell/LeftRailShadcn';
import { RightRailShell } from '@/components/shell/RightRailShell';
import { HeaderCenterProvider } from '@/components/shell/HeaderCenterContext';
import { RightRailProvider, useRightRailContext } from '@/components/shell/RightRailContext';
import { AssistantDockHost } from '@/components/shell/AssistantDockHost';
import { AppPageShell } from '@/components/layout/AppPageShell';
import { styleTokens } from '@/lib/styleTokens';
import { Drawer } from '@ark-ui/react/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDraggable } from '@/hooks/useDraggable';

const DESKTOP_NAV_OPEN_KEY = 'blockdata.shell.nav_open_desktop';
const DESKTOP_NAV_OPEN_MIGRATION_KEY = 'blockdata.shell.nav_open_desktop.reset_once_v1';
const SIDEBAR_WIDTH_KEY = 'blockdata.shell.sidebar_width';

function readStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return defaultValue;
  return raw === 'true';
}

function readDesktopNavOpenedWithReset(defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;

  const migrationApplied = window.localStorage.getItem(DESKTOP_NAV_OPEN_MIGRATION_KEY) === 'true';
  if (!migrationApplied) {
    const raw = window.localStorage.getItem(DESKTOP_NAV_OPEN_KEY);
    if (raw === 'false') {
      window.localStorage.setItem(DESKTOP_NAV_OPEN_KEY, 'true');
    }
    window.localStorage.setItem(DESKTOP_NAV_OPEN_MIGRATION_KEY, 'true');
  }

  return readStoredBoolean(DESKTOP_NAV_OPEN_KEY, defaultValue);
}

/* ------------------------------------------------------------------ */
/*  Outer export — wraps providers so children can read contexts       */
/* ------------------------------------------------------------------ */

export function AppLayout() {
  return (
    <HeaderCenterProvider>
      <RightRailProvider>
        <AppShellInner />
      </RightRailProvider>
    </HeaderCenterProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner shell — has access to all contexts                           */
/* ------------------------------------------------------------------ */

function DraggableChat({ onClose, onDock }: { onClose: () => void; onDock: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { position, isDragging, handleRef } = useDraggable(containerRef);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        zIndex: 340,
        ...(position
          ? { top: `${position.y}px`, left: `${position.x}px` }
          : { bottom: '12px', right: '12px' }),
        width: 'min(380px, calc(100vw - 24px))',
        height: 'min(520px, 60vh)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'var(--chrome, var(--background))',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.24)',
        userSelect: isDragging ? 'none' : undefined,
      }}
    >
      <AssistantDockHost
        onClose={onClose}
        onDetach={onDock}
        dragHandleRef={handleRef}
        isDragging={isDragging}
      />
    </div>
  );
}

function AppShellInner() {
  const [navOpened, setNavOpened] = useState(false);
  const [desktopNavOpened, setDesktopNavOpened] = useState<boolean>(() => readDesktopNavOpenedWithReset(true));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const rightRail = useRightRailContext();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleNav = () => setNavOpened((current) => !current);
  const closeNav = () => setNavOpened(false);
  const toggleDesktopNav = () => setDesktopNavOpened(!desktopNavOpened);

  // Close floating chat
  const closeChatDetached = () => {
    rightRail.setChatDetached(false);
  };

  const dockChatToRail = () => {
    rightRail.setChatDetached(false);
    rightRail.setActiveTab('ai');
  };

  // Resizable sidebar width
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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(
        styleTokens.shell.navbarMinWidth,
        Math.min(startWidth + delta, styleTokens.shell.navbarMaxWidth),
      );
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth((w) => {
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
        return w;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const desktopNavbarWidth = desktopNavOpened
    ? sidebarWidth
    : styleTokens.shell.navbarCompactWidth;
  const isMobile = useIsMobile();

  // Right rail is shown when open AND (has help content OR AI tab is active and not detached)
  const hasRailContent = rightRail.content !== null || (rightRail.activeTab === 'ai' && !rightRail.chatDetached);
  const showRightRail = !isMobile && hasRailContent && rightRail.isOpen;
  const showRightRailToggle = !isMobile;

  const mobileNavbarWidth = styleTokens.shell.navbarMobileWidth;
  const mainInsetStart = isMobile ? 0 : desktopNavbarWidth;
  const mainInsetEnd = showRightRail ? styleTokens.shell.rightRailWidth : 0;
  const navbarWidth = isMobile ? mobileNavbarWidth : desktopNavbarWidth;

  const isEltRoute = /^\/app\/elt(?:\/|$)/.test(location.pathname);
  const isEditorLayoutRoute = location.pathname === '/app/editor/layout';
  const isEditorRoute = /^\/app\/editor(?:\/|$)/.test(location.pathname);
  const isSettingsRoute = /^\/app\/settings(?:\/|$)/.test(location.pathname);
  const isFlowsRoute = /^\/app\/flows(?:\/|$)/.test(location.pathname);
  const isApiEditorRoute = /^\/app\/api-editor(?:\/|$)/.test(location.pathname);
  const isMarketplaceServiceDetailRoute = /^\/app\/marketplace\/services\/[^/]+(?:\/|$)/.test(location.pathname);
  const isSuperuserRoute = /^\/app\/superuser(?:\/|$)/.test(location.pathname);
  const isAssetsRoute = location.pathname === '/app/assets';
  const isParseRoute = location.pathname === '/app/parse';
  const isExtractRoute = location.pathname === '/app/extract';
  const isSchemasRoute = /^\/app\/schemas(?:\/|$)/.test(location.pathname);
  const lockMainScroll = (
    isEltRoute
    || isEditorLayoutRoute
    || isEditorRoute
    || isSettingsRoute
    || isApiEditorRoute
    || isMarketplaceServiceDetailRoute
    || isSuperuserRoute
    || isAssetsRoute
    || isParseRoute
    || isExtractRoute
    || isSchemasRoute
  );

  useEffect(() => {
    if (!lockMainScroll) return undefined;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, [lockMainScroll]);

  const shellVars = {
    '--app-shell-navbar-offset': '0px',
    '--app-shell-header-height': `${styleTokens.shell.headerHeight}px`,
  } as CSSProperties;

  const shellMainStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    paddingTop: `${styleTokens.shell.headerHeight}px`,
    paddingInlineStart: `${mainInsetStart}px`,
    paddingInlineEnd: `${mainInsetEnd}px`,
    overflow: lockMainScroll ? 'hidden' : 'auto',
    overscrollBehavior: lockMainScroll ? 'none' : 'auto',
    backgroundColor: 'var(--background)',
  };
  const canPortal = typeof document !== 'undefined';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DESKTOP_NAV_OPEN_KEY, String(desktopNavOpened));
  }, [desktopNavOpened]);

  return (
    <>
      <div
        style={shellVars}
        className="relative h-dvh overflow-hidden"
      >
        <header
          style={{
            position: 'fixed',
            insetInlineStart: `${mainInsetStart}px`,
            insetInlineEnd: 0,
            top: 0,
            height: `${styleTokens.shell.headerHeight}px`,
            zIndex: 110,
            backgroundColor: 'var(--chrome, var(--background))',
            borderBottom: 'none',
          }}
        >
          <TopCommandBar
            onToggleNav={toggleNav}
            shellGuides={isEditorLayoutRoute}
            hideProjectSwitcher={isSuperuserRoute}
            hideSearch={isSuperuserRoute}
          />
          {!isMobile && (
            <button
              type="button"
              onClick={toggleDesktopNav}
              aria-label={desktopNavOpened ? 'Collapse side navigation' : 'Expand side navigation'}
              title={desktopNavOpened ? 'Collapse side navigation' : 'Expand side navigation'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground"
              style={{
                position: 'absolute',
                top: '16px',
                left: '10px',
                zIndex: 111,
              }}
            >
              <HugeiconsIcon icon={Layout03Icon} size={16} strokeWidth={2.1} />
            </button>
          )}
          <div
            data-testid="app-shell-top-divider"
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

        {!isMobile && (
          <aside
            style={{
              position: 'fixed',
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: `${navbarWidth}px`,
              borderInlineEnd: '1px solid var(--border)',
              backgroundColor: 'var(--chrome, var(--background))',
              zIndex: 105,
            }}
          >
            <LeftRailShadcn
              onNavigate={() => {
                closeNav();
              }}
              userLabel={profile?.display_name || profile?.email || user?.email}
              onSignOut={handleSignOut}
              desktopCompact={!desktopNavOpened}
              onToggleDesktopCompact={toggleDesktopNav}
            />
            {desktopNavOpened && (
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
                  zIndex: 106,
                }}
                className="group"
              >
                <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-primary/30" />
              </div>
            )}
          </aside>
        )}

        {isMobile && (
          <Drawer.Root
            open={navOpened}
            onOpenChange={(details) => { if (!details.open) closeNav(); }}
          >
            <Drawer.Backdrop className="fixed inset-0 z-[120] bg-black/45 transition-opacity duration-150" />
            <Drawer.Positioner
              style={{
                position: 'fixed',
                insetBlockStart: 0,
                insetBlockEnd: 0,
                insetInlineStart: 0,
                width: `${navbarWidth}px`,
                zIndex: 130,
              }}
            >
              <Drawer.Content
                style={{
                  height: '100%',
                  borderInlineEnd: '1px solid var(--border)',
                  backgroundColor: 'var(--chrome, var(--background))',
                }}
              >
                <LeftRailShadcn
                  onNavigate={() => {
                    closeNav();
                  }}
                  userLabel={profile?.display_name || profile?.email || user?.email}
                  onSignOut={handleSignOut}
                  desktopCompact={false}
                />
              </Drawer.Content>
            </Drawer.Positioner>
          </Drawer.Root>
        )}

        <main style={shellMainStyle}>
          {(isFlowsRoute || isMarketplaceServiceDetailRoute || isSuperuserRoute || isAssetsRoute || isParseRoute || isExtractRoute || isSchemasRoute) ? (
            <Outlet />
          ) : (
            <AppPageShell mode="fluid">
              <Outlet />
            </AppPageShell>
          )}
        </main>

        {/* Right rail toggle button */}
        {showRightRailToggle && (
          <div
            className="fixed z-[108] flex flex-col gap-0"
            style={{
              top: '50vh',
              insetInlineEnd: showRightRail ? `${styleTokens.shell.rightRailWidth}px` : 0,
            }}
          >
            <button
              type="button"
              aria-label={rightRail.isOpen ? 'Close panel' : 'Open panel'}
              title={rightRail.isOpen ? 'Close panel' : 'Open panel'}
              onClick={rightRail.toggle}
              className="inline-flex h-10 w-8 items-center justify-center rounded-l-md border border-r-0 border-border bg-[var(--chrome,var(--background))] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {rightRail.isOpen
                ? <IconLayoutSidebarRightCollapse size={16} stroke={1.75} />
                : <IconLayoutSidebarRightExpand size={16} stroke={1.75} />}
            </button>
          </div>
        )}

        {/* Right rail panel */}
        {showRightRail && (
          <aside
            style={{
              position: 'fixed',
              insetInlineEnd: 0,
              top: `${styleTokens.shell.headerHeight}px`,
              bottom: 0,
              width: `${styleTokens.shell.rightRailWidth}px`,
              zIndex: 104,
            }}
          >
            <RightRailShell
              title={rightRail.content?.title ?? 'AI'}
              description={rightRail.content?.description}
              sections={rightRail.content?.sections ?? []}
              footer={rightRail.content?.footer}
            />
          </aside>
        )}
      </div>

      {/* Floating detached chat */}
      {rightRail.chatDetached && canPortal
        ? createPortal(
            <DraggableChat onClose={closeChatDetached} onDock={dockChatToRail} />,
            document.body,
          )
        : null}
    </>
  );
}

