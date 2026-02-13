import {
  Badge,
  Box,
  Button,
  Code,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBrain,
  IconChartBar,
  IconCloud,
  IconDatabase,
  IconFileExport,
  IconFileText,
  IconGitBranch,
  IconNetwork,
  IconShieldCheck,
  IconTable as IconCsv,
  IconTarget,
  IconTransform,
  IconVectorTriangle,
  IconWebhook,
  type TablerIcon,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNavModern } from '@/components/layout/PublicNavModern';

type ExportFormat = {
  icon: TablerIcon;
  name: string;
  badge: string;
  bestFor: string;
  detail: string;
};

type InfoCard = {
  icon: TablerIcon;
  title: string;
  text: string;
};

const JSONL_EXAMPLE = `{
  "document_id": "doc_abc123",
  "block_index": 42,
  "original_text": "The plaintiff alleges...",
  "metadata": {
    "source_page": 12,
    "timestamp": "2024-01-15T10:30:00Z",
    "document_name": "contract_v2.pdf"
  },
  "user_defined": {
    "rhetorical_function": "claim",
    "cited_authorities": ["Smith v. Jones"],
    "confidence": 0.94
  }
}`;

const EXPORT_FORMATS: ExportFormat[] = [
  {
    icon: IconFileText,
    name: 'JSONL',
    badge: 'Canonical',
    bestFor: 'ML pipelines, fine-tuning, evaluation sets, and webhook transfer.',
    detail: 'One record per line with nested structure preserved. All other formats are derived from this source.',
  },
  {
    icon: IconCsv,
    name: 'CSV',
    badge: 'Derived',
    bestFor: 'Spreadsheet review, analyst handoff, and quick QA passes.',
    detail: 'Flat columns for simple inspection. Nested structures are flattened for compatibility.',
  },
  {
    icon: IconDatabase,
    name: 'Parquet',
    badge: 'Derived',
    bestFor: 'Large analytics workloads and warehouse-style querying.',
    detail: 'Columnar compression with schema metadata for fast scan and low storage cost.',
  },
];

const FILE_PIPELINES: InfoCard[] = [
  {
    icon: IconBrain,
    title: 'Fine-tuning datasets',
    text: 'Confirmed overlays become supervised training examples with deterministic provenance.',
  },
  {
    icon: IconTarget,
    title: 'Evaluation benchmarks',
    text: 'Versioned exports become gold-standard test sets tied to schema and run IDs.',
  },
  {
    icon: IconChartBar,
    title: 'Analytical datasets',
    text: 'Export to CSV or Parquet and query thousands of processed blocks as one dataset.',
  },
  {
    icon: IconVectorTriangle,
    title: 'Vector stores',
    text: 'Ship content plus metadata to vector indexes with reliable filtering fields.',
  },
  {
    icon: IconFileExport,
    title: 'Document reconstruction',
    text: 'For revision schemas, reassemble confirmed blocks into complete revised documents.',
  },
];

const PUSH_INTEGRATIONS: InfoCard[] = [
  {
    icon: IconNetwork,
    title: 'Neo4j',
    text: 'Map fields to nodes and edges to produce citation and concept graphs.',
  },
  {
    icon: IconWebhook,
    title: 'Webhooks',
    text: 'POST completed run artifacts to any endpoint for downstream automation.',
  },
  {
    icon: IconCloud,
    title: 'Object storage',
    text: 'Publish versioned data exports to S3 or GCS for lakehouse workflows.',
  },
];

const DOWNSTREAM: InfoCard[] = [
  {
    icon: IconBrain,
    title: 'RAG with structured retrieval',
    text: 'Retrieve by semantic meaning and confirmed metadata, not embeddings alone.',
  },
  {
    icon: IconShieldCheck,
    title: 'Compliance and audit',
    text: 'Every exported row traces to source, model behavior, and review decisions.',
  },
  {
    icon: IconGitBranch,
    title: 'Cross-schema joins',
    text: 'Join outputs from multiple schemas on stable block identity fields.',
  },
  {
    icon: IconTransform,
    title: 'Batch transformation',
    text: 'Transform large corpora with predictable output contracts for each run.',
  },
];

export default function IntegrationsV2({ withNav = true }: { withNav?: boolean }) {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Box bg={isDark ? 'var(--mantine-color-body)' : '#f6f6f7'}>
      {withNav && <PublicNavModern />}

      <Box
        pt={{ base: 112, md: 146 }}
        pb={{ base: 72, md: 96 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%)'
            : 'radial-gradient(circle at 30% 0%, rgba(15,23,42,0.06) 0%, rgba(15,23,42,0) 70%)',
        }}
      >
        <Container
          size="xl"
          px={{ base: 'md', md: 'xl' }}
          style={{ position: 'relative', zIndex: 1, maxWidth: 1360 }}
        >
          <Stack gap="lg" align="center">
            <Title
              order={1}
              ta="center"
              style={{
                fontSize: 'clamp(2.25rem, 4.2vw, 3.7rem)',
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              Integrations start with a
              <br />
              stable export contract.
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={760} style={{ lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              Every processed block exports to a predictable JSONL structure. Build pipelines once, run them forever.
            </Text>
          </Stack>
        </Container>
      </Box>

      <Box py={{ base: 64, md: 88 }} bg="var(--mantine-color-default-hover)">
        <Container size="xl" px={{ base: 'md', md: 'xl' }} style={{ maxWidth: 1360 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 'xl', md: 56 }}>
            <Stack gap="md" maw={560}>
              <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                The Export Contract
              </Title>
              <Text size="xl" c="dimmed" lh={1.6}>
                Every BlockData export follows a stable contract with two sections.
              </Text>
              <Stack gap={6} mt="xs">
                <Text fw={700} size="xl">
                  Immutable section
                </Text>
                <Text c="dimmed" size="lg" lh={1.6}>
                  `document_id`, `block_index`, `original_text`, and source metadata are guaranteed provenance fields that never change.
                </Text>
              </Stack>
              <Stack gap={6} mt="xs">
                <Text fw={700} size="xl">
                  User-defined section
                </Text>
                <Text c="dimmed" size="lg" lh={1.6}>
                  Your schema fields sit alongside immutable data. This is where extracted or revised content lives.
                </Text>
              </Stack>
              <Text size="xl" lh={1.6} mt="sm">
                <Text component="span" fw={700}>
                  Immutable fields guarantee provenance.
                </Text>{' '}
                User schema fields sit alongside them, never replacing them.
              </Text>
            </Stack>

            <Box style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Paper
                withBorder
                radius="lg"
                p={{ base: 'md', md: 'lg' }}
                bg="#14161b"
                style={{
                  width: '100%',
                  maxWidth: 620,
                  boxShadow: isDark
                    ? '0 20px 42px rgba(0,0,0,0.45)'
                    : '0 18px 36px rgba(15,23,42,0.12)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Group gap="xs" mb="md" pb="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <Text size="xs" c="dimmed" fw={500}>
                    block_export.jsonl
                  </Text>
                </Group>
                <Box style={{ maxHeight: 420, overflow: 'auto' }}>
                  <Code
                    block
                    bg="transparent"
                    style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', lineHeight: 1.62, whiteSpace: 'pre' }}
                  >
                    {JSONL_EXAMPLE}
                  </Code>
                </Box>
              </Paper>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      <Box py={{ base: 72, md: 96 }}>
        <Container size="xl" px={{ base: 'md', md: 'xl' }} style={{ maxWidth: 1360 }}>
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="sm">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Formats
              </Text>
              <Title order={2} ta="center">
                JSONL is canonical.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {EXPORT_FORMATS.map((fmt) => (
                <Paper key={fmt.name} p="xl" radius="md" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Group gap="sm" align="center">
                        <ThemeIcon variant="default" size="lg" radius="md">
                          <fmt.icon size={18} />
                        </ThemeIcon>
                        <Text fw={700} size="lg">
                          {fmt.name}
                        </Text>
                      </Group>
                      <Badge variant={fmt.badge === 'Canonical' ? 'filled' : 'default'} color={fmt.badge === 'Canonical' ? 'teal' : 'gray'}>
                        {fmt.badge}
                      </Badge>
                    </Group>
                    <Stack gap="xs">
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        Best for
                      </Text>
                      <Text size="sm" lh={1.6}>
                        {fmt.bestFor}
                      </Text>
                    </Stack>
                    <Stack gap="xs">
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        Details
                      </Text>
                      <Text size="sm" c="dimmed" lh={1.6}>
                        {fmt.detail}
                      </Text>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Box py={{ base: 72, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container size="xl" px={{ base: 'md', md: 'xl' }} style={{ maxWidth: 1360 }}>
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="sm">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Pipelines
              </Text>
              <Title order={2} ta="center">
                Export the right file.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {FILE_PIPELINES.map((item) => (
                <Paper key={item.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="default" size="md" radius="md">
                        <item.icon size={16} />
                      </ThemeIcon>
                      <Text fw={700} size="lg">
                        {item.title}
                      </Text>
                    </Group>
                    <Text size="md" c="dimmed" lh={1.6}>
                      {item.text}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Box py={{ base: 72, md: 96 }}>
        <Container size="xl" px={{ base: 'md', md: 'xl' }} style={{ maxWidth: 1360 }}>
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="sm">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Push integrations
              </Text>
              <Title order={2} ta="center">
                The platform calls you.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {PUSH_INTEGRATIONS.map((item) => (
                <Paper key={item.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="default" size="md" radius="md">
                        <item.icon size={16} />
                      </ThemeIcon>
                      <Text fw={700} size="lg">
                        {item.title}
                      </Text>
                    </Group>
                    <Text size="md" c="dimmed" lh={1.6}>
                      {item.text}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Box py={{ base: 72, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container size="xl" px={{ base: 'md', md: 'xl' }} style={{ maxWidth: 1360 }}>
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="sm">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Downstream
              </Text>
              <Title order={2} ta="center">
                What teams build.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {DOWNSTREAM.map((item) => (
                <Paper key={item.title} p="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="default" size="md" radius="md">
                        <item.icon size={16} />
                      </ThemeIcon>
                      <Text fw={700} size="lg">
                        {item.title}
                      </Text>
                    </Group>
                    <Text size="md" c="dimmed" lh={1.6}>
                      {item.text}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Box py={{ base: 80, md: 112 }}>
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={{ base: 36, md: 44 }}>
              Build a dataset you can trust.
            </Title>
            <Text ta="center" c="dimmed" size="xl" maw={600}>
              Upload documents, define a schema, review results, and export a clean contract downstream.
            </Text>
            <Button size="xl" rightSection={<IconArrowRight size={18} />} onClick={() => navigate('/register')}>
              Get started
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
