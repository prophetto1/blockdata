import {
  Group,
  Text,
  Button,
  ActionIcon,
  Box,
  Container,
  Menu,
} from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconMenu2, IconArrowRight } from '@tabler/icons-react';
import { useWindowScroll } from '@mantine/hooks';

export function PublicNavModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scroll] = useWindowScroll();

  const isScrolled = scroll.y > 20;

  const links = [
    { label: 'How it works', to: '/concepts/how-it-works-modern' },
    { label: 'Use cases', to: '/concepts/use-cases-modern' },
    { label: 'Integrations', to: '/concepts/integrations-modern' },
  ];

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        backgroundColor: isScrolled 
            ? 'rgba(26, 27, 30, 0.8)' // Dark glass
            : 'transparent',
        backdropFilter: isScrolled ? 'blur(12px)' : 'none',
        borderBottom: isScrolled 
            ? '1px solid rgba(255,255,255,0.1)' 
            : '1px solid transparent',
        height: isScrolled ? 60 : 80,
      }}
    >
      <Container size="lg" h="100%">
        <Group h="100%" justify="space-between">
            {/* LOGO */}
          <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
             <div style={{ 
                 width: 24, 
                 height: 24, 
                 background: 'var(--mantine-color-indigo-6)',
                 borderRadius: 6 
             }} />
             <Text
                fw={800}
                size="xl"
                style={{ 
                    color: 'white', 
                    letterSpacing: '-0.5px' 
                }}
            >
              BlockData
            </Text>
          </Group>

          {/* DESKTOP LINKS */}
            <Group gap={8} visibleFrom="sm" bg="rgba(255,255,255,0.05)" p={4} style={{ borderRadius: 99 }}>
              {links.map((l) => (
                <Button
                  key={l.to}
                  size="sm"
                  variant="subtle"
                  radius="xl"
                  style={{ 
                      color: 'white',
                      opacity: location.pathname === l.to ? 1 : 0.7 
                  }}
                  onClick={() => navigate(l.to)}
                >
                  {l.label}
                </Button>
              ))}
            </Group>

          {/* ACTIONS */}
          <Group gap="sm">
            <Button 
                variant="subtle" 
                size="sm" 
                style={{ color: 'white', opacity: 0.8 }}
                onClick={() => navigate('/login')}
            >
              Log in
            </Button>
            <Button 
                size="sm" 
                radius="xl"
                color="indigo"
                onClick={() => navigate('/register')}
                rightSection={<IconArrowRight size={16} />}
            >
              Get Started
            </Button>
            
            {/* MOBILE MENU */}
            <Box hiddenFrom="sm">
              <Menu width={200} position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="transparent" size="lg" aria-label="Open menu" style={{ color: 'white' }}>
                    <IconMenu2 size={24} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {links.map((l) => (
                    <Menu.Item key={l.to} onClick={() => navigate(l.to)}>
                      {l.label}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item onClick={() => navigate('/login')}>Log in</Menu.Item>
                  <Menu.Item onClick={() => navigate('/register')}>Sign up</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
