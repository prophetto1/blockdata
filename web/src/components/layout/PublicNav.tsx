import {
  Group,
  Text,
  Button,
  ActionIcon,
  Tooltip,
  Box,
  Container,
  Menu,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconSun, IconMoon, IconMenu2 } from '@tabler/icons-react';

export function PublicNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  const links = [
    { label: 'How it works', to: '/how-it-works' },
    { label: 'Use cases', to: '/use-cases' },
    { label: 'Integrations', to: '/integrations' },
  ];

  return (
    <Box
      h={56}
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Container size="lg" h="100%">
        <Group h="100%" justify="space-between">
          <Group gap="md">
            <Text
              fw={700}
              size="lg"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              BlockData
            </Text>

            <Group gap={6} visibleFrom="sm">
              {links.map((l) => (
                <Button
                  key={l.to}
                  size="sm"
                  variant={location.pathname === l.to ? 'light' : 'subtle'}
                  onClick={() => navigate(l.to)}
                >
                  {l.label}
                </Button>
              ))}
            </Group>

            <Box hiddenFrom="sm">
              <Menu width={200} position="bottom-start">
                <Menu.Target>
                  <ActionIcon variant="subtle" size="md" aria-label="Open menu">
                    <IconMenu2 size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {links.map((l) => (
                    <Menu.Item key={l.to} onClick={() => navigate(l.to)}>
                      {l.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </Box>
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
            {!isLoginPage && (
              <Button variant="subtle" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
            )}
            {!isRegisterPage && (
              <Button size="sm" onClick={() => navigate('/register')}>
                Create Account
              </Button>
            )}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
