import {
  Badge,
  Box,
  Button,
  Container,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

type UseCase = {
  badge: string;
  title: string;
  scenario: string;
  approach: string;
  schema: string[];
  output: string;
  downstream: string;
};

const FEATURED: UseCase[] = [
  {
    badge: 'Metadata Enrichment',
    title: 'Long Document Review',
    scenario:
      'Legal memo, technical manual, or 200-page contract. You need sections, claims, and citations without reading every page.',
    approach:
      'Upload the file, define fields by schema, and process all blocks in parallel. Review low-confidence rows before export.',
    schema: ['section_type', 'claim_type', 'cited_authorities[]', 'confidence', 'page_number'],
    output: 'Structured table of claims, citations, and section labels. One row per block with source traceability.',
    downstream: 'Spreadsheet review, case management workflows, and compliance dashboards.',
  },
  {
    badge: 'Combined Track',
    title: 'Corpus Structuring',
    scenario:
      'Hundreds of reports and filings must become queryable, consistent data for teams and downstream systems.',
    approach:
      'Apply one schema to all files. Workers process blocks in parallel and fill a single review grid in real time.',
    schema: ['document_id', 'topic_tags[]', 'named_entities[]', 'key_findings', 'confidence'],
    output: 'JSONL corpus with immutable provenance and normalized fields across all documents.',
    downstream: 'Warehouse analytics, vector indexing, and knowledge graph pipelines.',
  },
  {
    badge: 'Content Revision',
    title: 'Batch Content Transformation',
    scenario:
      'A large policy or documentation set needs readability and style modernization while preserving source context.',
    approach:
      'Run revision instructions at block level, review side-by-side, confirm approved rows, then export reconstructed output.',
    schema: ['original_block', 'revised_block', 'tone_target', 'readability_score', 'approval_status'],
    output: 'Revised dataset with block-level audit history and deterministic lineage.',
    downstream: 'CMS updates, publication pipelines, and controlled document reconstruction.',
  },
];

const SECONDARY = [
  {
    title: 'Contract review and compliance',
    text: 'Extract obligations, deadlines, and risk clauses with row-level provenance.',
  },
  {
    title: 'Research corpus annotation',
    text: 'Tag methods, findings, and references consistently across large paper collections.',
  },
  {
    title: 'Survey response coding',
    text: 'Classify open-ended responses for quantitative analysis at scale.',
  },
  {
    title: 'Policy translation workflows',
    text: 'Translate high-volume policy text while preserving structure and terminology.',
  },
];

export default function UseCases() {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Box>
      {/* ── HERO ── */}
      <Box
        pt={{ base: 112, md: 146 }}
        pb={{ base: 64, md: 96 }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? 'radial-gradient(circle at 70% 0%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 70%)'
            : 'radial-gradient(circle at 70% 0%, rgba(15,23,42,0.06) 0%, rgba(15,23,42,0) 68%)',
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
              Beyond "chat with PDF"
            </Title>
            <Text ta="center" c="dimmed" size="lg" maw={760} style={{ lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              Schema-driven processing for metadata extraction, content revision, or both - across thousands of blocks.
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* ── FEATURED USE CASES ── */}
      <Box py={{ base: 64, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl">
            {FEATURED.map((useCase) => (
              <Paper
                key={useCase.title}
                p={{ base: 'xl', md: 36 }}
                radius="lg"
                withBorder
                bg="var(--mantine-color-body)"
              >
                <Stack gap="xl">
                  <Stack gap="md">
                    <Badge color="teal" variant="filled" radius="sm" w="fit-content">
                      {useCase.badge}
                    </Badge>
                    <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                      {useCase.title}
                    </Title>
                  </Stack>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 'xl', md: 48 }}>
                    <Stack gap="lg">
                      <Stack gap="xs">
                        <Text fw={700} size="lg">Scenario</Text>
                        <Text c="dimmed" size="lg" lh={1.6}>{useCase.scenario}</Text>
                      </Stack>
                      <Stack gap="xs">
                        <Text fw={700} size="lg">BlockData approach</Text>
                        <Text c="dimmed" size="lg" lh={1.6}>{useCase.approach}</Text>
                      </Stack>
                    </Stack>

                    <Stack gap="lg">
                      <Stack gap="xs">
                        <Text fw={700} size="lg">Example schema</Text>
                        <Paper p="md" radius="md" bg="var(--mantine-color-default-hover)">
                          <Stack gap={6}>
                            {useCase.schema.map((field) => (
                              <Text key={field} ff="monospace" size="lg">{field}</Text>
                            ))}
                          </Stack>
                        </Paper>
                      </Stack>
                      <Stack gap="xs">
                        <Text fw={700} size="lg">Output</Text>
                        <Text c="dimmed" size="lg" lh={1.6}>{useCase.output}</Text>
                      </Stack>
                      <Stack gap="xs">
                        <Text fw={700} size="lg">Downstream</Text>
                        <Text c="dimmed" size="lg" lh={1.6}>{useCase.downstream}</Text>
                      </Stack>
                    </Stack>
                  </SimpleGrid>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── SECONDARY USE CASES ── */}
      <Box py={{ base: 64, md: 96 }}>
        <Container px={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <Stack gap="xl">
            <Title order={2} ta="center">
              More use cases
            </Title>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {SECONDARY.map((item) => (
                <Paper key={item.title} p="xl" radius="md" withBorder>
                  <Stack gap="xs">
                    <Text fw={700} size="lg">{item.title}</Text>
                    <Text c="dimmed" size="lg" lh={1.6}>{item.text}</Text>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* ── FINAL CTA ── */}
      <Box py={{ base: 64, md: 96 }} bg="var(--mantine-color-default-hover)">
        <Container size="sm">
          <Stack align="center" gap="lg">
            <Title order={2} ta="center" fz={{ base: 36, md: 44 }}>
              Try it on a real document.
            </Title>
            <Text ta="center" c="dimmed" size="xl" maw={580}>
              Upload one file and watch structured results appear block by block.
            </Text>
            <Button
              size="xl"
              color="teal"
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
