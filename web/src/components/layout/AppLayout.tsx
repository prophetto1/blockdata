import { AppShell, Burger, NavLink, Group, Text, Button, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  IconUpload,
  IconFileText,
  IconSchema,
  IconPlayerPlay,
  IconLayoutDashboard,
} from '@tabler/icons-react';
import { useAuth } from '@/auth/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: IconLayoutDashboard, path: '/app' },
  { label: 'Upload', icon: IconUpload, path: '/app/upload' },
  { label: 'Documents', icon: IconFileText, path: '/app/documents' },
  { label: 'Schemas', icon: IconSchema, path: '/app/schemas' },
  { label: 'Runs', icon: IconPlayerPlay, path: '/app/runs' },
];

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">MD-Annotate</Text>
          </Group>
          <Group gap="sm">
            <Text size="sm" c="dimmed">{user?.email}</Text>
            <Button variant="subtle" size="xs" onClick={handleSignOut}>Sign out</Button>
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
                  ? location.pathname === '/app'
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
