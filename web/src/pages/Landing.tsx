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

/**
 * CONCEPT: LandingV2 (Refined)
 *
 * Improvements:
 * - Layout-driven navigation (MarketingLayout)
 * - Hero: Larger typography + gradient background (Adaptive)
 * - Cards: Polished visual hierarchy
 * - Content: Preserved exactly from original
 */

// ─── Data ────────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    icon: IconUpload,
    step: '01',
    color: 'blue',
    title: 'Upload',
    text: 'Drop in documents — Markdown, Word, PDF. Multiple files, any format. The platform decomposes each into ordered, typed blocks.',
  },
  {
    icon: IconSchema,
    step: '02',
    color: 'indigo',
    title: 'Define your schema',
    text: 'Tell the platform what to do per block — extract metadata, revise content, or both. Your schema is the instruction set.',
  },
  {
    icon: IconBolt,
    step: '03',
    color: 'orange',
    title: 'Process',
    text: 'Concurrent workers process blocks in parallel. 5,000 blocks across 77 documents in minutes, not hours. No drift, no quality loss.',
  },
  {
    icon: IconChecks,
    step: '04',
    color: 'green',
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
    color: 'blue',
  },
  {
    icon: IconPencil,
    label: 'Revise',
    title: 'Transform content block by block',
    description: 'Rewrite to plain language, apply a style guide, translate, simplify. Confirmed blocks reassemble into a revised document.',
    fields: ['revised_content', 'changes_made', 'reading_level'],
    color: 'green',
  },
  {
    icon: IconSparkles,
    label: 'Both',
    title: 'Revise and analyze in one pass',
    description: 'Revise content according to your rules, then add metadata about the revision. Get the revised document and a dataset describing every change.',
    fields: ['revised_content', 'simplification_notes', 'compliance_status'],
    color: 'violet',
  },
];

const CAPABILITIES = [
  { icon: IconUpload, color: 'blue', title: 'Multi-format ingestion', text: 'Markdown, Word, PDF, plain text. Every format produces the same block inventory.' },
  { icon: IconSchema, color: 'indigo', title: 'Schema-driven processing', text: 'Your schema defines what happens. Metadata, revisions, or anything else — the platform executes it.' },
  { icon: IconBolt, color: 'orange', title: 'Block-level parallelism', text: '20 concurrent workers. 5,000 blocks. Under 15 minutes. Each block processed independently.' },
  { icon: IconTable, color: 'teal', title: 'Real-time working surface', text: 'Watch results fill into the grid live. Filter, sort, inspect at paragraph resolution.' },
  { icon: IconFingerprint, color: 'violet', title: 'Deterministic identity', text: 'Every block has a stable hash. Re-upload the same file, get the same IDs. Join to external systems.' },
  { icon: IconShieldCheck, color: 'green', title: 'Human-in-the-loop review', text: 'AI writes to staging. You confirm. Nothing reaches your export without your approval.' },
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
    <Box bg="var(--mantine-color-body)">

      {/* ── HERO ── */}
      <Box
        pt={{ base: 120, md: 160 }}
        pb={{ base: 80, md: 120 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark 
            ? 'radial-gradient(circle at 60% 30%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)'
            : 'radial-gradient(circle at 60% 30%, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 60%)',
        }}
      >
        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80}>
            {/* Left: copy */}
            <Stack gap="xl" justify="center">
              <Badge
                variant="filled"
                size="lg"
                radius="xl"
                color="gray"
                bg="var(--mantine-color-default-border)"
                c="var(--mantine-color-text)"
                tt="none"
              >
                Document Intelligence Platform
              </Badge>
              <Title
                order={1}
                style={{
                  // Removed hardcoded 'white'
                  fontSize: 'clamp(3rem, 5vw, 4rem)',
                  lineHeight: 1.1,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                Your documents.<br />
                Structured knowledge.<br />
                <span style={{ color: 'var(--mantine-color-dimmed)' }}>
                  Zero drift.
                </span>
              </Title>
              <Text
                size="xl"
                c="dimmed"
                maw={520}
                lh={1.6}
              >
                Upload any document. Define a schema — metadata labels, revision
                instructions, or both. AI processes every block independently.
                You review, confirm, and export.
              </Text>
              <Group gap="md" mt="sm">
                <Button
                  size="xl"
                  rightSection={<IconArrowRight size={18} />}
                  onClick={() => navigate('/register')}
                >
                  Get started free
                </Button>
                <Button
                  size="xl"
                  variant="default"
                  onClick={() => navigate('/how-it-works')}
                  styles={{
                    root: {
                      backgroundColor: 'transparent',
                       // Removed hardcoded 'white' color/border props to let variant="default" handle it
                    },
                  }}
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
                style={{
                  backgroundColor: isDark ? '#1A1B1E' : '#FFFFFF',
                  borderColor: 'var(--mantine-color-default-border)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  boxShadow: 'var(--mantine-shadow-xl)',
                  width: '100%',
                }}
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
                  c={isDark ? 'rgba(255,255,255,0.7)' : 'dimmed'}
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
      <Box py={100}>
        <Container size="lg">
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
                <Paper 
                    key={ex.label} 
                    p="xl" 
                    radius="md" 
                    withBorder
                    style={{ position: 'relative', overflow: 'hidden' }}
                >
                   <Box 
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, height: 4,
                            backgroundColor: `var(--mantine-color-${ex.color}-filled)`
                        }} 
                   />
                  <Stack gap="md">
                    <Group gap="sm" justify="space-between">
                      <ThemeIcon variant="light" size="xl" radius="md" color={ex.color}>
                        <ex.icon size={22} />
                      </ThemeIcon>
                      <Badge variant="outline" color={ex.color} size="md" radius="sm">
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
      <Box py={100} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="xl">
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
                <Paper key={s.step} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm" mb="xs">
                       <Text size="sm" fw={800} c={`${s.color}.6`} style={{ opacity: 0.5 }}>{s.step}</Text>
                       <ThemeIcon variant="light" color={s.color} size="md">
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

            <Group justify="center" mt="xl">
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
      <Box py={100}>
        <Container size="lg">
          <Stack gap="xl">
            <Group justify="space-between" align="end" mb="lg">
                <Box>
                    <Text size="sm" fw={700} tt="uppercase" c="dimmed">Use cases</Text>
                    <Title order={2} fz={32}>Built for scale.</Title>
                </Box>
                <Button variant="outline" color="gray" onClick={() => navigate('/use-cases')}>View all use cases</Button>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {USE_CASE_TEASERS.map((uc) => (
                <Paper key={uc.title} p="xl" radius="md" withBorder bg="var(--mantine-color-default-hover)">
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
      {/* This section is explicitly dark. We should probably keep it dark even in light mode for contrast? */}
      {/* Or adapt it. If we keep it dark, we need to enforce white text. */}
      {/* Strategy: Keep it dark (Brand moment), but ensure text is forced white. */ }
      <Box py={100} style={{ backgroundColor: '#1A1B1E' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center" mb="lg">
              <Text size="sm" fw={700} tt="uppercase" c="dimmed">
                Capabilities
              </Text>
              <Title order={2} ta="center" fz={32} c="white">
                Everything you need to work with documents.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
              {CAPABILITIES.map((c) => (
                <div key={c.title}>
                    <ThemeIcon variant="light" color={c.color} size="lg" radius="md" mb="md">
                      <c.icon size={20} />
                    </ThemeIcon>
                    <Text fw={700} size="lg" c="white" mb="xs">{c.title}</Text>
                    <Text size="md" c="dimmed" lh={1.6}>{c.text}</Text>
                </div>
              ))}
            </SimpleGrid>

            <Group justify="center" mt="xl">
              <Button
                variant="white"
                color="dark"
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
      <Box py={120}>
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
              rightSection={<IconArrowRight size={20} />}
              onClick={() => navigate('/register')}
            >
              Get started free
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box py="xl" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Container size="lg">
          <Group justify="space-between">
            <Text fw={700} size="sm">BlockData</Text>
            <Group gap="xl">
              <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => navigate('/how-it-works')}>How it works</Text>
              <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => navigate('/use-cases')}>Use cases</Text>
              <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => navigate('/integrations')}>Integrations</Text>
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
