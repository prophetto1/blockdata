import {
  Box,
  Button,
  Container,
  Group,
  Menu,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconMenu2, IconArrowRight, IconMoon, IconSun } from '@tabler/icons-react';

export function PublicNavModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = (colorScheme === 'auto' ? computedColorScheme : colorScheme) === 'dark';

  const toggleColorScheme = () => {
    setColorScheme(isDark ? 'light' : 'dark');
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'var(--mantine-color-body)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        height: 62,
      }}
    >
      <Container size="xl" h="100%" px={{ base: 'md', md: 'xl' }} style={{ maxWidth: 1360 }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <UnstyledButton
            onClick={() => navigate('/')}
            style={{ minWidth: 180, display: 'flex', alignItems: 'center' }}
          >
            <Text fw={800} fz={21} style={{ letterSpacing: '-0.02em' }}>
              BlockData
            </Text>
          </UnstyledButton>

          <Group gap={8} visibleFrom="sm" style={{ flex: 1, justifyContent: 'center' }}>
            {links.map((l) => (
              <Button
                key={l.to}
                size="sm"
                variant="subtle"
                radius="md"
                color={location.pathname === l.to ? 'teal' : isDark ? 'gray' : 'dark'}
                style={{
                  opacity: location.pathname === l.to ? 1 : 0.72,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
                onClick={() => navigate(l.to)}
              >
                {l.label}
              </Button>
            ))}
          </Group>

          <Group gap="xs" wrap="nowrap" style={{ minWidth: 220, justifyContent: 'flex-end' }}>
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              leftSection={isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
              onClick={toggleColorScheme}
              visibleFrom="sm"
            >
              Theme
            </Button>
            {!isLoginPage && (
              <Button
                variant="subtle"
                size="sm"
                color="gray"
                style={{ opacity: 0.86, fontWeight: 600 }}
                onClick={() => navigate('/login')}
                visibleFrom="sm"
              >
                Log in
              </Button>
            )}
            {!isRegisterPage && (
              <Button
                size="sm"
                radius="xl"
                color="teal"
                onClick={() => navigate('/register')}
                rightSection={<IconArrowRight size={16} />}
              >
                Get Started Free
              </Button>
            )}

            <Box hiddenFrom="sm">
              <Menu width={220} position="bottom-end">
                <Menu.Target>
                  <Button variant="subtle" size="compact-md" color="gray" aria-label="Open menu">
                    <IconMenu2 size={24} />
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {links.map((l) => (
                    <Menu.Item key={l.to} onClick={() => navigate(l.to)}>
                      {l.label}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item onClick={toggleColorScheme}>
                    {isDark ? 'Light mode' : 'Dark mode'}
                  </Menu.Item>
                  {!isLoginPage && <Menu.Item onClick={() => navigate('/login')}>Log in</Menu.Item>}
                  {!isRegisterPage && <Menu.Item onClick={() => navigate('/register')}>Get Started Free</Menu.Item>}
                </Menu.Dropdown>
              </Menu>
            </Box>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

