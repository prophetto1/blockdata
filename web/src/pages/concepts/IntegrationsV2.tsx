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
import { PublicNav } from '@/components/layout/PublicNav';

/**
 * CONCEPT: IntegrationsV2
 *
 * Full downstream integration story:
 * - The export contract (JSONL canonical, CSV/Parquet views)
 * - File-based pipelines (fine-tuning, eval, analytics, vectors, reconstruction)
 * - Push integrations (Neo4j, webhook, object storage)
 * - What people build downstream
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
    name: 'JSONL',
    badge: 'Canonical',
    badgeColor: 'green',
    when: 'ML pipelines, fine-tuning, evaluation sets, webhooks, inter-system transfer',
    detail: 'One record per line. Preserves nested structure. Streaming-friendly. This is the canonical format — all other formats are derived views.',
  },
  {
    icon: IconCsv,
    name: 'CSV',
    badge: 'Derived',
    badgeColor: 'gray',
    when: 'Analyst handoff, spreadsheet review, quick exploration',
    detail: 'Flat and universal. Overlay fields become columns. Loses nesting — best for simple schemas with flat field structures.',
  },
  {
    icon: IconDatabase,
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
    title: 'Fine-tuning datasets',
    text: 'Confirmed overlays are supervised training examples: block content → structured output. Export as JSONL in fine-tuning format. The staging/confirm flow is your quality gate — every training example is human-reviewed.',
  },
  {
    icon: IconTarget,
    title: 'Evaluation benchmarks',
    text: 'Confirmed overlays become gold-standard test cases. Version by schema + run for reproducible evaluation sets with full provenance. Every test item has a stable identity.',
  },
  {
    icon: IconChartBar,
    title: 'Analytical datasets',
    text: 'Flatten overlays to CSV or Parquet. Load into DuckDB, Pandas, or R. A 77-document project becomes a single queryable dataset with 5,000+ rows of structured paragraph-level data.',
  },
  {
    icon: IconVectorTriangle,
    title: 'Vector embedding stores',
    text: 'Export block content + metadata as JSONL. Embed and load into Pinecone, Weaviate, or pgvector. Overlay metadata becomes filterable attributes — search within a rhetorical function or document section.',
  },
  {
    icon: IconFileExport,
    title: 'Document reconstruction',
    text: 'For schemas with revised_content: reassemble confirmed blocks into a complete output document. Export the revised document alongside the JSONL audit trail.',
  },
];

const PUSH_INTEGRATIONS = [
  {
    icon: IconNetwork,
    title: 'Neo4j',
    text: 'Map overlay fields to nodes and edges. Push confirmed overlays into a graph database. Schemas can declare graph mappings — a corpus becomes a citation network or concept map automatically.',
  },
  {
    icon: IconWebhook,
    title: 'Webhook',
    text: 'POST JSONL to any endpoint when a run completes. Feed Airflow, Zapier, Make, or a custom service. Same canonical format as file export — no separate integration logic.',
  },
  {
    icon: IconCloud,
    title: 'Object storage',
    text: 'Export versioned Parquet to S3 or GCS. Register in a data catalog. Query via Trino, Athena, or BigQuery without additional infrastructure. Each run becomes a partition.',
  },
];

const DOWNSTREAM = [
  {
    icon: IconBrain,
    title: 'RAG with structured retrieval',
    text: 'Retrieve by block type + metadata constraints, not just semantic similarity. A RAG system that knows "give me only the holdings" outperforms naive chunking.',
  },
  {
    icon: IconShieldCheck,
    title: 'Compliance and audit trails',
    text: 'Every extraction traces to source hash, model, reviewer, and timestamp. The immutable envelope is a provenance chain. Export audit artifacts for regulated workflows.',
  },
  {
    icon: IconGitBranch,
    title: 'Multi-schema cross-referencing',
    text: 'Apply two schemas to the same document. Export both keyed by block_uid. Join them: which rhetorical moves appear in which structural sections?',
  },
  {
    icon: IconTransform,
    title: 'Batch document transformation',
    text: 'Upload 77 documents. Apply a revision schema. Export 77 revised documents with full provenance and a structured dataset describing every change.',
  },
];

export default function IntegrationsV2() {
  const navigate = useNavigate();

  return (
    <Box>
      <PublicNav />

      {/* ── HEADER ── */}
      <Box py={{ base: 56, md: 72 }}>
        <Container size="lg">
          <Stack gap="md" align="center">
            <Title
              order={1}
              ta="center"
              fz={{ base: 28, sm: 40 }}
              lh={1.1}
              maw={750}
              style={{ letterSpacing: '-0.02em' }}
            >
              Integrations start with a stable export contract.
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={700} lh={1.7}>
              Once overlays are confirmed, the platform produces canonical JSONL — one record per block, ordered, traceable, and ready for downstream systems. Everything else is a consumer of that artifact.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── EXPORT CONTRACT ── */}
      <Box py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="md">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">The contract</Text>
              <Title order={2} ta="center" fz={28}>One record per block. Full provenance.</Title>
            </Stack>

            <Paper withBorder radius="md" p="xl">
              <Code block style={{ fontSize: 12 }}>{JSONL_EXAMPLE}</Code>
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Text fw={700} size="sm">immutable</Text>
                  <Text size="sm" c="dimmed" lh={1.7}>
                    The block's identity and provenance. Source file hash, conversion method, block position and content. Same block → same hash → every time. This is what makes outputs joinable, auditable, and reproducible.
                  </Text>
                </Stack>
              </Paper>
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Text fw={700} size="sm">user_defined</Text>
                  <Text size="sm" c="dimmed" lh={1.7}>
                    The schema-driven overlay. Whatever fields your schema defines — metadata, revised content, or both — confirmed by a human, appear here. The platform doesn't constrain the shape.
                  </Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── EXPORT FORMATS ── */}
      <Box py={72}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">Formats</Text>
              <Title order={2} ta="center" fz={28}>JSONL is canonical. The rest are views.</Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {EXPORT_FORMATS.map((fmt) => (
                <Paper key={fmt.name} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="md">
                        <fmt.icon size={20} />
                      </ThemeIcon>
                      <Text fw={700}>{fmt.name}</Text>
                      <Badge variant="light" color={fmt.badgeColor} size="xs" radius="sm">
                        {fmt.badge}
                      </Badge>
                    </Group>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">Best for</Text>
                    <Text size="sm" c="dimmed" lh={1.7}>{fmt.when}</Text>
                    <Text size="sm" c="dimmed" lh={1.7}>{fmt.detail}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── FILE PIPELINES ── */}
      <Box py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">File-based pipelines</Text>
              <Title order={2} ta="center" fz={28}>Export the right file. Feed your stack.</Title>
              <Text c="dimmed" ta="center" maw={600}>
                No running services required. Just the right export format for your downstream consumer.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {FILE_PIPELINES.map((p) => (
                <Paper key={p.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="md" radius="md">
                        <p.icon size={16} />
                      </ThemeIcon>
                      <Text fw={700} size="sm">{p.title}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" lh={1.7}>{p.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── PUSH INTEGRATIONS ── */}
      <Box py={72}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">Push integrations</Text>
              <Title order={2} ta="center" fz={28}>The platform calls the destination.</Title>
              <Text c="dimmed" ta="center" maw={600}>
                Configure once. Confirmed overlays flow to your systems automatically.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {PUSH_INTEGRATIONS.map((p) => (
                <Paper key={p.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="md">
                        <p.icon size={20} />
                      </ThemeIcon>
                      <Text fw={700}>{p.title}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" lh={1.7}>{p.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── WHAT PEOPLE BUILD ── */}
      <Box py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">Downstream</Text>
              <Title order={2} ta="center" fz={28}>What people build on BlockData exports.</Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {DOWNSTREAM.map((d) => (
                <Paper key={d.title} p="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="md" radius="md">
                        <d.icon size={16} />
                      </ThemeIcon>
                      <Text fw={700} size="sm">{d.title}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" lh={1.7}>{d.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Divider />
      <Box py={88}>
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={30}>
              Build a dataset you can trust.
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={560}>
              Upload documents, define a schema, review results, and export a clean contract downstream.
            </Text>
            <Button
              size="lg"
              rightSection={<IconArrowRight size={18} />}
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
