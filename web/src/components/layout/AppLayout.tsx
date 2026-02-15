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
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { LeftRail } from '@/components/shell/LeftRail';
import { HeaderCenterProvider } from '@/components/shell/HeaderCenterContext';
import { AssistantDockHost } from '@/components/shell/AssistantDockHost';
import { NAV_GROUPS } from '@/components/shell/nav-config';
import { featureFlags } from '@/lib/featureFlags';

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

  /* ---- Spotlight actions from nav-config ---- */
  const spotlightActions = useMemo<SpotlightActionData[]>(
    () =>
      NAV_GROUPS.flatMap((group) =>
        group.items.map((item) => ({
          id: item.path,
          label: item.label,
          description: group.label,
          onClick: () => navigate(item.path),
          leftSection: <item.icon size={18} stroke={1.5} />,
        })),
      ),
    [navigate],
  );

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
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !navOpened, desktop: !desktopNavOpened } }}
      padding="md"
      styles={{
        header: {
          borderBottom: '1px solid var(--mantine-color-default-border)',
          boxShadow: 'none',
        },
        navbar: {
          backgroundColor: 'var(--mantine-color-body)',
          borderRight: '1px solid var(--mantine-color-default-border)',
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

      <AppShell.Navbar p="xs">
        <LeftRail
          onNavigate={() => {
            closeNav();
          }}
          userLabel={profile?.display_name || profile?.email || user?.email}
          onSignOut={handleSignOut}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>

    {assistantDockEnabled && (
      <Drawer
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