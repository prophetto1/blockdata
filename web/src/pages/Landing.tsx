import {
  Title,
  Text,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Paper,
  ThemeIcon,
  Box,
  Badge,
  Divider,
} from '@mantine/core';
import {
  IconUpload,
  IconSchema,
  IconBolt,
  IconTable,
  IconFileText,
  IconScale,
  IconPencil,
  IconShare,
  IconArrowRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

// --- Data ---

const STEPS = [
  {
    step: '01',
    title: 'Upload',
    description: 'Drop in any document — Markdown, Word, PDF. The platform decomposes it into ordered, typed blocks with stable identities.',
    icon: IconUpload,
  },
  {
    step: '02',
    title: 'Define Your Schema',
    description: 'Tell the platform what to extract. Browse templates, use the AI wizard, or write JSON directly. Your schema applies identically to every block.',
    icon: IconSchema,
  },
  {
    step: '03',
    title: 'Process',
    description: 'AI processes every block independently — no context window limits, no quality degradation on paragraph 400. Blocks run in parallel at any scale.',
    icon: IconBolt,
  },
  {
    step: '04',
    title: 'Use the Results',
    description: 'Watch structured data populate in real time. Filter, sort, inspect. Export as JSONL or push directly to Neo4j, DuckDB, or a webhook.',
    icon: IconTable,
  },
];

const FEATURED_USE_CASES = [
  {
    icon: IconPencil,
    title: 'Work through a long document — paragraph by paragraph, at consistent quality.',
    scenario:
      'You have a 50,000-word manuscript, a 200-page thesis, or a lengthy technical report. You need every paragraph reviewed against the same standard — structural edits, style rules, factual checks, terminology consistency — but no AI session can maintain quality across that length. By paragraph 200, the model is drifting. By paragraph 400, it\'s skipping sections.',
    how: 'Upload your document. The platform splits it into its natural structure — paragraphs, headings, sections — each one an independent unit. Define a schema describing what you need: a revised paragraph, revision notes, rules applied, a quality score. AI processes every block independently. Paragraph 1 and paragraph 840 get identical treatment — same schema, same instructions, same quality.',
    examples: [
      'Prose editing against a style guide (Strunk\'s rules, house style, AP style)',
      'Technical accuracy review (flag unsupported claims, check citations)',
      'Structural assessment (classify each paragraph\'s rhetorical function)',
      'Terminology extraction (key terms, definitions, cross-references)',
    ],
    result: 'A 50,000-word document reviewed at paragraph-level quality in minutes, not days. Every edit traceable to the exact paragraph that produced it.',
  },
  {
    icon: IconShare,
    title: 'Turn a collection of documents into structured, searchable knowledge.',
    scenario:
      'You have 77 documents — PDFs, Word files, markdown, slide decks — spread across a shared drive. They contain everything your team knows: specifications, research papers, contracts, policies. You need that knowledge structured, searchable, and connected. But organizing 77 documents manually, reading each one, extracting the important parts — that\'s weeks of work. So the documents sit there, useful in theory, inaccessible in practice.',
    how: 'Create a project. Upload all 77 files at once — the platform handles every format. PDFs and Word documents go through Docling, an industrial document engine that preserves tables, layout, and structure. Markdown is parsed for precise structural fidelity. Every document is decomposed into ordered, typed blocks. Define one schema: the fields you want extracted from every paragraph across every document. Apply it once. AI workers fan out across thousands of blocks in parallel.',
    examples: [
      'Entity and relationship extraction (people, organizations, connections)',
      'Topic classification per paragraph (what is this paragraph about?)',
      'Obligation tracking (who committed to what, in which document?)',
      'Cross-reference mapping (which documents reference which?)',
    ],
    result: '77 documents, fully structured, fully connected — every extracted field traceable to its source paragraph. Export to Neo4j for a knowledge graph, DuckDB for analytics, or JSONL for your own pipeline.',
  },
];

const MORE_USE_CASES = [
  {
    icon: IconScale,
    title: 'Legal Research at Scale',
    stat: '28,000 documents. 420,000 blocks.',
    description: 'Extract paragraph-level metadata — rhetorical function, citations, legal principles — from entire legal corpora. Every field traces to a specific paragraph.',
  },
  {
    icon: IconFileText,
    title: 'Contract Review',
    stat: '45 pages. 214 clauses. 6 fields.',
    description: 'Upload a DOCX contract. Get obligations, risk flags, defined terms, cross-references, and deadlines — clause by clause, with page-level tracing.',
  },
];

const FEATURES = [
  { title: 'Multi-Format Ingestion', description: 'Markdown via mdast. DOCX, PDF, and more via Docling. Every format produces the same block inventory.' },
  { title: 'Automatic Block Decomposition', description: 'Documents split into natural units — paragraphs, headings, tables, footnotes. Each block typed, ordered, and traceable.' },
  { title: 'Custom Extraction Schemas', description: 'Define what to extract — types, enums, instructions. Templates, AI wizard, or raw JSON. Your schema, your rules.' },
  { title: 'Integrated AI Processing', description: 'Multiple LLM providers. Constrained decoding guarantees every response conforms to your schema. Zero malformed outputs.' },
  { title: 'Real-Time Block Viewer', description: 'Blocks as rows, schema fields as columns. Results appear as each block completes. Filter, sort, expand.' },
  { title: 'Deterministic Identity', description: 'Every block has a cryptographic ID. Re-upload the same file, get the same IDs. Join to external databases via stable keys.' },
];

// --- Component ---

export default function Landing() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* ===== HERO ===== */}
      <Box py={80}>
        <Container size="md">
          <Stack align="center" gap="xl">
            <Badge variant="light" size="lg" radius="sm">
              Document Intelligence Platform
            </Badge>
            <Title
              order={1}
              ta="center"
              fz={{ base: 36, sm: 48 }}
              fw={700}
              lh={1.1}
            >
              Turn documents into structured knowledge —{' '}
              <Text component="span" inherit c="indigo">
                paragraph by paragraph
              </Text>
              , at any scale.
            </Title>
            <Text
              size="xl"
              c="dimmed"
              ta="center"
              maw={640}
              lh={1.6}
            >
              Upload any document. The platform decomposes it into blocks, each with a
              stable identity. Define what you want extracted. AI processes every block
              against your schema. Watch results fill in, column by column, in real time.
            </Text>
            <Group gap="md">
              <Button
                size="lg"
                rightSection={<IconArrowRight size={18} />}
                onClick={() => navigate('/login')}
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="default"
                component="a"
                href="#how-it-works"
              >
                See How It Works
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ===== PROBLEM ===== */}
      <Box py={60} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap="xs" align="center">
              <Text size="sm" fw={600} c="indigo" tt="uppercase">
                The Problem
              </Text>
              <Title order={2} ta="center" fz={32}>
                Documents hold structured knowledge. Existing tools can't reach it.
              </Title>
            </Stack>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              <Paper p="xl" radius="sm" withBorder>
                <Stack gap="sm">
                  <Text fw={600}>AI can't handle long documents</Text>
                  <Text size="sm" c="dimmed" lh={1.6}>
                    A 39,000-word manuscript exceeds what any AI session can process
                    consistently. The model shortcuts, loses context, skips sections.
                    You've tried pasting the whole thing into ChatGPT. It didn't work.
                  </Text>
                </Stack>
              </Paper>
              <Paper p="xl" radius="sm" withBorder>
                <Stack gap="sm">
                  <Text fw={600}>Document-level metadata misses the value</Text>
                  <Text size="sm" c="dimmed" lh={1.6}>
                    Legal databases classify a case as "about judicial review." They can't
                    tell you which paragraph states the holding or which paragraphs cite
                    which precedents. The insight lives at the paragraph level.
                  </Text>
                </Stack>
              </Paper>
              <Paper p="xl" radius="sm" withBorder>
                <Stack gap="sm">
                  <Text fw={600}>Manual extraction doesn't scale</Text>
                  <Text size="sm" c="dimmed" lh={1.6}>
                    Extracting structured data from 420,000 paragraphs is thousands of hours
                    of expert reading. Reviewing a 45-page contract clause-by-clause takes
                    6-10 hours. The work isn't hard — it's voluminous.
                  </Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ===== HOW IT WORKS ===== */}
      <Box py={60} id="how-it-works">
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap="xs" align="center">
              <Text size="sm" fw={600} c="indigo" tt="uppercase">
                How It Works
              </Text>
              <Title order={2} ta="center" fz={32}>
                From raw document to structured output in four steps.
              </Title>
            </Stack>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
              {STEPS.map((step) => (
                <Paper key={step.step} p="xl" radius="sm" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="sm">
                        <step.icon size={20} />
                      </ThemeIcon>
                      <Text size="xs" fw={700} c="dimmed">
                        STEP {step.step}
                      </Text>
                    </Group>
                    <Text fw={600}>{step.title}</Text>
                    <Text size="sm" c="dimmed" lh={1.6}>
                      {step.description}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ===== FEATURED USE CASES ===== */}
      <Box py={60} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap="xs" align="center">
              <Text size="sm" fw={600} c="indigo" tt="uppercase">
                Use Cases
              </Text>
              <Title order={2} ta="center" fz={32}>
                Built for anyone who needs structured data from documents.
              </Title>
            </Stack>
            <Stack gap="xl">
              {FEATURED_USE_CASES.map((uc) => (
                <Paper key={uc.title} p="xl" radius="sm" withBorder>
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="sm" color="indigo">
                        <uc.icon size={20} />
                      </ThemeIcon>
                      <Title order={3} fz={20} fw={600}>{uc.title}</Title>
                    </Group>
                    <Text size="sm" c="dimmed" lh={1.7}>
                      {uc.scenario}
                    </Text>
                    <Box>
                      <Text size="sm" fw={600} mb={4}>How it works here:</Text>
                      <Text size="sm" c="dimmed" lh={1.7}>
                        {uc.how}
                      </Text>
                    </Box>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                      {uc.examples.map((ex) => (
                        <Group key={ex} gap="xs" wrap="nowrap" align="flex-start">
                          <Text size="sm" c="indigo" mt={2} style={{ flexShrink: 0 }}>-</Text>
                          <Text size="xs" c="dimmed" lh={1.5}>{ex}</Text>
                        </Group>
                      ))}
                    </SimpleGrid>
                    <Paper p="sm" radius="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                      <Text size="sm" fw={500} lh={1.6}>{uc.result}</Text>
                    </Paper>
                  </Stack>
                </Paper>
              ))}
            </Stack>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mt="md">
              {MORE_USE_CASES.map((uc) => (
                <Paper key={uc.title} p="xl" radius="sm" withBorder>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="lg" radius="sm" color="indigo">
                        <uc.icon size={20} />
                      </ThemeIcon>
                      <Text fw={600}>{uc.title}</Text>
                    </Group>
                    <Badge variant="light" size="sm" color="gray" radius="sm">
                      {uc.stat}
                    </Badge>
                    <Text size="sm" c="dimmed" lh={1.6}>
                      {uc.description}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ===== FEATURES ===== */}
      <Box py={60}>
        <Container size="lg">
          <Stack gap="xl">
            <Stack gap="xs" align="center">
              <Text size="sm" fw={600} c="indigo" tt="uppercase">
                Capabilities
              </Text>
              <Title order={2} ta="center" fz={32}>
                Everything you need to extract structured knowledge.
              </Title>
            </Stack>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {FEATURES.map((f) => (
                <Stack key={f.title} gap="xs">
                  <Text fw={600} size="sm">{f.title}</Text>
                  <Text size="sm" c="dimmed" lh={1.6}>
                    {f.description}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Divider />

      {/* ===== CLOSING CTA ===== */}
      <Box py={80}>
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={32}>
              Stop reading documents.{' '}
              <Text component="span" inherit c="indigo">
                Start extracting knowledge.
              </Text>
            </Title>
            <Text size="lg" c="dimmed" ta="center" maw={480}>
              Upload your first document, define a schema, and watch structured
              results appear — block by block.
            </Text>
            <Button
              size="lg"
              rightSection={<IconArrowRight size={18} />}
              onClick={() => navigate('/login')}
            >
              Get Started Free
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ===== FOOTER ===== */}
      <Box
        py="lg"
        style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
      >
        <Container size="lg">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              MD-Annotate
            </Text>
            <Text size="xs" c="dimmed">
              Document intelligence platform
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
