import {
  ActionIcon,
  AppShell,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { IconChevronRight } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { LeftRail } from '@/components/shell/LeftRail';
import { AssistantDockHost } from '@/components/shell/AssistantDockHost';
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

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !navOpened, desktop: !desktopNavOpened } }}
      aside={
        assistantDockEnabled
          ? {
              width: 360,
              breakpoint: 'sm',
              collapsed: { desktop: !assistantOpened, mobile: !assistantOpened },
            }
          : undefined
      }
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
        ...(assistantDockEnabled
          ? {
              aside: {
                backgroundColor: 'var(--mantine-color-body)',
                borderLeft: '1px solid var(--mantine-color-default-border)',
              },
            }
          : {}),
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
          userLabel={profile?.display_name || profile?.email || user?.email}
          onSignOut={handleSignOut}
        />
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <LeftRail
          onNavigate={() => {
            closeNav();
          }}
        />
      </AppShell.Navbar>

      {assistantDockEnabled && (
        <AppShell.Aside p="xs">
          <AssistantDockHost onClose={closeAssistant} />
        </AppShell.Aside>
      )}

      <AppShell.Main>
        {!desktopNavOpened && (
          <ActionIcon
            visibleFrom="sm"
            size="md"
            variant="filled"
            color="gray"
            radius="md"
            aria-label="Show navigation"
            onClick={toggleDesktopNav}
            style={{
              position: 'fixed',
              left: 8,
              top: 64,
              zIndex: 210,
            }}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        )}
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
