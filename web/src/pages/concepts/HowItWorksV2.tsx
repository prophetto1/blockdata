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
  Timeline,
} from '@mantine/core';
import {
  IconArrowRight,
  IconUpload,
  IconLayoutGrid,
  IconSchema,
  IconBolt,
  IconChecks,
  IconFileExport,
  IconX,
  IconCheck,
  IconMinus,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '@/components/layout/PublicNav';

/**
 * CONCEPT: HowItWorksV2
 *
 * The mechanism page. Explains:
 * - The full pipeline (upload → decompose → schema → process → review → export)
 * - Schema flexibility with concrete examples
 * - Why block-level processing beats document-level AI
 * - The staging/confirm flow
 * - Parallel processing made visceral
 * - What the grid looks like
 */

const PIPELINE = [
  {
    icon: IconUpload,
    title: 'Upload',
    body: 'Drop in documents — Markdown, Word, PDF, plain text. Multiple files at once. The platform handles format conversion internally via Docling (DOCX/PDF) or mdast (Markdown).',
  },
  {
    icon: IconLayoutGrid,
    title: 'Decompose into blocks',
    body: 'Every document is split into ordered, typed blocks — paragraphs, headings, tables, code, lists, footnotes. Each block gets a stable identity hash computed from its content and position. Re-upload the same file and you get the same block IDs.',
  },
  {
    icon: IconSchema,
    title: 'Define your schema',
    body: 'Write a JSON schema describing what you want per block. Fields for metadata extraction, a revised_content field for rewriting, prompt instructions for the AI — your schema is the complete instruction set. The platform doesn\'t constrain what goes in it.',
  },
  {
    icon: IconBolt,
    title: 'Process in parallel',
    body: 'Concurrent AI workers claim blocks atomically and process them independently. Each block gets the same schema and instructions — paragraph 1 and paragraph 4,000 receive identical treatment. 20 workers on 5,000 blocks finishes in minutes.',
  },
  {
    icon: IconChecks,
    title: 'Review and confirm',
    body: 'AI results land in a staging column — never directly in the final output. You review results in the grid, edit inline if needed, and confirm per-block or in bulk. Nothing reaches the export boundary without human approval.',
  },
  {
    icon: IconFileExport,
    title: 'Export',
    body: 'Confirmed results export as canonical JSONL — one record per block with full provenance. Also available as CSV or Parquet. For revision schemas, confirmed blocks reassemble into a complete revised document.',
  },
];

const COMPARISON = [
  {
    label: '200-page document',
    docLevel: 'One prompt. One pass. Quality degrades by page 40.',
    blockData: '800+ blocks. Each processed with identical instructions.',
  },
  {
    label: 'Traceability',
    docLevel: '"The model said…" — no source reference.',
    blockData: 'Block 247: paragraph 3 of section 4.2.',
  },
  {
    label: 'Parallelism',
    docLevel: 'Sequential. One document at a time.',
    blockData: '20 concurrent workers. Atomic claims. No double-processing.',
  },
  {
    label: 'Human review',
    docLevel: 'Read the entire output. Hope nothing was missed.',
    blockData: 'Per-block staging. Inline editing. Bulk confirm.',
  },
  {
    label: 'Scale',
    docLevel: '1 document per session.',
    blockData: '77 documents. 5,000+ blocks. One project.',
  },
];

const SCHEMA_DETAIL = [
  {
    label: 'Metadata extraction',
    description: 'Schema defines fields that describe the source content without modifying it. Each block gets structured labels — classifications, entities, scores, tags.',
    example: '{ "rhetorical_function": "holding", "cited_authorities": ["Marbury v. Madison"], "confidence": 0.92 }',
    output: 'JSONL where each block carries the original content plus metadata fields. Feed into analytics, knowledge graphs, or vector stores.',
    color: 'blue',
  },
  {
    label: 'Content revision',
    description: 'Schema includes a revised_content field and prompt instructions for rewriting. AI produces a revised version of each block according to your rules.',
    example: '{ "revised_content": "The court decided that…", "changes_made": ["simplified legal jargon", "reduced sentence length"] }',
    output: 'Confirmed revised blocks reassemble into a complete document. Export the revised document and the JSONL audit trail.',
    color: 'green',
  },
  {
    label: 'Combined',
    description: 'Schema instructs the AI to both revise content and produce metadata about the revision. Source → rules → revised content → metadata on the revision.',
    example: '{ "revised_content": "…", "original_reading_level": "graduate", "revised_reading_level": "8th_grade", "compliance_status": "pass" }',
    output: 'Revised document plus a structured dataset describing every transformation decision. Both artifacts export from the same confirmed overlays.',
    color: 'violet',
  },
];

const CONCURRENCY_TABLE = [
  { workers: 1, time: '~4 hours', bar: 4 },
  { workers: 10, time: '~25 min', bar: 25 },
  { workers: 20, time: '~12 min', bar: 60 },
  { workers: 50, time: '~5 min', bar: 95 },
];

export default function HowItWorksV2() {
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
              maw={800}
              style={{ letterSpacing: '-0.02em' }}
            >
              Every block gets the same instructions. Every result traces to its source.
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={680} lh={1.7}>
              The platform decomposes documents into blocks, applies your schema per block in parallel, and stages results for human review before export.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── PIPELINE ── */}
      <Box py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="md">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">The pipeline</Text>
              <Title order={2} ta="center" fz={28}>Six stages. Full lifecycle.</Title>
            </Stack>

            <Timeline active={5} bulletSize={36} lineWidth={2} color="gray">
              {PIPELINE.map((step) => (
                <Timeline.Item
                  key={step.title}
                  bullet={
                    <ThemeIcon size={36} radius="xl" variant="light">
                      <step.icon size={18} />
                    </ThemeIcon>
                  }
                  title={
                    <Text fw={700} size="md">{step.title}</Text>
                  }
                >
                  <Text size="sm" c="dimmed" lh={1.7} mt={4}>
                    {step.body}
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </Stack>
        </Container>
      </Box>

      {/* ── SCHEMA FLEXIBILITY ── */}
      <Box py={80}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">Schema-driven</Text>
              <Title order={2} ta="center" fz={28}>
                The schema defines what happens. The platform executes it.
              </Title>
              <Text c="dimmed" ta="center" maw={640} lh={1.7}>
                There's no fixed set of operations. Your schema describes the fields and instructions — the AI follows them for every block identically.
              </Text>
            </Stack>

            <Stack gap="lg">
              {SCHEMA_DETAIL.map((s) => (
                <Paper key={s.label} p="xl" radius="md" withBorder>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                    <Stack gap="sm">
                      <Badge variant="light" color={s.color} size="sm" radius="sm" w="fit-content">
                        {s.label}
                      </Badge>
                      <Text size="sm" c="dimmed" lh={1.7}>
                        {s.description}
                      </Text>
                      <Code block style={{ fontSize: 12 }}>
                        {s.example}
                      </Code>
                    </Stack>
                    <Stack gap="sm" justify="center">
                      <Text size="xs" fw={600} tt="uppercase" c="dimmed">What you get</Text>
                      <Text size="sm" c="dimmed" lh={1.7}>
                        {s.output}
                      </Text>
                    </Stack>
                  </SimpleGrid>
                </Paper>
              ))}
            </Stack>

            <Text c="dimmed" ta="center" size="sm">
              These are common patterns. Your schema can define any fields, any instructions, any combination — the platform doesn't limit you.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── WHY BLOCK-LEVEL ── */}
      <Box py={80} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">Architecture</Text>
              <Title order={2} ta="center" fz={28}>
                Block-level processing vs. document-level AI
              </Title>
            </Stack>

            <Paper p={0} radius="md" withBorder style={{ overflow: 'hidden' }}>
              {/* Header row */}
              <SimpleGrid cols={3} spacing={0}>
                <Box p="md" style={{ borderRight: '1px solid var(--mantine-color-default-border)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">Dimension</Text>
                </Box>
                <Box p="md" style={{ borderRight: '1px solid var(--mantine-color-default-border)', borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">Document-level AI</Text>
                </Box>
                <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">BlockData</Text>
                </Box>
              </SimpleGrid>

              {COMPARISON.map((row, i) => (
                <SimpleGrid key={row.label} cols={3} spacing={0}>
                  <Box
                    p="md"
                    style={{
                      borderRight: '1px solid var(--mantine-color-default-border)',
                      ...(i < COMPARISON.length - 1 ? { borderBottom: '1px solid var(--mantine-color-default-border)' } : {}),
                    }}
                  >
                    <Text size="sm" fw={600}>{row.label}</Text>
                  </Box>
                  <Box
                    p="md"
                    style={{
                      borderRight: '1px solid var(--mantine-color-default-border)',
                      ...(i < COMPARISON.length - 1 ? { borderBottom: '1px solid var(--mantine-color-default-border)' } : {}),
                    }}
                  >
                    <Group gap={6} wrap="nowrap" align="flex-start">
                      <IconX size={14} color="var(--mantine-color-red-6)" style={{ flexShrink: 0, marginTop: 3 }} />
                      <Text size="sm" c="dimmed">{row.docLevel}</Text>
                    </Group>
                  </Box>
                  <Box
                    p="md"
                    style={i < COMPARISON.length - 1 ? { borderBottom: '1px solid var(--mantine-color-default-border)' } : {}}
                  >
                    <Group gap={6} wrap="nowrap" align="flex-start">
                      <IconCheck size={14} color="var(--mantine-color-green-6)" style={{ flexShrink: 0, marginTop: 3 }} />
                      <Text size="sm" c="dimmed">{row.blockData}</Text>
                    </Group>
                  </Box>
                </SimpleGrid>
              ))}
            </Paper>
          </Stack>
        </Container>
      </Box>

      {/* ── PARALLELISM ── */}
      <Box py={80}>
        <Container size="md">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">Scale</Text>
              <Title order={2} ta="center" fz={28}>
                5,000 blocks. How fast?
              </Title>
              <Text c="dimmed" ta="center" maw={500}>
                Workers claim blocks atomically. Run 1 instance or 50 — no double-processing, no coordination overhead.
              </Text>
            </Stack>

            <Stack gap="sm">
              {CONCURRENCY_TABLE.map((row) => (
                <Paper key={row.workers} p="md" radius="md" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" miw={140}>
                      <Text size="sm" fw={600} w={80}>
                        {row.workers} worker{row.workers > 1 ? 's' : ''}
                      </Text>
                      <Text size="sm" c="dimmed">{row.time}</Text>
                    </Group>
                    <Box style={{ flex: 1, maxWidth: 400 }}>
                      <Box
                        h={8}
                        style={{
                          borderRadius: 4,
                          backgroundColor: 'var(--mantine-color-default-hover)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          h={8}
                          w={`${row.bar}%`}
                          style={{
                            borderRadius: 4,
                            backgroundColor: 'var(--mantine-primary-color-filled)',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  </Group>
                </Paper>
              ))}
              <Text size="xs" c="dimmed" ta="center">
                Approximate wall-clock time at ~3 seconds per block. Bar indicates relative throughput.
              </Text>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── THE GRID ── */}
      <Box py={80} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">Working surface</Text>
              <Title order={2} ta="center" fz={28}>
                The grid is the product.
              </Title>
              <Text c="dimmed" ta="center" maw={600} lh={1.7}>
                Every block in one view. Immutable columns on the left, schema overlay columns on the right. Results fill in live as workers complete.
              </Text>
            </Stack>

            {/* Mock grid */}
            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
              {/* Toolbar mock */}
              <Group
                p="sm"
                gap="sm"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              >
                <Badge variant="light" size="sm" radius="sm">legal_analysis_v1</Badge>
                <IconMinus size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">347 blocks</Text>
                <Box style={{ flex: 1 }} />
                <Badge variant="dot" color="green" size="sm">276 confirmed</Badge>
                <Badge variant="dot" color="yellow" size="sm">58 staged</Badge>
                <Badge variant="dot" color="gray" size="sm">13 pending</Badge>
              </Group>

              {/* Header row */}
              <Group
                gap={0}
                wrap="nowrap"
                p="xs"
                px="md"
                style={{
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: 'var(--mantine-color-default-hover)',
                }}
              >
                <Text size="xs" fw={700} c="dimmed" w={40}>#</Text>
                <Text size="xs" fw={700} c="dimmed" w={80}>Type</Text>
                <Text size="xs" fw={700} c="dimmed" style={{ flex: 1 }}>Content</Text>
                <Text size="xs" fw={700} c="dimmed" w={100}>Function</Text>
                <Text size="xs" fw={700} c="dimmed" w={120}>Authorities</Text>
                <Text size="xs" fw={700} c="dimmed" w={60}>Status</Text>
              </Group>

              {/* Data rows */}
              {[
                { i: 42, type: 'paragraph', content: 'The court held that the administrative agency exceeded its statutory…', fn: 'holding', auth: 'Chevron', status: 'confirmed', statusColor: 'green' },
                { i: 43, type: 'paragraph', content: 'In reaching this conclusion, the majority relied on the plain text…', fn: 'reasoning', auth: 'Marbury', status: 'staged', statusColor: 'yellow' },
                { i: 44, type: 'heading', content: 'III. Dissenting Opinion', fn: '—', auth: '—', status: 'staged', statusColor: 'yellow' },
                { i: 45, type: 'paragraph', content: 'The dissent argued that the majority\'s reading of the statute fails…', fn: 'dissent', auth: 'Griswold', status: 'pending', statusColor: 'gray' },
              ].map((row) => (
                <Group
                  key={row.i}
                  gap={0}
                  wrap="nowrap"
                  p="xs"
                  px="md"
                  style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Text size="xs" c="dimmed" w={40} ff="monospace">{row.i}</Text>
                  <Badge variant="light" size="xs" radius="sm" w={80} styles={{ root: { textTransform: 'none' } }}>{row.type}</Badge>
                  <Text size="xs" c="dimmed" style={{ flex: 1 }} lineClamp={1}>{row.content}</Text>
                  <Text size="xs" w={100} ff="monospace">{row.fn}</Text>
                  <Text size="xs" w={120} c="dimmed" ff="monospace">{row.auth}</Text>
                  <Badge variant="dot" color={row.statusColor} size="xs" w={60}>{row.status}</Badge>
                </Group>
              ))}

              <Group p="sm" justify="space-between">
                <Text size="xs" c="dimmed">Showing blocks 42–45 of 347</Text>
                <Text size="xs" c="dimmed">Schema: legal_analysis_v1</Text>
              </Group>
            </Paper>
          </Stack>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Divider />
      <Box py={88}>
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={30}>
              Ready to process your first project?
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={500}>
              Create an account, upload a document, and see blocks populate in the grid.
            </Text>
            <Group gap="md">
              <Button
                size="lg"
                rightSection={<IconArrowRight size={18} />}
                onClick={() => navigate('/register')}
              >
                Get started
              </Button>
              <Button
                size="lg"
                variant="default"
                onClick={() => navigate('/concepts/use-cases-v2')}
              >
                See use cases
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
