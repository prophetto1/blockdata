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
  Code,
  ThemeIcon,
} from '@mantine/core';
import { IconArrowRight, IconDatabase, IconWebhook, IconFileCode, IconTable } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '@/components/layout/PublicNav';

/**
 * CONCEPT: IntegrationsModern (Restored Terminal Visual)
 * - Section 2: Terminal Visual + JSONL Contract.
 * - Section 3: Export Formats.
 */
export default function IntegrationsModern() {
  const navigate = useNavigate();

  return (
    <Box>
      <PublicNav />
      {/* HERO SECTION */}
      <Box 
        bg="var(--mantine-color-dark-8)" 
        style={{ position: 'relative', overflow: 'hidden' }}
        py={{ base: 80, md: 100 }}
      >
         {/* Background Pattern */}
        <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
        }} />

        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
             <Stack align="center" ta="center">
                <Title 
                    order={1} 
                    style={{ color: 'white', fontSize: 'clamp(2.5rem, 4vw, 4rem)', lineHeight: 1.1, fontWeight: 800 }}
                >
                    Integrations start with a <br/>
                    <span style={{ color: 'var(--mantine-color-indigo-4)' }}>stable contract.</span>
                </Title>
                <Text size="xl" style={{ color: 'rgba(255,255,255,0.7)' }} maw={700} mt="xl">
                     Once overlays are confirmed, the platform produces canonical JSONL — one record per block, ordered, traceable, schema-conformant.
                </Text>

                {/* VISUAL: Terminal */}
                <Paper 
                    mt={60}
                    w="100%"
                    maw={800}
                    radius="md"
                    bg="#1A1B1E"
                    p="0"
                    style={{ border: '1px solid #373A40', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                >
                    <Box bg="#2C2E33" px="md" py="xs" style={{ borderBottom: '1px solid #373A40', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                        <Text ml="xs" c="dimmed" size="xs" ff="monospace">bash — 80x24</Text>
                    </Box>
                    <Box p="lg" ta="left">
                        <Code block bg="transparent" c="gray.4" style={{ fontSize: 13, lineHeight: 1.6 }}>
{`$ curl -X GET https://api.blockdata.com/v1/projects/proj_77/export \\
  -H "Authorization: Bearer sk_live_..." \\
  -o export.jsonl

> Downloading export.jsonl... [====================] 100%
> 5,420 blocks processed. 
> 5,420 blocks verified.`}
                        </Code>
                    </Box>
                </Paper>
            </Stack>
        </Container>
      </Box>

      {/* SECTION 2: THE CONTRACT */}
      <Box py={80} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} style={{ alignItems: 'center' }}>
                <Stack>
                     <Title order={2}>The perfect JSONL.</Title>
                     <Text size="lg" c="dimmed">
                        We don't lock you into a bespoke query language. You get standard JSONL files.
                        Load them into Postgres, Pinecone, or just simple pandas dataframes.
                     </Text>
                     <SimpleGrid cols={2} spacing="xl" mt="xl">
                        <Box>
                            <ThemeIcon size="lg" radius="md" color="indigo" variant="light" mb="sm"><IconDatabase size={18} /></ThemeIcon>
                            <Text fw={700}>Immutable</Text>
                            <Text size="sm" c="dimmed">Identity and provenance. Same block, same hash.</Text>
                        </Box>
                         <Box>
                            <ThemeIcon size="lg" radius="md" color="teal" variant="light" mb="sm"><IconTable size={18} /></ThemeIcon>
                            <Text fw={700}>User Defined</Text>
                            <Text size="sm" c="dimmed">Schema-driven overlay. Confirmed by human review.</Text>
                        </Box>
                    </SimpleGrid>
                </Stack>
                <Paper withBorder p="xl" radius="md">
                     <Code block style={{ fontSize: 12 }}>
{`{
  "immutable": {
    "source_upload": { "filename": "brief.docx" },
    "block": { "block_uid": "blk_123", "type": "paragraph" }
  },
  "user_defined": {
    "schema_ref": "scotus_close_reading_v1",
    "data": { 
        "rhetorical_function": "holding", 
        "cited_authorities": ["Roe v. Wade"] 
    }
  }
}`}
                    </Code>
                </Paper>
            </SimpleGrid>
        </Container>
      </Box>

      {/* SECTION 3: EXPORT FORMATS */}
      <Box py={100} bg="var(--mantine-color-body)">
        <Container size="lg">
             <Title order={2} mb="xl">Export Formats</Title>
             <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                <FormatCard title="JSONL" desc="Canonical. One record per line. Nested structure." usage="ML pipelines, fine-tuning." />
                <FormatCard title="CSV" desc="Flat. Universal. Overlay fields become columns." usage="Spreadsheets, simple analysis." />
                <FormatCard title="Parquet" desc="Columnar compression. Schema-embedded." usage="Data lakes, warehouses." />
             </SimpleGrid>
        </Container>
      </Box>

      {/* SECTION 4: FILE PIPELINES */}
      <Box py={100} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
             <Title order={2} mb="xl">File-Based Pipelines</Title>
             <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                 <PipelineCard title="Fine-Tuning Datasets" desc="Confirmed overlays are supervised training examples." />
                 <PipelineCard title="Evaluation Benchmarks" desc="Gold-standard test sets versioned by schema." />
                 <PipelineCard title="Analytical Datasets" desc="Load flattened CSV/Parquet into Pandas/R." />
                 <PipelineCard title="Vector Stores" desc="Embed block content + metadata filter attributes." />
             </SimpleGrid>
        </Container>
      </Box>

      {/* SECTION 5: PUSH INTEGRATIONS */}
      <Box py={100} bg="var(--mantine-color-body)">
        <Container size="lg">
             <Title order={2} mb="xl">Push Integrations</Title>
             <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                <IntegrationCard icon={IconDatabase} title="Neo4j" desc="Map fields to nodes/edges. Push to graph." />
                <IntegrationCard icon={IconWebhook} title="Webhook" desc="POST JSONL to any endpoint on completion." />
                <IntegrationCard icon={IconFileCode} title="S3 / GCS" desc="Export versioned Parquet to Object Storage." />
             </SimpleGrid>
        </Container>
      </Box>

      {/* CTA */}
      <Box py={100} bg="var(--mantine-color-default-hover)">
        <Container size="md" ta="center">
             <Stack align="center" gap="md">
                <Title order={2}>Build a dataset you can trust</Title>
                <Button size="xl" color="indigo" onClick={() => navigate('/register')} rightSection={<IconArrowRight />}>
                    Get started
                </Button>
            </Stack>
        </Container>
      </Box>
    </Box>
  );
}

function FormatCard({ title, desc, usage }: any) {
    return (
        <Paper withBorder p="xl" radius="md">
            <Group mb="sm"><ThemeIcon color="gray" variant="light"><IconFileCode size={18}/></ThemeIcon><Text fw={700}>{title}</Text></Group>
            <Text size="sm" mb="xs">{desc}</Text>
            <Text size="xs" c="indigo" fw={700}>{usage}</Text>
        </Paper>
    )
}

function PipelineCard({ title, desc }: any) {
    return (
        <Paper withBorder p="lg" radius="md" style={{ display: 'flex', gap: 16 }}>
             <ThemeIcon size="lg" radius="md" color="teal" variant="light"><IconTable size={18} /></ThemeIcon>
             <Box>
                 <Text fw={700}>{title}</Text>
                 <Text size="sm" c="dimmed">{desc}</Text>
             </Box>
        </Paper>
    )
}

function IntegrationCard({ icon: Icon, title, desc }: any) {
    return (
        <Paper withBorder p="xl" radius="md">
            <ThemeIcon size={48} radius="md" color="indigo" variant="light" mb="md">
                <Icon size={24} />
            </ThemeIcon>
            <Title order={3} size="h4" mb="sm">{title}</Title>
            <Text c="dimmed" size="sm" lh={1.6}>{desc}</Text>
        </Paper>
    )
}
