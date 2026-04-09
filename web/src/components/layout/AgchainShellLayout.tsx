import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Drawer } from '@ark-ui/react/drawer';
import { IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand } from '@tabler/icons-react';
import { AgchainSettingsNav } from '@/components/agchain/settings/AgchainSettingsNav';
import { useAuth } from '@/auth/AuthContext';
import { AGCHAIN_NAV_SECTIONS } from '@/components/agchain/AgchainLeftNav';
import { AgchainOrganizationSwitcher } from '@/components/agchain/AgchainOrganizationSwitcher';
import { AgchainProjectSwitcher } from '@/components/agchain/AgchainProjectSwitcher';
import { HeaderCenterProvider, useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { LeftRailShadcn as AgchainChromeRail } from '@/components/shell/LeftRailShadcn';
import { RightRailProvider, useRightRailContext } from '@/components/shell/RightRailContext';
import { RightRailShell } from '@/components/shell/RightRailShell';
import { AssistantDockHost } from '@/components/shell/AssistantDockHost';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { AgchainWorkspaceProvider } from '@/contexts/AgchainWorkspaceContext';
import { useDraggable } from '@/hooks/useDraggable';
import { useIsMobile } from '@/hooks/use-mobile';
import { styleTokens } from '@/lib/styleTokens';

const AGCHAIN_SIDEBAR_WIDTH_KEY = 'agchain.shell.sidebar_width';
const AGCHAIN_RAIL_2_WIDTH = 224;
const AGCHAIN_HEADER_HEIGHT = styleTokens.shell.headerHeight;
const AGCHAIN_PAGE_HEADER_HEIGHT = styleTokens.shell.headerTallHeight;
const AGCHAIN_SETTINGS_PATH_PREFIX = '/app/agchain/settings';

function readStoredWidth(): number {
  if (typeof window === 'undefined') return styleTokens.shell.navbarWidth;
  const raw = window.localStorage.getItem(AGCHAIN_SIDEBAR_WIDTH_KEY);
  if (!raw) return styleTokens.shell.navbarWidth;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return styleTokens.shell.navbarWidth;
  return Math.max(styleTokens.shell.navbarMinWidth, Math.min(parsed, styleTokens.shell.navbarMaxWidth));
}

export function AgchainShellLayout() {
  return (
    <HeaderCenterProvider>
      <RightRailProvider>
        <AgchainWorkspaceProvider>
          <AgchainShellInner />
        </AgchainWorkspaceProvider>
      </RightRailProvider>
    </HeaderCenterProvider>
  );
}

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
        height: 'min(520px, calc(100dvh - 24px))',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 24px)',
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

function AgchainShellInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { pageHeader } = useHeaderCenter();
  const rightRail = useRightRailContext();
  const isMobile = useIsMobile();
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => readStoredWidth());
  const [navOpened, setNavOpened] = useState(false);
  const isResizingRef = useRef(false);

  const showRail2 = location.pathname.startsWith(AGCHAIN_SETTINGS_PATH_PREFIX);
  const rail1Width = sidebarWidth;
  const rail2Width = showRail2 ? AGCHAIN_RAIL_2_WIDTH : 0;
  const headerHeight = pageHeader ? AGCHAIN_PAGE_HEADER_HEIGHT : AGCHAIN_HEADER_HEIGHT;
  const hasRailContent = rightRail.content !== null || (rightRail.activeTab === 'ai' && !rightRail.chatDetached);
  const showRightRail = !isMobile && hasRailContent && rightRail.isOpen;
  const totalRailWidth = rail1Width + rail2Width;
  const mainInsetEnd = showRightRail ? styleTokens.shell.rightRailWidth : 0;
  const canPortal = typeof document !== 'undefined';

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

  const closeChatDetached = () => {
    rightRail.setChatDetached(false);
  };

  const dockChatToRail = () => {
    rightRail.setChatDetached(false);
    rightRail.setActiveTab('ai');
  };

  const mainStyle: CSSProperties = {
    position: 'absolute',
    insetBlockStart: `${headerHeight}px`,
    insetBlockEnd: 0,
    insetInlineEnd: `${mainInsetEnd}px`,
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
          height: `${headerHeight}px`,
          zIndex: 30,
          backgroundColor: 'var(--chrome, var(--background))',
        }}
      >
        <TopCommandBar
          onToggleNav={() => setNavOpened((current) => !current)}
          hideProjectSwitcher
          hideSearch
          primaryContext={pageHeader}
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
              <span className="inline-flex items-baseline text-xs font-semibold uppercase tracking-[0.2em]">
                <span className="text-sidebar-foreground">Block</span>
                <span className="text-primary">Data</span>
                <span className="ml-1 text-sidebar-foreground/60">Bench</span>
              </span>
            )}
            headerContent={(
              <div className="flex w-full flex-col rounded-lg border border-border bg-card/30 py-1">
                <AgchainOrganizationSwitcher />
                <div className="mx-3 h-px bg-border/60" />
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

      {isMobile && (
        <Drawer.Root
          open={navOpened}
          onOpenChange={(details) => { if (!details.open) setNavOpened(false); }}
        >
          <Drawer.Backdrop className="fixed inset-0 z-[120] bg-black/45 transition-opacity duration-150" />
          <Drawer.Positioner
            style={{
              position: 'fixed',
              insetBlockStart: 0,
              insetBlockEnd: 0,
              insetInlineStart: 0,
              width: `${rail1Width}px`,
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
              <AgchainChromeRail
                userLabel={profile?.display_name || profile?.email || user?.email}
                onSignOut={handleSignOut}
                navSections={AGCHAIN_NAV_SECTIONS}
                headerBrand={(
                  <span className="inline-flex items-baseline text-xs font-semibold uppercase tracking-[0.2em]">
                    <span className="text-sidebar-foreground">Block</span>
                    <span className="text-primary">Data</span>
                    <span className="ml-1 text-sidebar-foreground/60">Bench</span>
                  </span>
                )}
                headerContent={(
                  <div className="flex w-full flex-col rounded-lg border border-border bg-card/30 py-1">
                    <AgchainOrganizationSwitcher />
                    <div className="mx-3 h-px bg-border/60" />
                    <AgchainProjectSwitcher />
                  </div>
                )}
              />
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Root>
      )}

      {showRail2 && (
        <aside
          data-testid="agchain-secondary-rail"
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            insetInlineStart: `${rail1Width}px`,
            width: `${AGCHAIN_RAIL_2_WIDTH}px`,
            zIndex: 19,
          }}
        >
          <AgchainSettingsNav />
        </aside>
      )}

      <main style={mainStyle}>
        <div data-testid="agchain-shell-frame" className="h-full min-h-0">
          <Outlet />
        </div>
      </main>

      {!isMobile && (
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

      {showRightRail && (
        <aside
          data-testid="agchain-right-rail"
          style={{
            position: 'fixed',
            insetInlineEnd: 0,
            top: `${headerHeight}px`,
            bottom: 0,
            width: `${styleTokens.shell.rightRailWidth}px`,
            zIndex: 18,
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

      {rightRail.chatDetached && canPortal
        ? createPortal(
            <DraggableChat onClose={closeChatDetached} onDock={dockChatToRail} />,
            document.body,
          )
        : null}
    </div>
  );
}
