import {
  Group,
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
import { IconMenu2, IconArrowRight, IconMoon, IconSun } from '@tabler/icons-react';
import { useWindowScroll } from '@mantine/hooks';

export function PublicNavModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scroll] = useWindowScroll();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');

  const isScrolled = scroll.y > 20;
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
    { label: 'Docs', to: '/docs', external: true },
  ];

  // Dynamic colors based on scroll and theme
  const navBg = isScrolled
    ? 'var(--mantine-color-body)'
    : 'transparent';
    

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        backgroundColor: navBg,
        backdropFilter: isScrolled ? 'blur(12px)' : 'none',
        borderBottom: isScrolled 
            ? '1px solid var(--mantine-color-default-border)' 
            : '1px solid transparent',
        height: isScrolled ? 60 : 80,
      }}
    >
      <Container size="lg" h="100%">
        <Group h="100%" justify="space-between">
            {/* LOGO */}
          <Box style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img
              src={isDark ? '/logo-dark.png' : '/logo-light.png'}
              alt="BlockData"
              height={45}
              style={{ display: 'block' }}
            />
          </Box>

          {/* DESKTOP LINKS */}
            <Group gap={8} visibleFrom="sm" bg={isScrolled ? 'transparent' : 'var(--mantine-color-default-hover)'} p={4} style={{ borderRadius: 99 }}>
              {links.map((l) => (
                <Button
                  key={l.to}
                  size="sm"
                  variant="subtle"
                  radius="xl"
                  color={isDark ? 'gray' : 'dark'}
                  component={l.external ? 'a' : undefined}
                  href={l.external ? l.to : undefined}
                  style={{
                      // Use default color text, but force opacity for active state
                      opacity: location.pathname === l.to ? 1 : 0.7
                  }}
                  onClick={l.external ? undefined : () => navigate(l.to)}
                >
                  {l.label}
                </Button>
              ))}
            </Group>

          {/* ACTIONS */}
          <Group gap="sm">
            <Tooltip label={isDark ? 'Light mode' : 'Dark mode'}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
                color="gray"
              >
                {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>
            {!isLoginPage && (
              <Button
                variant="subtle"
                size="sm"
                color="gray"
                style={{ opacity: 0.8 }}
                onClick={() => navigate('/login')}
              >
                Log in
              </Button>
            )}
            {!isRegisterPage && (
              <Button
                size="sm"
                radius="xl"
                color="indigo"
                onClick={() => navigate('/register')}
                rightSection={<IconArrowRight size={16} />}
              >
                Get Started
              </Button>
            )}
            
            {/* MOBILE MENU */}
            <Box hiddenFrom="sm">
              <Menu width={200} position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="transparent" size="lg" aria-label="Open menu" color="gray">
                    <IconMenu2 size={24} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {links.map((l) => (
                    <Menu.Item
                      key={l.to}
                      component={l.external ? 'a' : undefined}
                      href={l.external ? l.to : undefined}
                      onClick={l.external ? undefined : () => navigate(l.to)}
                    >
                      {l.label}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item onClick={toggleColorScheme}>
                    {isDark ? 'Light mode' : 'Dark mode'}
                  </Menu.Item>
                  {!isLoginPage && <Menu.Item onClick={() => navigate('/login')}>Log in</Menu.Item>}
                  {!isRegisterPage && <Menu.Item onClick={() => navigate('/register')}>Sign up</Menu.Item>}
                </Menu.Dropdown>
              </Menu>
            </Box>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
