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
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconScale,
  IconPencil,
  IconFileText,
  IconShare,
  IconBrain,
  IconDatabase,
  IconRefresh,
  IconClipboardCheck,
  IconLanguage,
  IconSearch,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNavModern } from '@/components/layout/PublicNavModern';

/**
 * UseCases — v2.1
 *
 * v2.1 improvements:
 * - Theme-adaptive hero (no hardcoded white)
 * - Colored accents per use case for visual anchoring
 * - Colored ThemeIcons, left borders, section labels, field badges
 */

const FEATURED = [
  {
    icon: IconPencil,
    color: 'green',
    title: 'Work through a long document at consistent quality',
    scenario:
      'You have a 50,000-word manuscript, a 200-page thesis, or a lengthy technical report. You need every paragraph reviewed against the same standard — but by paragraph 200, AI drifts. By paragraph 400, it starts skipping.',
    how: 'Upload your document. The platform splits it into blocks. Define a schema — revision rules, quality criteria, whatever you need per block. AI processes every block independently with identical instructions. Paragraph 1 and paragraph 840 get the same treatment.',
    fields: ['revised_content', 'quality_score', 'style_violations', 'changes_made'],
    result: 'A long document reviewed at paragraph-level quality in minutes. Every revision traceable to the exact block that produced it. Reassemble confirmed blocks into a complete revised document.',
  },
  {
    icon: IconShare,
    color: 'blue',
    title: 'Turn a document collection into structured, searchable knowledge',
    scenario:
      'You have dozens of documents — PDFs, Word files, markdown — spread across a shared drive. They contain what your team knows: specs, research, contracts, policies. Extracting structure manually is weeks of work.',
    how: 'Create a project. Upload documents in parallel. Define one schema: the fields you want extracted from every paragraph across every document. Apply it once. AI workers fan out across thousands of blocks simultaneously.',
    fields: ['topic', 'entities', 'relationships', 'key_claims'],
    result: 'A document set turned into structured, traceable output. Export JSONL for your pipeline, push to a knowledge graph, or load into a vector store with metadata filters.',
  },
  {
    icon: IconScale,
    color: 'indigo',
    title: 'Legal corpus analysis at paragraph resolution',
    scenario:
      'You need to analyze hundreds of legal opinions — classifying rhetorical functions, extracting cited authorities, mapping argument structures. Manual annotation at this scale is prohibitive.',
    how: 'Upload the corpus. Define a legal analysis schema with fields for rhetorical function, cited authorities, legal principles, and holding vs. dicta classification. AI processes each paragraph independently. Review and confirm in the grid.',
    fields: ['rhetorical_function', 'cited_authorities', 'legal_principle', 'is_holding'],
    result: 'A structured legal dataset with paragraph-level annotations across the entire corpus. Feed into citation network analysis, build evaluation benchmarks, or export for academic research.',
  },
  {
    icon: IconRefresh,
    color: 'teal',
    title: 'Revise an entire corpus to match new standards',
    scenario:
      'Your organization has 77 technical specifications written over 5 years. A new style guide dropped. Every document needs to be rewritten to comply — but doing it manually would take months.',
    how: 'Upload all 77 documents into one project. Define a revision schema with your style guide rules as prompt instructions. Apply to all documents with one click. AI workers process every block in parallel. Review revisions in the grid, edit where needed, confirm, and export revised documents.',
    fields: ['revised_content', 'revision_type', 'compliance_status', 'style_violations_fixed'],
    result: '77 revised documents with full provenance. Every block traces from original content through revision rules to confirmed output. Export the revised documents and the structured audit trail.',
  },
  {
    icon: IconBrain,
    color: 'orange',
    title: 'Build training datasets from expert-reviewed annotations',
    scenario:
      'You want to fine-tune a model on domain-specific extraction — but you need high-quality labeled data with expert review, not raw model output.',
    how: 'Upload your training corpus. Define a schema matching the extraction task you want to teach the model. AI produces initial annotations. Domain experts review, correct, and confirm in the grid. Export as JSONL training pairs: block content → confirmed output.',
    fields: ['classification', 'extracted_entities', 'summary', 'confidence'],
    result: 'A supervised training dataset where every example has been human-reviewed. The staging/confirm flow is your quality gate. Version datasets by schema + run for reproducible training.',
  },
  {
    icon: IconClipboardCheck,
    color: 'violet',
    title: 'Contract review with revision and compliance metadata',
    scenario:
      'A 45-page master service agreement needs review: identify obligations, flag risks, and produce a revised version with non-compliant clauses rewritten — all traceable to the original clause.',
    how: 'Upload the contract. Define a schema that extracts obligations, risk flags, and defined terms, while also producing revised text for non-compliant clauses. AI processes each clause independently. Review both the metadata and the revisions before confirming.',
    fields: ['revised_content', 'obligation_type', 'risk_level', 'defined_terms', 'deadline'],
    result: 'A reviewed contract with clause-level metadata and a revised version with non-compliant language rewritten. Both export from the same confirmed overlays.',
  },
];

const SECONDARY = [
  {
    icon: IconLanguage,
    color: 'cyan',
    title: 'Batch translation with quality metadata',
    stat: '12 manuals. 4 target languages. 18,000 blocks.',
    description:
      'Define a schema with revised_content (translated text), translation_quality (fluency/accuracy scores), and untranslatable_terms. AI translates block by block. Reviewers confirm per-language.',
  },
  {
    icon: IconFileText,
    color: 'blue',
    title: 'Thesis and dissertation review',
    stat: '80,000 words. 640 blocks. 8 schema fields.',
    description:
      'Schema covers argument strength, citation quality, methodology alignment, and prose clarity. Every paragraph evaluated against your committee\'s standards.',
  },
  {
    icon: IconSearch,
    color: 'orange',
    title: 'RFP response preparation',
    stat: '120-page RFP. 340 requirements. 6 response fields.',
    description:
      'Extract requirements, classify by domain, draft responses per section, tag compliance status. Export a structured requirements matrix alongside the drafted response.',
  },
  {
    icon: IconDatabase,
    color: 'grape',
    title: 'Research paper corpus annotation',
    stat: '200 papers. 42,000 blocks. 5 metadata fields.',
    description:
      'Tag methodology, findings, limitations, and cited works across an entire research corpus. Export for meta-analysis or load into a knowledge graph.',
  },
];

export default function UseCases({ withNav = true }: { withNav?: boolean }) {
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
            ? 'radial-gradient(circle at 70% 0%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%)'
            : 'radial-gradient(circle at 70% 0%, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 70%)',
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
              Real-world Application
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
              Beyond "Chat with PDF"
            </Title>
            <Text ta="center" c="dimmed" size="xl" maw={720} lh={1.6}>
              When you need consistent, schema-driven output across thousands of paragraphs — metadata, revisions, or both — this is the workflow.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── FEATURED ── */}
      <Box py={100} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
          <Stack gap="xl">
            {FEATURED.map((uc) => (
              <Paper
                key={uc.title}
                p="xl"
                radius="lg"
                withBorder
                bg="var(--mantine-color-body)"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderLeft: `3px solid var(--mantine-color-${uc.color}-6)`,
                }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60}>
                  <Stack gap="md">
                    <Group gap="md">
                      <ThemeIcon variant="light" size="xl" radius="md" color={uc.color}>
                        <uc.icon size={24} />
                      </ThemeIcon>
                      <Title order={3} size="h2" lh={1.2}>
                        {uc.title}
                      </Title>
                    </Group>
                    <Stack gap="xs" mt="md">
                      <Text size="xs" fw={700} c={`${uc.color}.6`} tt="uppercase">The Situation</Text>
                      <Text size="md" c="dimmed" lh={1.6}>{uc.scenario}</Text>
                    </Stack>
                    <Stack gap="xs" mt="sm">
                      <Text size="xs" fw={700} c={`${uc.color}.6`} tt="uppercase">The Workflow</Text>
                      <Text size="md" c="dimmed" lh={1.6}>{uc.how}</Text>
                    </Stack>
                  </Stack>

                  <Stack mt={{ base: 0, md: 10 }}>
                    <Paper
                      p="lg"
                      radius="md"
                      bg="var(--mantine-color-default-hover)"
                      withBorder
                      style={{ borderLeft: `3px solid var(--mantine-color-${uc.color}-4)` }}
                    >
                      <Stack gap="xs">
                        <Text size="xs" fw={700} c={`${uc.color}.6`} tt="uppercase">Output</Text>
                        <Text size="sm" style={{ fontWeight: 500 }} lh={1.6}>{uc.result}</Text>
                      </Stack>
                    </Paper>
                    <Stack gap="xs" mt="md">
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">Schema Fields</Text>
                      <Group gap={6} wrap="wrap">
                        {uc.fields.map((f) => (
                          <Badge
                            key={f}
                            variant="outline"
                            color={uc.color}
                            size="md"
                            radius="sm"
                            styles={{ root: { textTransform: 'none', fontWeight: 500, fontFamily: 'monospace' } }}
                          >
                            {f}
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  </Stack>
                </SimpleGrid>
              </Paper>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── SECONDARY ── */}
      <Box py={100}>
        <Container size="lg">
          <Stack gap="xl">
            <Title order={2} ta="center" fz={32}>Use cases at scale.</Title>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {SECONDARY.map((uc) => (
                <Paper key={uc.title} p="xl" radius="md" withBorder>
                  <Stack gap="md">
                    <Group gap="md">
                      <ThemeIcon variant="light" size="lg" radius="md" color={uc.color}>
                        <uc.icon size={20} />
                      </ThemeIcon>
                      <Text fw={700} size="lg">{uc.title}</Text>
                    </Group>
                    <Badge
                      variant="light"
                      radius="sm"
                      size="md"
                      color={uc.color}
                      w="fit-content"
                      styles={{ root: { textTransform: 'none' } }}
                    >
                      {uc.stat}
                    </Badge>
                    <Text size="md" c="dimmed" lh={1.6}>{uc.description}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box py={120} bg="var(--mantine-color-default-hover)">
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={40}>
              Try it on a real document.
            </Title>
            <Text ta="center" c="dimmed" size="xl" maw={520} lh={1.6}>
              Upload one file and see blocks populate in the grid.
            </Text>
            <Group gap="md">
              <Button
                size="xl"
                rightSection={<IconArrowRight size={20} />}
                onClick={() => navigate('/register')}
              >
                Create account
              </Button>
              <Button
                size="xl"
                variant="default"
                onClick={() => navigate('/integrations')}
              >
                See integrations
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
