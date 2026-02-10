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
import { PublicNav } from '@/components/layout/PublicNav';

/**
 * CONCEPT: LandingV2
 *
 * Redesigned landing page addressing content gaps:
 * - Schema flexibility (not "three tracks" — unlimited schema designs)
 * - Revision + enrichment examples alongside extraction
 * - Staging/confirm flow as differentiator
 * - Parallel processing made concrete
 * - Downstream value teased
 */

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

export default function LandingV2() {
  const navigate = useNavigate();

  return (
    <Box>
      <PublicNav />

      {/* ── HERO ── */}
      <Box
        py={{ base: 80, md: 120 }}
        style={{
          backgroundColor: 'var(--mantine-color-dark-8)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.06,
            backgroundImage:
              'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60}>
            {/* Left: copy */}
            <Stack gap="lg" justify="center">
              <Badge
                variant="dot"
                size="lg"
                radius="sm"
                color="gray"
                styles={{ root: { color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)' } }}
              >
                Document Intelligence Platform
              </Badge>
              <Title
                order={1}
                style={{
                  color: 'white',
                  fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
                  lineHeight: 1.1,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                Your documents contain structured knowledge.
                <br />
                <span style={{ color: 'var(--mantine-color-dimmed)' }}>
                  The problem is getting it out.
                </span>
              </Title>
              <Text
                size="lg"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                maw={520}
                lh={1.7}
              >
                Upload any document. Define a schema — metadata labels, revision
                instructions, or both. AI processes every block independently.
                You review, confirm, and export.
              </Text>
              <Group gap="md" mt="sm">
                <Button
                  size="lg"
                  rightSection={<IconArrowRight size={18} />}
                  onClick={() => navigate('/register')}
                >
                  Get started free
                </Button>
                <Button
                  size="lg"
                  variant="default"
                  onClick={() => navigate('/concepts/how-it-works-v2')}
                  styles={{
                    root: {
                      backgroundColor: 'transparent',
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.2)',
                    },
                  }}
                >
                  How it works
                </Button>
              </Group>
            </Stack>

            {/* Right: mock pipeline */}
            <Box visibleFrom="md">
              <Paper
                p="lg"
                radius="md"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Group gap="xs" mb="sm" pb="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <Text size="xs" ml="xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    blockdata — export preview
                  </Text>
                </Group>
                <Code
                  block
                  bg="transparent"
                  style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre' }}
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
      "cited_authorities": ["Marbury v. Madison"],
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
      <Box py={80}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">
                Schema-driven
              </Text>
              <Title order={2} ta="center" fz={{ base: 24, sm: 30 }}>
                Your schema defines what happens to every block.
              </Title>
              <Text c="dimmed" ta="center" maw={640} lh={1.7}>
                There's no fixed set of operations. Your schema is the instruction
                set — the platform executes it per block, at any scale.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {SCHEMA_EXAMPLES.map((ex) => (
                <Paper key={ex.label} p="xl" radius="md" withBorder>
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="md" color={ex.color}>
                        <ex.icon size={20} />
                      </ThemeIcon>
                      <Badge variant="light" color={ex.color} size="sm" radius="sm">
                        {ex.label}
                      </Badge>
                    </Group>
                    <Text fw={700} lh={1.3}>{ex.title}</Text>
                    <Text size="sm" c="dimmed" lh={1.7}>
                      {ex.description}
                    </Text>
                    <Group gap={6} wrap="wrap">
                      {ex.fields.map((f) => (
                        <Badge
                          key={f}
                          variant="default"
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

            <Text c="dimmed" ta="center" size="sm">
              These are examples. Your schema can define any fields, any instructions, any combination.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── PIPELINE ── */}
      <Box py={80} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">
                How it works
              </Text>
              <Title order={2} ta="center" fz={{ base: 24, sm: 30 }}>
                Four steps. One repeatable workflow.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
              {PIPELINE_STEPS.map((s) => (
                <Paper key={s.step} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="md">
                        <s.icon size={20} />
                      </ThemeIcon>
                      <Text size="xs" fw={800} c="dimmed">
                        STEP {s.step}
                      </Text>
                    </Group>
                    <Text fw={700}>{s.title}</Text>
                    <Text size="sm" c="dimmed" lh={1.7}>
                      {s.text}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>

            <Group justify="center">
              <Button
                variant="default"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => navigate('/concepts/how-it-works-v2')}
              >
                See the full workflow
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ── USE CASES TEASER ── */}
      <Box py={80}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">
                Use cases
              </Text>
              <Title order={2} ta="center" fz={{ base: 24, sm: 30 }}>
                Built for long documents and large corpora.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {USE_CASE_TEASERS.map((uc) => (
                <Paper key={uc.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Text fw={700} lh={1.3} size="sm">
                      {uc.title}
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.7}>
                      {uc.text}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>

            <Group justify="center">
              <Button
                variant="default"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => navigate('/concepts/use-cases-v2')}
              >
                Explore use cases
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ── CAPABILITIES ── */}
      <Box py={80} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} tt="uppercase" c="dimmed">
                Platform
              </Text>
              <Title order={2} ta="center" fz={{ base: 24, sm: 30 }}>
                Everything you need to work with documents at scale.
              </Title>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {CAPABILITIES.map((c) => (
                <Paper key={c.title} p="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <ThemeIcon variant="light" size="md" radius="md">
                      <c.icon size={16} />
                    </ThemeIcon>
                    <Text fw={700} size="sm">{c.title}</Text>
                    <Text size="sm" c="dimmed" lh={1.7}>{c.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>

            <Group justify="center">
              <Button
                variant="default"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => navigate('/concepts/integrations-v2')}
              >
                See integrations
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ── FINAL CTA ── */}
      <Divider />
      <Box py={88}>
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={{ base: 26, sm: 32 }}>
              Extract metadata. Revise content.
              <br />
              Build datasets you can trust.
            </Title>
            <Text size="lg" c="dimmed" ta="center" maw={520} lh={1.7}>
              Upload your first document, define a schema, and watch structured
              results appear — block by block.
            </Text>
            <Button
              size="lg"
              rightSection={<IconArrowRight size={18} />}
              onClick={() => navigate('/register')}
            >
              Get started free
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box py="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Container size="lg">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">BlockData</Text>
            <Group gap="lg">
              <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => navigate('/concepts/how-it-works-v2')}>How it works</Text>
              <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => navigate('/concepts/use-cases-v2')}>Use cases</Text>
              <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }} onClick={() => navigate('/concepts/integrations-v2')}>Integrations</Text>
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
