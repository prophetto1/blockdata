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
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconUpload,
  IconSchema,
  IconBolt,
  IconChecks,
  IconEye,
  IconPencil,
  IconSparkles,
  IconTable,
  IconFingerprint,
  IconShieldCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

// ─── Data ────────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    icon: IconUpload,
    step: '01',
    title: 'Upload',
    text: 'Drop in documents — Markdown, Word, PDF. Multiple files, any format. The platform decomposes each into ordered, typed blocks.',
  },
  {
    icon: IconSchema,
    step: '02',
    title: 'Define your schema',
    text: 'Tell the platform what to do per block — extract metadata, revise content, or both. Your schema is the instruction set.',
  },
  {
    icon: IconBolt,
    step: '03',
    title: 'Process',
    text: 'Concurrent workers process blocks in parallel. 5,000 blocks across 77 documents in minutes, not hours. No drift, no quality loss.',
  },
  {
    icon: IconChecks,
    step: '04',
    title: 'Review & confirm',
    text: 'AI results land in staging. Review in the grid, edit inline, confirm per-block or in bulk. Nothing exports without your approval.',
  },
];

const SCHEMA_EXAMPLES = [
  {
    icon: IconEye,
    label: 'Analyze',
    title: 'Add structured metadata',
    description: 'Classify paragraphs, extract entities, tag topics, score sentiment — your schema defines the fields. The source content stays untouched.',
    fields: ['rhetorical_function', 'cited_authorities', 'confidence_score'],
  },
  {
    icon: IconPencil,
    label: 'Revise',
    title: 'Transform content block by block',
    description: 'Rewrite to plain language, apply a style guide, translate, simplify. Confirmed blocks reassemble into a revised document.',
    fields: ['revised_content', 'changes_made', 'reading_level'],
  },
  {
    icon: IconSparkles,
    label: 'Both',
    title: 'Revise and analyze in one pass',
    description: 'Revise content according to your rules, then add metadata about the revision. Get the revised document and a dataset describing every change.',
    fields: ['revised_content', 'simplification_notes', 'compliance_status'],
  },
];

const CAPABILITIES = [
  { icon: IconUpload, title: 'Multi-format ingestion', text: 'Markdown, Word, PDF, plain text. Every format produces the same block inventory.' },
  { icon: IconSchema, title: 'Schema-driven processing', text: 'Your schema defines what happens. Metadata, revisions, or anything else — the platform executes it.' },
  { icon: IconBolt, title: 'Block-level parallelism', text: '20 concurrent workers. 5,000 blocks. Under 15 minutes. Each block processed independently.' },
  { icon: IconTable, title: 'Real-time working surface', text: 'Watch results fill into the grid live. Filter, sort, inspect at paragraph resolution.' },
  { icon: IconFingerprint, title: 'Deterministic identity', text: 'Every block has a stable hash. Re-upload the same file, get the same IDs. Join to external systems.' },
  { icon: IconShieldCheck, title: 'Human-in-the-loop review', text: 'AI writes to staging. You confirm. Nothing reaches your export without your approval.' },
];

const USE_CASE_TEASERS = [
  {
    title: 'Work through a long document at consistent quality',
    text: 'A 200-page report reviewed paragraph by paragraph. Same instructions on block 1 and block 840.',
  },
  {
    title: 'Turn a document collection into structured data',
    text: '77 documents. One schema. AI workers fan out across thousands of blocks in parallel.',
  },
  {
    title: 'Revise an entire corpus to match new standards',
    text: 'Upload all your specs. Apply a revision schema. Export 77 revised documents with full provenance.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Box>

      {/* ── HERO ── */}
      <Box
        pt={{ base: 114, md: 146 }}
        pb={{ base: 64, md: 96 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'radial-gradient(circle at 60% 30%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)'
            : 'radial-gradient(circle at 60% 30%, rgba(15,23,42,0.06) 0%, rgba(15,23,42,0) 62%)',
        }}
      >
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }} style={{ position: 'relative', zIndex: 1 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 48, md: 80 }}>
            {/* Left: copy */}
            <Stack gap="xl" justify="center">
              <Title
                order={1}
                style={{
                  fontSize: 'clamp(2.35rem, 4.4vw, 3.6rem)',
                  lineHeight: 1.15,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                }}
              >
                Your documents.<br />
                Structured knowledge.<br />
                <span style={{ color: 'var(--mantine-color-dimmed)' }}>
                  Zero drift.
                </span>
              </Title>
              <Text size="lg" c="dimmed" maw={520}>
                Upload any document. Define a schema — metadata labels, revision
                instructions, or both. AI processes every block independently.
                You review, confirm, and export.
              </Text>
              <Group gap="md" mt="sm">
                <Button
                  size="xl"
                  color="teal"
                  rightSection={<IconArrowRight size={18} />}
                  onClick={() => navigate('/register')}
                >
                  Get started
                </Button>
                <Button
                  size="xl"
                  variant="default"
                  onClick={() => navigate('/how-it-works')}
                >
                  How it works
                </Button>
              </Group>
            </Stack>

            {/* Right: mock pipeline */}
            <Box visibleFrom="md" style={{ display: 'flex', alignItems: 'center' }}>
              <Paper
                p="xl"
                radius="lg"
                withBorder
                style={{ width: '100%' }}
              >
                <Group gap="xs" mb="lg" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                  <Text size="xs" ml="auto" c="dimmed" fw={500}>
                    blockdata — export preview
                  </Text>
                </Group>
                <Code
                  block
                  bg="transparent"
                  style={{ fontSize: 13, whiteSpace: 'pre', lineHeight: 1.6 }}
                  c="dimmed"
                >
{`{
  "block": {
    "block_uid": "a7c3…:42",
    "block_type": "paragraph",
    "block_content": "The court held that…"
  },
  "user_defined": {
    "schema_ref": "legal_analysis_v1",
    "data": {
      "rhetorical_function": "holding",
      "cited_authorities": [
         "Marbury v. Madison"
      ],
      "revised_content": "The court decided…",
      "reading_level": "8th_grade"
    }
  }
}`}
                </Code>
              </Paper>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ── WHAT YOUR SCHEMA CAN DO ── */}
      <Box py={{ base: 64, md: 96 }}>
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Schema-driven
              </Text>
              <Title order={2} ta="center" fz={{ base: 32, sm: 40 }}>
                Your schema is the engine.
              </Title>
              <Text c="dimmed" ta="center" maw={640} size="lg" lh={1.6}>
                There's no fixed set of operations. Your schema is the instruction
                set — the platform executes it per block, at any scale.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {SCHEMA_EXAMPLES.map((ex) => (
                <Paper key={ex.label} p="xl" radius="md" withBorder>
                  <Stack gap="md">
                    <Group gap="sm" justify="space-between">
                      <ThemeIcon variant="light" size="xl" radius="md" color="teal">
                        <ex.icon size={22} />
                      </ThemeIcon>
                      <Badge variant="outline" color="teal" size="md" radius="sm">
                        {ex.label}
                      </Badge>
                    </Group>
                    <Title order={3} size="h3">{ex.title}</Title>
                    <Text size="md" c="dimmed" lh={1.6}>
                      {ex.description}
                    </Text>
                    <Group gap={6} wrap="wrap" mt="sm">
                      {ex.fields.map((f) => (
                        <Badge
                          key={f}
                          variant="filled"
                          color="dark"
                          size="sm"
                          radius="sm"
                          styles={{ root: { textTransform: 'none', fontWeight: 500, fontFamily: 'monospace' } }}
                        >
                          {f}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── PIPELINE ── */}
      <Box py={{ base: 64, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Workflow
              </Text>
              <Title order={2} ta="center" fz={{ base: 32, sm: 40 }}>
                Four steps. One repeatable process.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
              {PIPELINE_STEPS.map((s) => (
                <Paper key={s.step} p="xl" radius="md" withBorder bg="var(--mantine-color-body)">
                  <Stack gap="sm">
                    <Group gap="sm" mb="xs">
                       <Text size="sm" fw={800} c="dimmed" style={{ opacity: 0.5 }}>{s.step}</Text>
                       <ThemeIcon variant="light" color="teal" size="md">
                           <s.icon />
                       </ThemeIcon>
                    </Group>
                    <Text fw={700} size="lg">{s.title}</Text>
                    <Text size="sm" c="dimmed" lh={1.6}>
                      {s.text}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>

            <Group justify="center" mt="md">
              <Button
                variant="default"
                size="lg"
                rightSection={<IconArrowRight size={16} />}
                onClick={() => navigate('/how-it-works')}
              >
                Deep dive into the pipeline
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ── USE CASES TEASER ── */}
      <Box py={{ base: 64, md: 96 }}>
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl">
            <Group justify="space-between" align="end" mb="lg">
                <Box>
                    <Text size="sm" fw={700} tt="uppercase" c="dimmed">Use cases</Text>
                    <Title order={2}>Built for scale.</Title>
                </Box>
                <Button variant="outline" color="gray" onClick={() => navigate('/use-cases')}>View all use cases</Button>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {USE_CASE_TEASERS.map((uc) => (
                <Paper key={uc.title} p="xl" radius="md" withBorder>
                  <Stack gap="md">
                    <Text fw={700} lh={1.3} size="lg">
                      {uc.title}
                    </Text>
                    <Text size="md" c="dimmed" lh={1.6}>
                      {uc.text}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── CAPABILITIES ── */}
      <Box py={{ base: 64, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Capabilities
              </Text>
              <Title order={2} ta="center">
                Everything you need to work with documents.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
              {CAPABILITIES.map((c) => (
                <div key={c.title}>
                    <ThemeIcon variant="light" color="teal" size="lg" radius="md" mb="md">
                      <c.icon size={20} />
                    </ThemeIcon>
                    <Text fw={700} size="lg" mb="xs">{c.title}</Text>
                    <Text size="md" c="dimmed" lh={1.6}>{c.text}</Text>
                </div>
              ))}
            </SimpleGrid>

            <Group justify="center" mt="md">
              <Button
                variant="default"
                size="lg"
                rightSection={<IconArrowRight size={16} />}
                onClick={() => navigate('/integrations')}
              >
                See integrations
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ── FINAL CTA ── */}
      <Box py={{ base: 80, md: 112 }}>
        <Container size="sm">
          <Stack align="center" gap="xl">
            <Title order={2} ta="center" fz={{ base: 32, sm: 48 }} fw={800}>
              Extract metadata.<br/>Revise content.
            </Title>
            <Text size="xl" c="dimmed" ta="center" maw={520} lh={1.6}>
              Upload your first document, define a schema, and watch structured
              results appear — block by block.
            </Text>
            <Button
              size="xl"
              color="teal"
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
