import {
  ActionIcon,
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
import { IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';

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
      <Container h="100%" px={{ base: 'md', sm: 'lg', md: 'xl' }}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <UnstyledButton
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Text fw={800} fz={21} style={{ letterSpacing: '-0.02em' }}>
              BlockData
            </Text>
          </UnstyledButton>

          <Group gap={32} visibleFrom="sm">
            {links.map((l) => {
              const isActive = location.pathname === l.to;
              return (
                <UnstyledButton key={l.to} onClick={() => navigate(l.to)}>
                  <Text
                    size="md"
                    fw={500}
                    c={isActive ? 'teal.5' : 'dimmed'}
                    style={{
                      letterSpacing: '-0.01em',
                      transition: 'color 150ms ease',
                    }}
                  >
                    {l.label}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Group>

          <Group gap="sm" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={toggleColorScheme}
              aria-label="Toggle color scheme"
              visibleFrom="sm"
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            {!isLoginPage && (
              <UnstyledButton
                onClick={() => navigate('/login')}
                visibleFrom="sm"
              >
                <Text size="md" fw={500} c="dimmed" style={{ transition: 'color 150ms ease' }}>
                  Log in
                </Text>
              </UnstyledButton>
            )}
            {!isRegisterPage && (
              <Button
                size="sm"
                radius="xl"
                color="teal"
                onClick={() => navigate('/register')}
              >
                Get Started
              </Button>
            )}

            <Box hiddenFrom="sm">
              <Menu width={220} position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" size="lg" color="gray" aria-label="Open menu">
                    <IconMenu2 size={22} />
                  </ActionIcon>
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
                  {!isRegisterPage && <Menu.Item onClick={() => navigate('/register')}>Get Started</Menu.Item>}
                </Menu.Dropdown>
              </Menu>
            </Box>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
