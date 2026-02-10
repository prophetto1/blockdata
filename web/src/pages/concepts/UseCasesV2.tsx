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
  Divider,
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
import { PublicNav } from '@/components/layout/PublicNav';

/**
 * CONCEPT: UseCasesV2
 *
 * 6 featured use cases spanning the full range of schema possibilities.
 * 4 secondary use cases in compact cards.
 * No "three tracks" taxonomy — just concrete examples of what schemas can do.
 */

const FEATURED = [
  {
    icon: IconPencil,
    title: 'Work through a long document at consistent quality',
    scenario:
      'You have a 50,000-word manuscript, a 200-page thesis, or a lengthy technical report. You need every paragraph reviewed against the same standard — but by paragraph 200, AI drifts. By paragraph 400, it starts skipping.',
    how: 'Upload your document. The platform splits it into blocks. Define a schema — revision rules, quality criteria, whatever you need per block. AI processes every block independently with identical instructions. Paragraph 1 and paragraph 840 get the same treatment.',
    fields: ['revised_content', 'quality_score', 'style_violations', 'changes_made'],
    result: 'A long document reviewed at paragraph-level quality in minutes. Every revision traceable to the exact block that produced it. Reassemble confirmed blocks into a complete revised document.',
  },
  {
    icon: IconShare,
    title: 'Turn a document collection into structured, searchable knowledge',
    scenario:
      'You have dozens of documents — PDFs, Word files, markdown — spread across a shared drive. They contain what your team knows: specs, research, contracts, policies. Extracting structure manually is weeks of work.',
    how: 'Create a project. Upload documents in parallel. Define one schema: the fields you want extracted from every paragraph across every document. Apply it once. AI workers fan out across thousands of blocks simultaneously.',
    fields: ['topic', 'entities', 'relationships', 'key_claims'],
    result: 'A document set turned into structured, traceable output. Export JSONL for your pipeline, push to a knowledge graph, or load into a vector store with metadata filters.',
  },
  {
    icon: IconScale,
    title: 'Legal corpus analysis at paragraph resolution',
    scenario:
      'You need to analyze hundreds of legal opinions — classifying rhetorical functions, extracting cited authorities, mapping argument structures. Manual annotation at this scale is prohibitive.',
    how: 'Upload the corpus. Define a legal analysis schema with fields for rhetorical function, cited authorities, legal principles, and holding vs. dicta classification. AI processes each paragraph independently. Review and confirm in the grid.',
    fields: ['rhetorical_function', 'cited_authorities', 'legal_principle', 'is_holding'],
    result: 'A structured legal dataset with paragraph-level annotations across the entire corpus. Feed into citation network analysis, build evaluation benchmarks, or export for academic research.',
  },
  {
    icon: IconRefresh,
    title: 'Revise an entire corpus to match new standards',
    scenario:
      'Your organization has 77 technical specifications written over 5 years. A new style guide dropped. Every document needs to be rewritten to comply — but doing it manually would take months.',
    how: 'Upload all 77 documents into one project. Define a revision schema with your style guide rules as prompt instructions. Apply to all documents with one click. AI workers process every block in parallel. Review revisions in the grid, edit where needed, confirm, and export revised documents.',
    fields: ['revised_content', 'revision_type', 'compliance_status', 'style_violations_fixed'],
    result: '77 revised documents with full provenance. Every block traces from original content through revision rules to confirmed output. Export the revised documents and the structured audit trail.',
  },
  {
    icon: IconBrain,
    title: 'Build training datasets from expert-reviewed annotations',
    scenario:
      'You want to fine-tune a model on domain-specific extraction — but you need high-quality labeled data with expert review, not raw model output.',
    how: 'Upload your training corpus. Define a schema matching the extraction task you want to teach the model. AI produces initial annotations. Domain experts review, correct, and confirm in the grid. Export as JSONL training pairs: block content → confirmed output.',
    fields: ['classification', 'extracted_entities', 'summary', 'confidence'],
    result: 'A supervised training dataset where every example has been human-reviewed. The staging/confirm flow is your quality gate. Version datasets by schema + run for reproducible training.',
  },
  {
    icon: IconClipboardCheck,
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
    title: 'Batch translation with quality metadata',
    stat: '12 manuals. 4 target languages. 18,000 blocks.',
    description:
      'Define a schema with revised_content (translated text), translation_quality (fluency/accuracy scores), and untranslatable_terms. AI translates block by block. Reviewers confirm per-language.',
  },
  {
    icon: IconFileText,
    title: 'Thesis and dissertation review',
    stat: '80,000 words. 640 blocks. 8 schema fields.',
    description:
      'Schema covers argument strength, citation quality, methodology alignment, and prose clarity. Every paragraph evaluated against your committee\'s standards.',
  },
  {
    icon: IconSearch,
    title: 'RFP response preparation',
    stat: '120-page RFP. 340 requirements. 6 response fields.',
    description:
      'Extract requirements, classify by domain, draft responses per section, tag compliance status. Export a structured requirements matrix alongside the drafted response.',
  },
  {
    icon: IconDatabase,
    title: 'Research paper corpus annotation',
    stat: '200 papers. 42,000 blocks. 5 metadata fields.',
    description:
      'Tag methodology, findings, limitations, and cited works across an entire research corpus. Export for meta-analysis or load into a knowledge graph.',
  },
];

export default function UseCasesV2() {
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
              Use cases that break "chat with a PDF" workflows.
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={680} lh={1.7}>
              When you need consistent, schema-driven output across thousands of paragraphs — metadata, revisions, or both — this is the workflow.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── FEATURED ── */}
      <Box py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="lg">
            {FEATURED.map((uc) => (
              <Paper key={uc.title} p="xl" radius="md" withBorder>
                <Stack gap="md">
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon variant="light" size="lg" radius="md">
                      <uc.icon size={20} />
                    </ThemeIcon>
                    <Title order={3} fz={18} fw={700} lh={1.3} style={{ flex: 1 }}>
                      {uc.title}
                    </Title>
                  </Group>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                    <Stack gap="sm">
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">The situation</Text>
                      <Text size="sm" c="dimmed" lh={1.7}>{uc.scenario}</Text>
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt="sm">How BlockData handles it</Text>
                      <Text size="sm" c="dimmed" lh={1.7}>{uc.how}</Text>
                    </Stack>

                    <Stack gap="sm">
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">Schema fields</Text>
                      <Group gap={6} wrap="wrap">
                        {uc.fields.map((f) => (
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
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt="sm">What you get</Text>
                      <Paper p="sm" radius="sm" style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
                        <Text size="sm" lh={1.7}>{uc.result}</Text>
                      </Paper>
                    </Stack>
                  </SimpleGrid>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── SECONDARY ── */}
      <Box py={72}>
        <Container size="lg">
          <Stack gap="xl">
            <Title order={2} ta="center" fz={28}>More</Title>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {SECONDARY.map((uc) => (
                <Paper key={uc.title} p="xl" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="md">
                        <uc.icon size={20} />
                      </ThemeIcon>
                      <Text fw={700} size="sm">{uc.title}</Text>
                    </Group>
                    <Badge
                      variant="light"
                      radius="sm"
                      size="sm"
                      color="gray"
                      w="fit-content"
                      styles={{ root: { textTransform: 'none' } }}
                    >
                      {uc.stat}
                    </Badge>
                    <Text size="sm" c="dimmed" lh={1.7}>{uc.description}</Text>
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
              Try it on a real document.
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={500}>
              Upload one file and see blocks populate in the grid.
            </Text>
            <Group gap="md">
              <Button
                size="lg"
                rightSection={<IconArrowRight size={18} />}
                onClick={() => navigate('/register')}
              >
                Create account
              </Button>
              <Button
                size="lg"
                variant="default"
                onClick={() => navigate('/concepts/integrations-v2')}
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
