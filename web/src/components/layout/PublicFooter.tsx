import { Anchor, Box, Container, Group, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { Link } from 'react-router-dom';

export function PublicFooter() {
  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = (colorScheme === 'auto' ? computedColorScheme : colorScheme) === 'dark';

  return (
    <Box component="footer" py="xl" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Container size="xl">
        <Group justify="space-between">
          <img
            src={isDark ? '/logo-dark.png' : '/logo-light.png'}
            alt="BlockData"
            height={48}
            style={{ display: 'block', filter: 'grayscale(1)' }}
          />
          <Group gap="xl">
            <Anchor component={Link} to="/how-it-works" size="sm" c="dimmed">
              How it works
            </Anchor>
            <Anchor component={Link} to="/use-cases" size="sm" c="dimmed">
              Use cases
            </Anchor>
            <Anchor component={Link} to="/integrations" size="sm" c="dimmed">
              Integrations
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}

