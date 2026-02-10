import {
  AppShell,
  Burger,
  NavLink,
  Group,
  Text,
  Button,
  Box,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  IconFolderPlus,
  IconSchema,
  IconPlug,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';

const NAV_ITEMS = [
  { label: 'Projects', icon: IconFolderPlus, path: '/app' },
  { label: 'Schemas', icon: IconSchema, path: '/app/schemas' },
  { label: 'Integrations', icon: IconPlug, path: '/app/integrations' },
];

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
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

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
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
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">BlockData</Text>
          </Group>
          <Group gap="sm">
            <Tooltip label={computedColorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <ActionIcon
                variant="subtle"
                size="md"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
              >
                {computedColorScheme === 'dark'
                  ? <IconSun size={18} />
                  : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
            <Text size="sm" c="dimmed">
              {profile?.display_name || profile?.email || user?.email}
            </Text>
            <Button variant="subtle" size="xs" onClick={handleSignOut}>
              Sign out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <Box mt="xs">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={
                item.path === '/app'
                  ? location.pathname === '/app' || location.pathname.startsWith('/app/projects')
                  : location.pathname.startsWith(item.path)
              }
              onClick={() => {
                navigate(item.path);
                toggle();
              }}
            />
          ))}
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
