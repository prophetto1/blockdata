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
  IconBolt,
  IconCheck,
  IconFileExport,
  IconLayoutGrid,
  IconSchema,
  IconUpload,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const PIPELINE = [
  {
    step: '01',
    icon: IconUpload,
    title: 'Upload',
    body: 'Drop in documents - Markdown, Word, and PDF. Files are normalized before processing.',
  },
  {
    step: '02',
    icon: IconLayoutGrid,
    title: 'Decompose',
    body: 'Each document is split into stable blocks with deterministic IDs and source position.',
  },
  {
    step: '03',
    icon: IconSchema,
    title: 'Define schema',
    body: 'Your JSON schema defines block-level outputs for enrichment, revision, or both.',
  },
  {
    step: '04',
    icon: IconBolt,
    title: 'Process',
    body: 'Workers process blocks in parallel with identical instructions and consistent quality.',
  },
  {
    step: '05',
    icon: IconCheck,
    title: 'Review',
    body: 'Results land in staging. Review, edit, and confirm block-by-block or in bulk.',
  },
  {
    step: '06',
    icon: IconFileExport,
    title: 'Export',
    body: 'Confirmed output exports as stable JSONL with full provenance and predictable contracts.',
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
    blockData: 'Staging and bulk confirm.',
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
    description: 'Classify paragraphs, extract entities, tag topics, and score confidence.',
    example: '{ "rhetorical_function": "holding", "confidence": 0.92 }',
  },
  {
    label: 'Revision',
    description: 'Rewrite to plain language, apply style standards, translate, or simplify.',
    example: '{ "revised_content": "The court decided...", "diff": "..." }',
  },
  {
    label: 'Combined',
    description: 'Revise content and return structured metadata about the revision.',
    example: '{ "revised": "...", "reading_level_change": "12->8" }',
  },
];

export default function HowItWorks() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Box>
      {/* ── HERO ── */}
      <Box
        pt={{ base: 112, md: 150 }}
        pb={{ base: 64, md: 96 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%)'
            : 'radial-gradient(circle at 50% 0%, rgba(15,23,42,0.06) 0%, rgba(15,23,42,0) 68%)',
        }}
      >
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }} style={{ position: 'relative', zIndex: 1 }}>
          <Stack gap="lg" align="center">
            <Title
              order={1}
              ta="center"
              style={{
                fontSize: 'clamp(2.25rem, 4.2vw, 3.7rem)',
                lineHeight: 1.15,
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              Every block. Same instructions.
              <br />
              <span style={{ color: 'var(--mantine-color-dimmed)' }}>Zero drift.</span>
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={760} style={{ lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              The platform decomposes documents into blocks, applies your schema per block in parallel, and stages
              results for human review.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── PIPELINE ── */}
      <Box py={{ base: 64, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl">
            <Group justify="space-between" align="end" wrap="wrap">
              <Box>
                <Text size="sm" fw={700} tt="uppercase" c="dimmed" mb={4}>
                  The pipeline
                </Text>
                <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                  Six stages. Full lifecycle.
                </Title>
              </Box>
              <Button variant="default" onClick={() => navigate('/register')}>
                Start building
              </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {PIPELINE.map((step) => (
                <Paper
                  key={step.title}
                  p="xl"
                  radius="md"
                  withBorder
                  bg="var(--mantine-color-body)"
                >
                  <Stack gap="sm">
                    <Group gap="sm">
                      <Text size="sm" fw={800} c="dimmed" style={{ opacity: 0.5 }}>
                        {step.step}
                      </Text>
                      <ThemeIcon variant="light" color="teal" size="md" radius="md">
                        <step.icon size={16} />
                      </ThemeIcon>
                    </Group>
                    <Text fw={700} size="lg">
                      {step.title}
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.65}>
                      {step.body}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── GRID PREVIEW ── */}
      <Box py={{ base: 64, md: 96 }}>
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl" align="center" mb={48}>
            <Title order={2} ta="center">
              The grid is the product.
            </Title>
            <Text c="dimmed" ta="center" maw={620} size="lg">
              Review every block in one view. Immutable source on the left, schema overlay on the right.
            </Text>
          </Stack>

          <Paper
            radius="lg"
            withBorder
            style={{ overflow: 'hidden' }}
          >
            <Group p="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
              <Group gap={6}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
              </Group>
              <Text size="xs" c="dimmed" mx="auto" fw={500}>
                legal_analysis_project - BlockData
              </Text>
              <Box w={40} />
            </Group>

            <SimpleGrid
              cols={6}
              spacing={0}
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
              py="xs"
            >
              <Text size="xs" fw={700} c="dimmed" pl="md">#</Text>
              <Text size="xs" fw={700} c="dimmed">TYPE</Text>
              <Text size="xs" fw={700} c="dimmed">CONTENT (SOURCE)</Text>
              <Text size="xs" fw={700} c="dimmed">FUNCTION</Text>
              <Text size="xs" fw={700} c="dimmed">AUTHORITY</Text>
              <Text size="xs" fw={700} c="dimmed">STATUS</Text>
            </SimpleGrid>

            {[
              { i: 42, type: 'PARA', content: 'The court held that the administrative agency exceeded its statutory...', fn: 'holding', auth: 'Chevron', status: 'confirmed' },
              { i: 43, type: 'PARA', content: 'In reaching this conclusion, the majority relied on the plain text...', fn: 'reasoning', auth: 'Marbury', status: 'staged' },
              { i: 44, type: 'HEAD', content: 'III. Dissenting Opinion', fn: '-', auth: '-', status: 'staged' },
              { i: 45, type: 'PARA', content: "The dissent argued that the majority's reading of the statute fails...", fn: 'dissent', auth: 'Griswold', status: 'pending' },
            ].map((row, index) => (
              <SimpleGrid
                key={row.i}
                cols={6}
                spacing={0}
                py="sm"
                style={{
                  borderBottom: '1px solid var(--mantine-color-default-border)',
                  backgroundColor:
                    index % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.01)' : 'rgba(9,9,11,0.02)',
                }}
              >
                <Text size="xs" c="dimmed" ff="monospace" pl="md">{row.i}</Text>
                <Badge variant="default" size="xs" radius="sm" w="fit-content" styles={{ root: { textTransform: 'none' } }}>
                  {row.type}
                </Badge>
                <Text size="xs" c="dimmed" lineClamp={1} pr="md">{row.content}</Text>
                <Text size="xs" ff="monospace">{row.fn}</Text>
                <Text size="xs" c="dimmed" ff="monospace">{row.auth}</Text>
                <Badge variant="dot" color="gray" size="xs" w="fit-content">{row.status}</Badge>
              </SimpleGrid>
            ))}

            <Box p="xs" bg={isDark ? 'rgba(255,255,255,0.02)' : 'rgba(9,9,11,0.03)'}>
              <Text size="xs" c="dimmed" ta="center">
                Showing 4 of 347 blocks
              </Text>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* ── BLOCK VS DOCUMENT ── */}
      <Box py={{ base: 64, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 40, md: 64 }}>
            <Stack>
              <Title order={2} mb="md">
                Block-level vs.
                <br />
                Document-level
              </Title>
              <Text size="lg" c="dimmed">
                Processing documents as a single large blob leads to drift and inconsistent outputs.
                Decomposing into atomic blocks keeps quality stable from start to finish.
              </Text>
              <Stack mt="xl">
                {COMPARISON.map((item) => (
                  <Group key={item.label} align="start" wrap="nowrap">
                    <ThemeIcon variant="light" color="teal" radius="xl" size="sm">
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
              <Title order={3} size="h4" c="dimmed" tt="uppercase">
                Schema flexibility
              </Title>
              {SCHEMA_DETAIL.map((s) => (
                <Paper key={s.label} p="lg" radius="md" withBorder>
                  <Badge variant="default" mb="xs">{s.label}</Badge>
                  <Text size="sm" mb="sm">{s.description}</Text>
                  <Code block style={{ fontSize: 11 }}>{s.example}</Code>
                </Paper>
              ))}
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── FINAL CTA ── */}
      <Box py={{ base: 64, md: 96 }}>
        <Container size="sm" ta="center">
          <Title order={2} fz={{ base: 36, md: 44 }} mb="lg">
            Ready to build?
          </Title>
          <Group justify="center">
            <Button size="xl" color="teal" onClick={() => navigate('/register')}>
              Get started
            </Button>
            <Button size="xl" variant="default" onClick={() => navigate('/use-cases')}>
              View use cases
            </Button>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
