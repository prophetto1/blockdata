import { Anchor, Box, Container, Group, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <Box component="footer" py="xl" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Container size="lg">
        <Group justify="space-between">
          <Text fw={700} size="sm">
            BlockData
          </Text>
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

