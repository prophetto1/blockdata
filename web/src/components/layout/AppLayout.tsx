import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { LeftRailShadcn } from '@/components/shell/LeftRailShadcn';
import { HeaderCenterProvider } from '@/components/shell/HeaderCenterContext';
import { AssistantDockHost } from '@/components/shell/AssistantDockHost';
import { AppPageShell } from '@/components/layout/AppPageShell';
import { featureFlags } from '@/lib/featureFlags';
import { styleTokens } from '@/lib/styleTokens';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const DESKTOP_NAV_OPEN_KEY = 'blockdata.shell.nav_open_desktop';
const DESKTOP_NAV_OPEN_MIGRATION_KEY = 'blockdata.shell.nav_open_desktop.reset_once_v1';

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

function useStoredBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => readStoredBoolean(key, defaultValue));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, String(value));
  }, [key, value]);
  return [value, setValue] as const;
}

function readStoredSide(key: string, defaultValue: 'left' | 'right'): 'left' | 'right' {
  if (typeof window === 'undefined') return defaultValue;
  const raw = window.localStorage.getItem(key);
  if (raw === 'left' || raw === 'right') return raw;
  return defaultValue;
}

function useStoredSide(key: string, defaultValue: 'left' | 'right') {
  const [value, setValue] = useState<'left' | 'right'>(() => readStoredSide(key, defaultValue));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

export function AppLayout() {
  const shellV2Enabled = featureFlags.shellV2;
  const assistantDockEnabled = shellV2Enabled && featureFlags.assistantDock;
  const [navOpened, setNavOpened] = useState(false);
  const [desktopNavOpened, setDesktopNavOpened] = useState<boolean>(() => readDesktopNavOpenedWithReset(true));
  const [assistantOpened, setAssistantOpened] = useStoredBoolean('blockdata.shell.assistant_open', false);
  const [assistantDetached, setAssistantDetached] = useStoredBoolean('blockdata.shell.assistant_detached', false);
  const [assistantSide, setAssistantSide] = useStoredSide('blockdata.shell.assistant_side', 'right');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleAssistant = () => {
    if (assistantOpened) {
      setAssistantOpened(false);
      setAssistantDetached(false);
      return;
    }
    setAssistantOpened(true);
  };
  const closeAssistant = () => {
    setAssistantOpened(false);
    setAssistantDetached(false);
  };
  const toggleAssistantDetached = () => {
    if (!assistantOpened) {
      setAssistantOpened(true);
    }
    setAssistantDetached(!assistantDetached);
  };
  const toggleAssistantSide = () => {
    setAssistantSide((current) => (current === 'right' ? 'left' : 'right'));
  };
  const toggleNav = () => setNavOpened((current) => !current);
  const closeNav = () => setNavOpened(false);
  const toggleDesktopNav = () => setDesktopNavOpened(!desktopNavOpened);
  const desktopNavbarWidth = desktopNavOpened
    ? styleTokens.shell.navbarWidth
    : styleTokens.shell.navbarCompactWidth;
  const isMobile = useIsMobile();
  const mainInsetStart = isMobile ? 0 : desktopNavbarWidth;
  const navbarWidth = isMobile ? styleTokens.shell.navbarWidth : desktopNavbarWidth;

  const isProjectCanvasRoute = /^\/app\/projects\/[^/]+$/.test(location.pathname);
  const isExtractCanvasRoute = /^\/app\/extract\/[^/]+$/.test(location.pathname);
  const isTransformCanvasRoute = /^\/app\/transform\/[^/]+$/.test(location.pathname);
  const isSchemaLayoutRoute = location.pathname === '/app/schemas/layout';
  const isFlowsRoute = /^\/app\/flows(?:\/|$)/.test(location.pathname);
  const lockMainScroll = (
    isProjectCanvasRoute
    || isExtractCanvasRoute
    || isTransformCanvasRoute
    || isSchemaLayoutRoute
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
    overflow: lockMainScroll ? 'hidden' : 'auto',
    overscrollBehavior: lockMainScroll ? 'none' : 'auto',
    backgroundColor: 'var(--background)',
  };
  const canPortal = typeof document !== 'undefined';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DESKTOP_NAV_OPEN_KEY, String(desktopNavOpened));
  }, [desktopNavOpened]);

  // Command search is handled in LeftRail; AppLayout intentionally has no Spotlight provider.
  return (
    <HeaderCenterProvider>
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
            backgroundColor: 'var(--background)',
            borderBottom: 'none',
          }}
        >
          <TopCommandBar
            onToggleNav={toggleNav}
            shellGuides={isSchemaLayoutRoute}
            showAssistantToggle={assistantDockEnabled}
            assistantOpened={assistantOpened}
            onToggleAssistant={toggleAssistant}
          />
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
              backgroundColor: 'var(--background)',
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
          </aside>
        )}

        {isMobile && (
          <>
            <aside
              style={{
                position: 'fixed',
                insetInlineStart: 0,
                top: 0,
                bottom: 0,
                width: `${navbarWidth}px`,
                borderInlineEnd: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                zIndex: 130,
                transform: navOpened ? 'translateX(0)' : 'translateX(-100%)',
              }}
              className="transition-transform duration-200 ease-out"
            >
              <LeftRailShadcn
                onNavigate={() => {
                  closeNav();
                }}
                userLabel={profile?.display_name || profile?.email || user?.email}
                onSignOut={handleSignOut}
                desktopCompact={false}
              />
            </aside>
            <button
              type="button"
              aria-label="Close navigation overlay"
              onClick={closeNav}
              className={cn(
                'fixed inset-0 z-[120] bg-black/45 transition-opacity duration-150',
                navOpened ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            />
          </>
        )}

        <main style={shellMainStyle}>
          {isFlowsRoute ? (
            <Outlet />
          ) : (
            <AppPageShell mode="fluid">
              <Outlet />
            </AppPageShell>
          )}
        </main>
      </div>

      {assistantDockEnabled && assistantOpened && !assistantDetached && canPortal
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                zIndex: 340,
                bottom: '12px',
                left: assistantSide === 'left' ? '12px' : undefined,
                right: assistantSide === 'right' ? '12px' : undefined,
                width: 'min(560px, calc(100vw - 24px))',
                height: 'min(78vh, 860px)',
                border: '1px solid rgba(148, 163, 184, 0.28)',
                backgroundColor: '#29313c',
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.34)',
              }}
            >
              <AssistantDockHost
                onClose={closeAssistant}
                onDetach={toggleAssistantDetached}
                onToggleSide={toggleAssistantSide}
                side={assistantSide}
              />
            </div>,
            document.body,
          )
        : null}

      {assistantDockEnabled && assistantOpened && assistantDetached && canPortal
        ? createPortal(
            <div
              className="fixed inset-0 z-[360] bg-black/35 backdrop-blur-[2px]"
              role="presentation"
              onClick={closeAssistant}
            >
              <div
                role="dialog"
                aria-modal="true"
                className="absolute left-1/2 top-[2vh] h-[min(92vh,960px)] w-[min(1180px,96vw)] -translate-x-1/2 overflow-hidden border border-slate-400/30 bg-[#29313c]"
                onClick={(event) => event.stopPropagation()}
              >
                <AssistantDockHost
                  onClose={closeAssistant}
                  onDetach={toggleAssistantDetached}
                  detached
                />
              </div>
            </div>,
            document.body,
          )
        : null}

    </HeaderCenterProvider>
  );
}
