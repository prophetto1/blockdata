import { Anchor, Box, Container, Group, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <Box component="footer" py="xl" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
        <Group justify="space-between" align="start">
          <Stack gap={4}>
            <Text fw={800} size="sm" style={{ letterSpacing: '-0.02em' }}>
              BlockData
            </Text>
            <Text size="xs" c="dimmed">Document Intelligence Platform</Text>
          </Stack>
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
