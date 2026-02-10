import {
  Box,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Paper,
  ThemeIcon,
  Badge,
  Code,
  Divider,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconFileText,
  IconTable as IconCsv,
  IconDatabase,
  IconBrain,
  IconTarget,
  IconChartBar,
  IconVectorTriangle,
  IconFileExport,
  IconNetwork,
  IconWebhook,
  IconCloud,
  IconShieldCheck,
  IconGitBranch,
  IconTransform,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNavModern } from '@/components/layout/PublicNavModern';

/**
 * Integrations — v2.1
 *
 * v2.1 improvements:
 * - Theme-adaptive hero (no hardcoded white)
 * - Colored ThemeIcons per card for visual variety
 */

const JSONL_EXAMPLE = `{
  "immutable": {
    "source_upload": {
      "source_uid": "a7c3…",
      "filename": "brief.docx",
      "source_type": "docx"
    },
    "conversion": {
      "conv_uid": "f29b…",
      "conv_parsing_tool": "docling"
    },
    "block": {
      "block_uid": "f29b…:42",
      "block_type": "paragraph",
      "block_content": "The court held that…"
    }
  },
  "user_defined": {
    "schema_ref": "legal_analysis_v1",
    "data": {
      "rhetorical_function": "holding",
      "cited_authorities": ["Marbury v. Madison"],
      "revised_content": "The court decided that…"
    }
  }
}`;

const EXPORT_FORMATS = [
  {
    icon: IconFileText,
    color: 'green',
    name: 'JSONL',
    badge: 'Canonical',
    badgeColor: 'green',
    when: 'ML pipelines, fine-tuning, evaluation sets, webhooks, inter-system transfer',
    detail: 'One record per line. Preserves nested structure. Streaming-friendly. This is the canonical format — all other formats are derived views.',
  },
  {
    icon: IconCsv,
    color: 'blue',
    name: 'CSV',
    badge: 'Derived',
    badgeColor: 'gray',
    when: 'Analyst handoff, spreadsheet review, quick exploration',
    detail: 'Flat and universal. Overlay fields become columns. Loses nesting — best for simple schemas with flat field structures.',
  },
  {
    icon: IconDatabase,
    color: 'violet',
    name: 'Parquet',
    badge: 'Derived',
    badgeColor: 'gray',
    when: 'Large-scale analytics, data lake storage, warehouse queries',
    detail: 'Columnar compression. Schema-embedded. Queryable in place via DuckDB, Trino, Athena, or BigQuery without loading into memory.',
  },
];

const FILE_PIPELINES = [
  {
    icon: IconBrain,
    color: 'orange',
    title: 'Fine-tuning datasets',
    text: 'Confirmed overlays are supervised training examples: block content → structured output. Export as JSONL in fine-tuning format. The staging/confirm flow is your quality gate — every training example is human-reviewed.',
  },
  {
    icon: IconTarget,
    color: 'green',
    title: 'Evaluation benchmarks',
    text: 'Confirmed overlays become gold-standard test cases. Version by schema + run for reproducible evaluation sets with full provenance. Every test item has a stable identity.',
  },
  {
    icon: IconChartBar,
    color: 'blue',
    title: 'Analytical datasets',
    text: 'Flatten overlays to CSV or Parquet. Load into DuckDB, Pandas, or R. A 77-document project becomes a single queryable dataset with 5,000+ rows of structured paragraph-level data.',
  },
  {
    icon: IconVectorTriangle,
    color: 'violet',
    title: 'Vector embedding stores',
    text: 'Export block content + metadata as JSONL. Embed and load into Pinecone, Weaviate, or pgvector. Overlay metadata becomes filterable attributes — search within a rhetorical function or document section.',
  },
  {
    icon: IconFileExport,
    color: 'teal',
    title: 'Document reconstruction',
    text: 'For schemas with revised_content: reassemble confirmed blocks into a complete output document. Export the revised document alongside the JSONL audit trail.',
  },
];

const PUSH_INTEGRATIONS = [
  {
    icon: IconNetwork,
    color: 'blue',
    title: 'Neo4j',
    text: 'Map overlay fields to nodes and edges. Push confirmed overlays into a graph database. Schemas can declare graph mappings — a corpus becomes a citation network or concept map automatically.',
  },
  {
    icon: IconWebhook,
    color: 'orange',
    title: 'Webhook',
    text: 'POST JSONL to any endpoint when a run completes. Feed Airflow, Zapier, Make, or a custom service. Same canonical format as file export — no separate integration logic.',
  },
  {
    icon: IconCloud,
    color: 'violet',
    title: 'Object storage',
    text: 'Export versioned Parquet to S3 or GCS. Register in a data catalog. Query via Trino, Athena, or BigQuery without additional infrastructure. Each run becomes a partition.',
  },
];

const DOWNSTREAM = [
  {
    icon: IconBrain,
    color: 'blue',
    title: 'RAG with structured retrieval',
    text: 'Retrieve by block type + metadata constraints, not just semantic similarity. A RAG system that knows "give me only the holdings" outperforms naive chunking.',
  },
  {
    icon: IconShieldCheck,
    color: 'green',
    title: 'Compliance and audit trails',
    text: 'Every extraction traces to source hash, model, reviewer, and timestamp. The immutable envelope is a provenance chain. Export audit artifacts for regulated workflows.',
  },
  {
    icon: IconGitBranch,
    color: 'violet',
    title: 'Multi-schema cross-referencing',
    text: 'Apply two schemas to the same document. Export both keyed by block_uid. Join them: which rhetorical moves appear in which structural sections?',
  },
  {
    icon: IconTransform,
    color: 'teal',
    title: 'Batch document transformation',
    text: 'Upload 77 documents. Apply a revision schema. Export 77 revised documents with full provenance and a structured dataset describing every change.',
  },
];

export default function IntegrationsV2({ withNav = true }: { withNav?: boolean }) {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Box bg="var(--mantine-color-body)">
      {withNav && <PublicNavModern />}

      {/* ── HERO ── */}
      <Box
        pt={{ base: 120, md: 180 }}
        pb={{ base: 80, md: 120 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%)'
            : 'radial-gradient(circle at 30% 0%, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 70%)',
        }}
      >
        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
          <Stack gap="xl" align="center">
            <Badge
              variant="filled"
              color="gray"
              size="lg"
              radius="xl"
              tt="none"
              bg={isDark ? 'rgba(255,255,255,0.1)' : 'var(--mantine-color-default-border)'}
              c="var(--mantine-color-text)"
            >
              Ecosystem
            </Badge>
            <Title
              order={1}
              ta="center"
              style={{
                fontSize: 'clamp(3rem, 5vw, 4.5rem)',
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              Export & Integrate
            </Title>
            <Text ta="center" c="dimmed" size="xl" maw={700} lh={1.6}>
              Once overlays are confirmed, the platform produces canonical JSONL — traceable, auditable, and ready for your stack.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── EXPORT CONTRACT ── */}
      <Box py={100} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">The contract</Text>
              <Title order={2} ta="center" fz={40}>One record per block.</Title>
            </Stack>

            <Paper
              withBorder
              radius="lg"
              p="xl"
              bg="#1A1B1E"
              style={{
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Group gap="xs" mb="md" pb="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Text size="xs" c="dimmed" fw={500}>block_export.jsonl</Text>
              </Group>
              <Code block bg="transparent" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{JSONL_EXAMPLE}</Code>
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Text fw={700} size="lg">Immutable</Text>
                  <Text size="md" c="dimmed" lh={1.6}>
                    The block's identity and provenance. Source file hash, conversion method, block position and content. Same block → same hash → every time. This is what makes outputs joinable, auditable, and reproducible.
                  </Text>
                </Stack>
              </Paper>
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Text fw={700} size="lg">User Defined</Text>
                  <Text size="md" c="dimmed" lh={1.6}>
                    The schema-driven overlay. Whatever fields your schema defines — metadata, revised content, or both — confirmed by a human, appear here. The platform doesn't constrain the shape.
                  </Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── EXPORT FORMATS ── */}
      <Box py={100}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">Formats</Text>
              <Title order={2} ta="center" fz={32}>JSONL is canonical.</Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {EXPORT_FORMATS.map((fmt) => (
                <Paper key={fmt.name} p="xl" radius="md" withBorder>
                  <Stack gap="md">
                    <Group gap="sm" justify="space-between">
                      <Group gap="sm">
                        <ThemeIcon variant="light" size="lg" radius="md" color={fmt.color}>
                          <fmt.icon size={20} />
                        </ThemeIcon>
                        <Text fw={700} size="lg">{fmt.name}</Text>
                      </Group>
                      <Badge variant="light" color={fmt.badgeColor} size="sm" radius="sm">
                        {fmt.badge}
                      </Badge>
                    </Group>
                    <Divider />
                    <Stack gap="xs">
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">Best for</Text>
                      <Text size="sm" style={{ fontWeight: 500 }} lh={1.5}>{fmt.when}</Text>
                    </Stack>
                    <Stack gap="xs">
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">Details</Text>
                      <Text size="sm" c="dimmed" lh={1.6}>{fmt.detail}</Text>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── FILE PIPELINES ── */}
      <Box py={100} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">Pipelines</Text>
              <Title order={2} ta="center" fz={32}>Export the right file.</Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {FILE_PIPELINES.map((p) => (
                <Paper key={p.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="md">
                      <ThemeIcon variant="light" size="lg" radius="md" color={p.color}>
                        <p.icon size={22} />
                      </ThemeIcon>
                      <Text fw={700} size="lg">{p.title}</Text>
                    </Group>
                    <Text size="md" c="dimmed" lh={1.6}>{p.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── PUSH INTEGRATIONS ── */}
      <Box py={100}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">Push integrations</Text>
              <Title order={2} ta="center" fz={32}>The platform calls you.</Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {PUSH_INTEGRATIONS.map((p) => (
                <Paper key={p.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="md">
                      <ThemeIcon variant="light" size="lg" radius="md" color={p.color}>
                        <p.icon size={22} />
                      </ThemeIcon>
                      <Text fw={700} size="lg">{p.title}</Text>
                    </Group>
                    <Text size="md" c="dimmed" lh={1.6}>{p.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── WHAT PEOPLE BUILD ── */}
      <Box py={100} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">Downstream</Text>
              <Title order={2} ta="center" fz={32}>What developers build.</Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {DOWNSTREAM.map((d) => (
                <Paper key={d.title} p="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="md" radius="md" color={d.color}>
                        <d.icon size={16} />
                      </ThemeIcon>
                      <Text fw={700} size="lg">{d.title}</Text>
                    </Group>
                    <Text size="md" c="dimmed" lh={1.6}>{d.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box py={120}>
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={40}>
              Build a dataset you can trust.
            </Title>
            <Text ta="center" c="dimmed" size="xl" maw={600} lh={1.6}>
              Upload documents, define a schema, review results, and export a clean contract downstream.
            </Text>
            <Button
              size="xl"
              rightSection={<IconArrowRight size={20} />}
              onClick={() => navigate('/register')}
            >
              Get started
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
