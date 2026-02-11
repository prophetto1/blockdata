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
  IconUpload,
  IconLayoutGrid,
  IconSchema,
  IconBolt,
  IconChecks,
  IconFileExport,
  IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

/**
 * HowItWorks — v2.1
 *
 * v2.1 improvements:
 * - Theme-adaptive hero (no hardcoded white)
 * - Pipeline cards with color progression per stage
 */

const PIPELINE = [
  {
    step: '01',
    icon: IconUpload,
    color: 'blue',
    title: 'Upload',
    body: 'Drop in documents — Markdown, Word, PDF. The platform handles format conversion via Docling or mdast.',
  },
  {
    step: '02',
    icon: IconLayoutGrid,
    color: 'violet',
    title: 'Decompose',
    body: 'Documents split into ordered blocks. Each gets a steady ID hash computed from content and position.',
  },
  {
    step: '03',
    icon: IconSchema,
    color: 'indigo',
    title: 'Schema',
    body: 'Your JSON schema instructs the AI per block. Extract metadata, rewrite content, or both.',
  },
  {
    step: '04',
    icon: IconBolt,
    color: 'orange',
    title: 'Process',
    body: 'Concurrent workers claim blocks atomically. 20 workers on 5,000 blocks finishes in minutes.',
  },
  {
    step: '05',
    icon: IconChecks,
    color: 'green',
    title: 'Review',
    body: 'Results land in staging. Edit inline, confirm per-block or in bulk. Nothing exports without approval.',
  },
  {
    step: '06',
    icon: IconFileExport,
    color: 'teal',
    title: 'Export',
    body: 'Canonical JSONL with full provenance. Reassemble revised documents from confirmed blocks.',
  },
];

const COMPARISON = [
  {
    label: '200-page document',
    docLevel: 'Quality degrades by page 40.',
    blockData: '800+ blocks. Consistent quality.',
  },
  {
    label: 'Traceability',
    docLevel: 'No source reference.',
    blockData: 'Block 247: paragraph 3.',
  },
  {
    label: 'Parallelism',
    docLevel: 'Sequential processing.',
    blockData: '20 concurrent workers.',
  },
  {
    label: 'Human review',
    docLevel: 'Read entire output.',
    blockData: 'Staging & bulk confirm.',
  },
  {
    label: 'Scale',
    docLevel: '1 document per session.',
    blockData: '77 docs, 5k blocks.',
  },
];

const SCHEMA_DETAIL = [
  {
    label: 'Metadata',
    description: 'Classify paragraphs, extract entities, tag topics, score sentiment.',
    example: '{ "rhetorical_function": "holding", "confidence": 0.92 }',
    color: 'blue',
  },
  {
    label: 'Revision',
    description: 'Rewrite to plain language, apply style guide, translate, simplify.',
    example: '{ "revised_content": "The court decided...", "diff": "..." }',
    color: 'green',
  },
  {
    label: 'Combined',
    description: 'Revise content AND produce structured metadata about the revision.',
    example: '{ "revised": "...", "reading_level_change": "12->8" }',
    color: 'violet',
  },
];

export default function HowItWorks() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Box bg="var(--mantine-color-body)">

      {/* ── HERO ── */}
      <Box
        pt={{ base: 120, md: 180 }}
        pb={{ base: 80, md: 120 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%)'
            : 'radial-gradient(circle at 50% 0%, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 70%)',
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
              Architecture
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
              Every block. Same instructions.<br />
              <span style={{ color: 'var(--mantine-color-dimmed)' }}> Zero drift.</span>
            </Title>
            <Text ta="center" c="dimmed" size="xl" maw={680}>
              The platform decomposes documents into blocks, applies your schema per block in parallel, and stages results for human review.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── PIPELINE (Horizontal Cards) ── */}
      <Box py={100} bg="var(--mantine-color-default-hover)">
        <Container size="xl">
          <Stack gap="xl">
            <Group justify="space-between" align="end" mb="lg">
              <Box>
                <Text size="sm" fw={700} tt="uppercase" c="dimmed" mb={4}>The Pipeline</Text>
                <Title order={2}>Six stages. Full lifecycle.</Title>
              </Box>
              <Button variant="default" onClick={() => navigate('/register')}>Start building</Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 6 }} spacing="md">
              {PIPELINE.map((step) => (
                <Paper
                  key={step.title}
                  p="lg"
                  radius="md"
                  withBorder
                  bg="var(--mantine-color-body)"
                  style={{ position: 'relative', height: '100%' }}
                >
                  <Text size="xs" fw={800} c={`${step.color}.6`} mb="xs" style={{ opacity: 0.5 }}>{step.step}</Text>
                  <ThemeIcon size="lg" radius="md" variant="light" color={step.color} mb="md">
                    <step.icon size={20} />
                  </ThemeIcon>
                  <Text fw={700} mb="xs">{step.title}</Text>
                  <Text size="sm" c="dimmed" lh={1.5} style={{ fontSize: '0.85rem' }}>
                    {step.body}
                  </Text>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── THE GRID (Hero Visual) ── */}
      <Box py={120}>
        <Container size="lg">
          <Stack gap="xl" align="center" mb={60}>
            <Title order={2} ta="center" fz={40}>The grid is the product.</Title>
            <Text c="dimmed" ta="center" maw={600} size="lg">
              Review every block in one view. Immutable source on the left, schema overlay on the right.
            </Text>
          </Stack>

          {/* Mac Window Container */}
          <Paper
            radius="lg"
            withBorder
            style={{
              overflow: 'hidden',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
              backgroundColor: '#1A1B1E',
            }}
          >
            {/* Window Header */}
            <Group p="sm" bg="rgba(255,255,255,0.03)" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Group gap={6}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
              </Group>
              <Text size="xs" c="dimmed" mx="auto" fw={500}>legal_analysis_project — BlockData</Text>
              <Box w={40} />
            </Group>

            {/* Toolbar */}
            <Group
              p="xs"
              px="md"
              gap="sm"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Badge variant="outline" color="gray" size="sm" radius="sm">schema: v1.2</Badge>
              <Divider orientation="vertical" />
              <Badge variant="filled" color="green" size="sm" radius="sm">276 confirmed</Badge>
              <Badge variant="filled" color="yellow" size="sm" radius="sm">58 staged</Badge>
              <Box style={{ flex: 1 }} />
              <Button size="xs" variant="default">Filter</Button>
              <Button size="xs" variant="white" color="dark">Export JSONL</Button>
            </Group>

            {/* Grid Header */}
            <SimpleGrid
              cols={6}
              spacing={0}
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
              py="xs"
            >
              <Text size="xs" fw={700} c="dimmed" pl="md">#</Text>
              <Text size="xs" fw={700} c="dimmed">TYPE</Text>
              <Text size="xs" fw={700} c="dimmed">CONTENT (SOURCE)</Text>
              <Text size="xs" fw={700} c="dimmed">FUNCTION</Text>
              <Text size="xs" fw={700} c="dimmed">AUTHORITY</Text>
              <Text size="xs" fw={700} c="dimmed">STATUS</Text>
            </SimpleGrid>

            {/* Data Rows */}
            {[
              { i: 42, type: 'PARA', content: 'The court held that the administrative agency exceeded its statutory…', fn: 'holding', auth: 'Chevron', status: 'confirmed', statusColor: 'green' },
              { i: 43, type: 'PARA', content: 'In reaching this conclusion, the majority relied on the plain text…', fn: 'reasoning', auth: 'Marbury', status: 'staged', statusColor: 'yellow' },
              { i: 44, type: 'HEAD', content: 'III. Dissenting Opinion', fn: '—', auth: '—', status: 'staged', statusColor: 'yellow' },
              { i: 45, type: 'PARA', content: 'The dissent argued that the majority\'s reading of the statute fails…', fn: 'dissent', auth: 'Griswold', status: 'pending', statusColor: 'gray' },
            ].map((row, index) => (
              <SimpleGrid
                key={row.i}
                cols={6}
                spacing={0}
                py="sm"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}
              >
                <Text size="xs" c="dimmed" ff="monospace" pl="md">{row.i}</Text>
                <Badge variant="light" size="xs" radius="sm" color="gray" w="fit-content" styles={{ root: { textTransform: 'none' } }}>{row.type}</Badge>
                <Text size="xs" c="dimmed" lineClamp={1} pr="md">{row.content}</Text>
                <Text size="xs" c="blue" ff="monospace">{row.fn}</Text>
                <Text size="xs" c="dimmed" ff="monospace">{row.auth}</Text>
                <Badge variant="dot" color={row.statusColor} size="xs" w="fit-content">{row.status}</Badge>
              </SimpleGrid>
            ))}

            {/* Fake Footer */}
            <Box p="xs" bg="rgba(255,255,255,0.02)">
              <Text size="xs" c="dimmed" ta="center">Showing 4 of 347 blocks</Text>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* ── COMPARISON / ARCHITECTURE ── */}
      <Box py={120} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80}>
            <Stack>
              <Title order={2} mb="md">Block-level vs.<br/>Document-level</Title>
              <Text size="lg" c="dimmed">
                Processing documents as single large blobs leads to drift and hallucination.
                Decomposing them into atomic blocks ensures consistent quality from start to finish.
              </Text>
              <Stack mt="xl">
                {COMPARISON.map(item => (
                  <Group key={item.label} align="start" wrap="nowrap">
                    <ThemeIcon variant="light" color="green" radius="xl" size="sm" mt={4}>
                      <IconCheck size={12} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={700} size="sm">{item.label}</Text>
                      <Text size="sm" c="dimmed">{item.blockData}</Text>
                    </Box>
                  </Group>
                ))}
              </Stack>
            </Stack>

            <Stack gap="lg">
              <Title order={3} size="h4" c="dimmed" tt="uppercase">Schema Flexibility</Title>
              {SCHEMA_DETAIL.map(s => (
                <Paper key={s.label} p="md" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Badge variant="light" color={s.color}>{s.label}</Badge>
                  </Group>
                  <Text size="sm" mb="sm">{s.description}</Text>
                  <Code block style={{ fontSize: 11 }}>{s.example}</Code>
                </Paper>
              ))}
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box py={120}>
        <Container size="sm" ta="center">
          <Title order={2} fz={40} mb="lg">Ready to build?</Title>
          <Group justify="center">
            <Button size="xl" onClick={() => navigate('/register')}>Get Started</Button>
            <Button size="xl" variant="default" onClick={() => navigate('/use-cases')}>View Use Cases</Button>
          </Group>
        </Container>
      </Box>

    </Box>
  );
}
