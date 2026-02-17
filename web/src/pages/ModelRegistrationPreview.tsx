import { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Divider,
  Grid,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCloud, IconCpu, IconPlugConnected, IconUser } from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';

type UserProvider = 'openai' | 'google' | 'custom';
type PlatformTransport = 'vertex_ai' | 'litellm_openai';

type MockConnection = {
  id: string;
  provider: UserProvider;
  label: string;
  model: string;
  status: 'active' | 'draft';
  updatedAt: string;
};

const MOCK_CONNECTIONS: MockConnection[] = [
  {
    id: 'conn_01',
    provider: 'openai',
    label: 'OpenAI Team Key',
    model: 'gpt-4.1-mini',
    status: 'active',
    updatedAt: '2026-02-17 13:25',
  },
  {
    id: 'conn_02',
    provider: 'custom',
    label: 'Local Model Endpoint',
    model: 'qwen2.5-32b-instruct',
    status: 'draft',
    updatedAt: '2026-02-17 11:10',
  },
];

export default function ModelRegistrationPreview() {
  const [provider, setProvider] = useState<UserProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:1234/v1');
  const [model, setModel] = useState('gpt-4.1-mini');
  const [projectOverride, setProjectOverride] = useState(false);

  const [transport, setTransport] = useState<PlatformTransport>('litellm_openai');
  const [platformBaseUrl, setPlatformBaseUrl] = useState('http://localhost:4000/v1');
  const [platformModel, setPlatformModel] = useState('claude-3-5-sonnet');
  const [platformRoutingKey, setPlatformRoutingKey] = useState('platform-default');

  const requiresBaseUrl = provider === 'custom';
  const showBaseUrl = provider === 'custom';

  const effectiveRuntime = useMemo(() => {
    if (projectOverride) {
      return {
        source: 'User connection override',
        transport: 'openai-compatible',
        endpoint: showBaseUrl ? baseUrl || '(not set)' : '(provider default)',
        model,
      };
    }
    return {
      source: 'Platform default',
      transport,
      endpoint: transport === 'litellm_openai' ? platformBaseUrl || '(not set)' : '(managed vertex runtime)',
      model: platformModel,
    };
  }, [baseUrl, model, platformBaseUrl, platformModel, projectOverride, showBaseUrl, transport]);

  const handleMockTest = () => {
    notifications.show({
      color: 'blue',
      title: 'Mock test only',
      message: 'No API call executed. This page is visual-only for UX validation.',
    });
  };

  const handleMockSave = () => {
    notifications.show({
      color: 'green',
      title: 'Mock save complete',
      message: 'No backend write executed. Wire `user-api-keys` and runtime policy later.',
    });
  };

  return (
    <>
      <PageHeader
        title="Model Registration Preview"
        subtitle="Visual-only dashboard for user BYO models + platform LiteLLM policy."
      />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="md">
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <IconUser size={18} />
                  <Title order={4}>User Model Connection</Title>
                </Group>
                <Badge variant="light" color="blue">Preview</Badge>
              </Group>

              <Stack gap="sm">
                <Select
                  label="Provider"
                  value={provider}
                  onChange={(value) => setProvider((value as UserProvider) ?? 'openai')}
                  data={[
                    { value: 'openai', label: 'OpenAI Direct' },
                    { value: 'google', label: 'Google AI Studio' },
                    { value: 'custom', label: 'Custom OpenAI-compatible' },
                  ]}
                />

                <PasswordInput
                  label="API Key"
                  placeholder="Paste key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.currentTarget.value)}
                />

                {showBaseUrl && (
                  <TextInput
                    label="Base URL"
                    description="Required for custom endpoints"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.currentTarget.value)}
                    required={requiresBaseUrl}
                  />
                )}

                <TextInput
                  label="Default Model"
                  value={model}
                  onChange={(e) => setModel(e.currentTarget.value)}
                />

                <Group>
                  <Button variant="light" leftSection={<IconPlugConnected size={16} />} onClick={handleMockTest}>
                    Test Connection
                  </Button>
                  <Button onClick={handleMockSave}>
                    Save Connection
                  </Button>
                </Group>
              </Stack>
            </Card>

            <Card withBorder radius="md" p="md">
              <Group justify="space-between" mb="sm">
                <Title order={5}>Registered Connections (Mock)</Title>
                <Badge variant="dot" color="gray">Local state only</Badge>
              </Group>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Label</Table.Th>
                    <Table.Th>Provider</Table.Th>
                    <Table.Th>Model</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Updated</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {MOCK_CONNECTIONS.map((conn) => (
                    <Table.Tr key={conn.id}>
                      <Table.Td>{conn.label}</Table.Td>
                      <Table.Td><Code>{conn.provider}</Code></Table.Td>
                      <Table.Td><Code>{conn.model}</Code></Table.Td>
                      <Table.Td>
                        <Badge color={conn.status === 'active' ? 'green' : 'gray'} variant="light">
                          {conn.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{conn.updatedAt}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="md">
              <Group gap="xs" mb="sm">
                <IconCpu size={18} />
                <Title order={4}>Platform AI (Admin)</Title>
              </Group>

              <Stack gap="sm">
                <Text size="sm" fw={500}>Transport</Text>
                <SegmentedControl
                  value={transport}
                  onChange={(value) => setTransport((value as PlatformTransport) ?? 'vertex_ai')}
                  data={[
                    { label: 'Vertex', value: 'vertex_ai' },
                    { label: 'LiteLLM', value: 'litellm_openai' },
                  ]}
                />

                {transport === 'litellm_openai' && (
                  <TextInput
                    label="LiteLLM Base URL"
                    value={platformBaseUrl}
                    onChange={(e) => setPlatformBaseUrl(e.currentTarget.value)}
                  />
                )}

                <TextInput
                  label="Platform Default Model"
                  value={platformModel}
                  onChange={(e) => setPlatformModel(e.currentTarget.value)}
                />

                <TextInput
                  label="Routing Policy Key"
                  value={platformRoutingKey}
                  onChange={(e) => setPlatformRoutingKey(e.currentTarget.value)}
                />

                <Button variant="default" onClick={handleMockSave}>
                  Save Platform Policy
                </Button>
              </Stack>
            </Card>

            <Card withBorder radius="md" p="md">
              <Group gap="xs" mb="sm">
                <IconCloud size={18} />
                <Title order={5}>Effective Runtime Preview</Title>
              </Group>
              <Stack gap="xs">
                <Switch
                  label="Use user connection override for current project"
                  checked={projectOverride}
                  onChange={(e) => setProjectOverride(e.currentTarget.checked)}
                />

                <Divider />

                <Paper withBorder p="sm" radius="sm">
                  <Stack gap={4}>
                    <Text size="sm"><strong>Source:</strong> {effectiveRuntime.source}</Text>
                    <Text size="sm"><strong>Transport:</strong> <Code>{effectiveRuntime.transport}</Code></Text>
                    <Text size="sm"><strong>Endpoint:</strong> <Code>{effectiveRuntime.endpoint}</Code></Text>
                    <Text size="sm"><strong>Model:</strong> <Code>{effectiveRuntime.model}</Code></Text>
                  </Stack>
                </Paper>
              </Stack>
            </Card>

            <Box>
              <Text c="dimmed" size="xs">
                This screen is intentionally isolated from Supabase Edge Functions and DB writes.
                It is a UX prototype only.
              </Text>
            </Box>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
