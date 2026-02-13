import { Link } from 'react-router-dom';
import { Alert, Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBrain, IconInfoCircle, IconServer } from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';
import { featureFlags } from '@/lib/featureFlags';

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Account and platform controls." />

      <Group justify="flex-end" mb="md" maw={960}>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconServer size={14} />}
          component={Link}
          to="/app/settings/superuser"
        >
          Superuser Controls
        </Button>
      </Group>

      <Card withBorder radius="md" p="lg" maw={960}>
        <Stack gap="xs">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <IconBrain size={18} />
            </ThemeIcon>
            <Text fw={600}>Provider configuration lives in Agents</Text>
          </Group>

          <Text size="sm" c="dimmed">
            Provider credentials, default agent selection, onboarding, and MCP bindings are managed from the Agents
            surfaces.
          </Text>

          {featureFlags.agentsConfigUI ? (
            <Group mt="xs">
              <Button component={Link} to="/app/agents">
                Open Agents
              </Button>
              <Button variant="light" component={Link} to="/app/onboarding/agents/select">
                Run Onboarding
              </Button>
            </Group>
          ) : (
            <Alert icon={<IconInfoCircle size={16} />} color="yellow" mt="xs" title="Agents UI disabled">
              Agents configuration is currently disabled by feature flag. Enable `VITE_FF_AGENTS_CONFIG_UI` to use the
              provider setup flow.
            </Alert>
          )}
        </Stack>
      </Card>
    </>
  );
}
