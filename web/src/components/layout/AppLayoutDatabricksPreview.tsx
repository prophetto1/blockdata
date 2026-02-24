import { useEffect } from 'react';
import {
  AppShell,
  Box,
  Modal,
  Portal,
  rem,
} from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { LeftRailShadcn } from '@/components/shell/LeftRailShadcn';
import { HeaderCenterProvider } from '@/components/shell/HeaderCenterContext';
import { AssistantDockHost } from '@/components/shell/AssistantDockHost';
import { AppPageShell } from '@/components/layout/AppPageShell';
import { featureFlags } from '@/lib/featureFlags';
import { styleTokens } from '@/lib/styleTokens';

/**
 * A copy of AppLayout that scopes "Databricks-like" chrome tokens to a single route.
 * This intentionally avoids global theme changes while we iterate.
 */
export function AppLayoutDatabricksPreview() {
  const shellV2Enabled = featureFlags.shellV2;
  const assistantDockEnabled = shellV2Enabled && featureFlags.assistantDock;
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure();
  const [desktopNavOpened, setDesktopNavOpened] = useLocalStorage<boolean>({
    key: 'blockdata.shell.nav_open_desktop',
    defaultValue: true,
  });
  const [assistantOpened, setAssistantOpened] = useLocalStorage<boolean>({
    key: 'blockdata.shell.assistant_open',
    defaultValue: false,
  });
  const [assistantDetached, setAssistantDetached] = useLocalStorage<boolean>({
    key: 'blockdata.shell.assistant_detached',
    defaultValue: false,
  });
  const [assistantSide, setAssistantSide] = useLocalStorage<'left' | 'right'>({
    key: 'blockdata.shell.assistant_side',
    defaultValue: 'right',
  });
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
    setAssistantSide(assistantSide === 'right' ? 'left' : 'right');
  };
  const toggleDesktopNav = () => setDesktopNavOpened(!desktopNavOpened);
  const desktopNavbarWidth = desktopNavOpened
    ? styleTokens.shell.navbarWidth
    : styleTokens.shell.navbarCompactWidth;

  const isProjectCanvasRoute = /^\/app\/projects\/[^/]+$/.test(location.pathname);
  const isExtractCanvasRoute = /^\/app\/extract\/[^/]+$/.test(location.pathname);
  const isTransformCanvasRoute = /^\/app\/transform\/[^/]+$/.test(location.pathname);
  const isSchemaLayoutRoute = location.pathname === '/app/schemas/layout';
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

  const lockedMainStyle = lockMainScroll
    ? {
        overflow: 'hidden' as const,
        overscrollBehavior: 'none' as const,
      }
    : undefined;

  // Command search is handled in LeftRail; AppLayout intentionally has no Spotlight provider.
  return (
    <Box className="dbx-preview">
      <HeaderCenterProvider>
        <AppShell
          header={{ height: styleTokens.shell.headerHeight }}
          navbar={{
            width: { base: styleTokens.shell.navbarWidth, sm: desktopNavbarWidth },
            breakpoint: 'sm',
            collapsed: { mobile: !navOpened, desktop: false },
          }}
          padding={styleTokens.shell.mainPadding}
          styles={{
            header: {
              boxShadow: 'var(--dbx-shadow-1)',
              borderBottom: '1px solid var(--dbx-border-1)',
              backgroundColor: 'var(--dbx-surface-1)',
            },
            navbar: {
              backgroundColor: 'var(--dbx-surface-1)',
              borderRight: '1px solid var(--dbx-border-1)',
              top: 0,
              height: '100dvh',
            },
            main: {
              backgroundColor: 'var(--dbx-surface-0)',
            },
          }}
        >
          <AppShell.Header>
            <TopCommandBar
              onToggleNav={toggleNav}
              shellGuides={isSchemaLayoutRoute}
            />
          </AppShell.Header>

          <AppShell.Navbar
            px={0}
            pb={0}
            pt={0}
          >
            <LeftRailShadcn
              onNavigate={() => {
                closeNav();
              }}
              userLabel={profile?.display_name || profile?.email || user?.email}
              onSignOut={handleSignOut}
              desktopCompact={!desktopNavOpened}
              onToggleDesktopCompact={toggleDesktopNav}
              showAssistantToggle={assistantDockEnabled}
              assistantOpened={assistantOpened}
              onToggleAssistant={toggleAssistant}
            />
          </AppShell.Navbar>

          <AppShell.Main style={lockedMainStyle}>
            <AppPageShell mode="fluid">
              <Outlet />
            </AppPageShell>
          </AppShell.Main>

        </AppShell>

        {assistantDockEnabled && assistantOpened && !assistantDetached && (
          <Portal>
            <Box
              style={{
                position: 'fixed',
                zIndex: 340,
                bottom: rem(12),
                left: assistantSide === 'left' ? rem(12) : undefined,
                right: assistantSide === 'right' ? rem(12) : undefined,
                width: 'min(560px, calc(100vw - 24px))',
                height: 'min(78vh, 860px)',
                borderRadius: rem(12),
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
            </Box>
          </Portal>
        )}

        {assistantDockEnabled && (
          <Modal
            opened={assistantOpened && assistantDetached}
            onClose={closeAssistant}
            withCloseButton={false}
            centered
            size="min(1180px, 96vw)"
            yOffset="2vh"
            overlayProps={{ backgroundOpacity: 0.32, blur: 2 }}
            styles={{
              content: {
                border: '1px solid rgba(148, 163, 184, 0.28)',
                backgroundColor: '#29313c',
                overflow: 'hidden',
              },
              body: {
                padding: 0,
              },
            }}
          >
            <AssistantDockHost
              onClose={closeAssistant}
              onDetach={toggleAssistantDetached}
              detached
            />
          </Modal>
        )}

      </HeaderCenterProvider>
    </Box>
  );
}

