import { useMemo } from 'react';
import {
  AppShell,
  Drawer,
  rem,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { Spotlight, type SpotlightActionData } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { LeftRail } from '@/components/shell/LeftRail';
import { HeaderCenterProvider } from '@/components/shell/HeaderCenterContext';
import { AssistantDockHost } from '@/components/shell/AssistantDockHost';
import { GLOBAL_MENUS, NAV_GROUPS } from '@/components/shell/nav-config';
import { AppPageShell } from '@/components/layout/AppPageShell';
import { featureFlags } from '@/lib/featureFlags';
import { styleTokens } from '@/lib/styleTokens';

export function AppLayout() {
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
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  const toggleAssistant = () => setAssistantOpened(!assistantOpened);
  const closeAssistant = () => setAssistantOpened(false);
  const toggleDesktopNav = () => setDesktopNavOpened(!desktopNavOpened);
  const desktopNavbarWidth = desktopNavOpened
    ? styleTokens.shell.navbarWidth
    : styleTokens.shell.navbarCompactWidth;

  /* ---- Spotlight actions from nav-config ---- */
  const spotlightActions = useMemo<SpotlightActionData[]>(
    () => {
      const globalPaths = new Set(GLOBAL_MENUS.map((item) => item.path));
      const globalActions = GLOBAL_MENUS.map((item) => ({
        id: `global-${item.path}`,
        label: item.label,
        description: 'Global',
        onClick: () => navigate(item.path),
        leftSection: <item.icon size={18} stroke={1.5} />,
      }));
      const groupedActions = NAV_GROUPS.flatMap((group) =>
        group.items
          .filter((item) => !globalPaths.has(item.path))
          .map((item) => ({
            id: item.path,
            label: item.label,
            description: group.label,
            onClick: () => navigate(item.path),
            leftSection: <item.icon size={18} stroke={1.5} />,
          })),
      );
      return [...globalActions, ...groupedActions];
    },
    [navigate],
  );
  const isProjectCanvasRoute = /^\/app\/projects\/[^/]+$/.test(location.pathname);
  const isTestCanvasRoute = /^\/app\/(?:test|parse2)\/[^/]+$/.test(location.pathname);
  const isExtractCanvasRoute = /^\/app\/extract\/[^/]+$/.test(location.pathname);
  const lockMainScroll = isProjectCanvasRoute || isTestCanvasRoute || isExtractCanvasRoute;

  return (
    <HeaderCenterProvider>
    <Spotlight
      actions={spotlightActions}
      shortcut={['mod + k']}
      nothingFound="No results"
      searchProps={{ leftSection: <IconSearch size={18} />, placeholder: 'Search pages...' }}
      highlightQuery
    />

    <AppShell
      header={{ height: styleTokens.shell.headerHeight }}
      navbar={{
        width: { base: styleTokens.shell.navbarWidth, sm: desktopNavbarWidth },
        breakpoint: 'sm',
        collapsed: { mobile: !navOpened, desktop: false },
      }}
      aside={assistantDockEnabled
        ? {
            width: styleTokens.shell.assistantWidth,
            breakpoint: 'sm',
            collapsed: { desktop: !assistantOpened, mobile: true },
          }
        : undefined}
      padding={styleTokens.shell.mainPadding}
      styles={{
        header: {
          boxShadow: 'none',
        },
        navbar: {
          backgroundColor: 'var(--mantine-color-body)',
          borderRight: '1px solid var(--mantine-color-default-border)',
          top: 0,
          height: '100dvh',
        },
        aside: {
          backgroundColor: 'var(--mantine-color-body)',
          borderLeft: '1px solid var(--mantine-color-default-border)',
          top: 0,
          height: '100dvh',
        },
      }}
    >
      <AppShell.Header>
        <TopCommandBar
          navOpened={navOpened}
          onToggleNav={toggleNav}
          desktopNavOpened={desktopNavOpened}
          onToggleDesktopNav={toggleDesktopNav}
          showSearch={shellV2Enabled}
          showAssistantToggle={assistantDockEnabled}
          assistantOpened={assistantOpened}
          onToggleAssistant={toggleAssistant}
          computedColorScheme={computedColorScheme}
          onToggleColorScheme={toggleColorScheme}
        />
      </AppShell.Header>

      <AppShell.Navbar
        px={0}
        pb={0}
        pt={0}
      >
        <LeftRail
          onNavigate={() => {
            closeNav();
          }}
          userLabel={profile?.display_name || profile?.email || user?.email}
          onSignOut={handleSignOut}
          desktopCompact={!desktopNavOpened}
          onToggleDesktopCompact={toggleDesktopNav}
        />
      </AppShell.Navbar>

      <AppShell.Main style={lockMainScroll ? { overflow: 'hidden' } : undefined}>
        <AppPageShell mode="fluid">
          <Outlet />
        </AppPageShell>
      </AppShell.Main>

      {assistantDockEnabled && (
        <AppShell.Aside px={0} pb={0} pt={0}>
          <AssistantDockHost onClose={closeAssistant} />
        </AppShell.Aside>
      )}
    </AppShell>

    {assistantDockEnabled && (
      <Drawer
        hiddenFrom="sm"
        opened={assistantOpened}
        onClose={closeAssistant}
        position="right"
        size={rem(360)}
        title="Assistant"
        overlayProps={{ backgroundOpacity: 0.15 }}
        styles={{
          body: { paddingTop: 0 },
        }}
      >
        <AssistantDockHost onClose={closeAssistant} />
      </Drawer>
    )}

    </HeaderCenterProvider>
  );
}
