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
  Code,
} from '@mantine/core';
import { IconArrowRight, IconFileText, IconSchema, IconAnalyze, IconDatabase } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '@/components/layout/PublicNav';
import { STEPS } from '@/pages/marketing/content';

/**
 * CONCEPT: HowItWorksModern
 * - Visualizes the pipeline process using a dark mode timeline.
 * - Highlights the "Schema" as the central contract.
 */
export default function HowItWorksModern() {
  const navigate = useNavigate();

  return (
    <Box>
      <PublicNav />
      
      {/* SECTION 1: The Problem (High contrast statement) */}
      <Container size="md" py={100}>
        <Stack align="center" gap="xl" ta="center">
             <BadgeTitle label="The Pipeline" />
             <Title order={1} size={48} lh={1.1}>
                From chaos to <span style={{ color: 'var(--mantine-color-indigo-6)' }}>contract</span>.
             </Title>
             <Text size="xl" c="dimmed" maw={600}>
                Most RAG pipelines fail because they treat documents as blobs of text. 
                BlockData treats them as strict data, paragraph by paragraph.
             </Text>
        </Stack>
      </Container>


      {/* SECTION 2: The Steps (Dark Mode Visualization) */}
      <Box bg="var(--mantine-color-dark-8)" py={100} style={{ position: 'relative', overflow: 'hidden' }}>
         {/* Background Pattern */}
        <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
        }} />

        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80}>
                {/* Visual Side (Sticky) */}
                <Box visibleFrom="md">
                    <Box style={{ position: 'sticky', top: 100 }}>
                       <PipelineVisual />
                    </Box>
                </Box>

                {/* Steps Side */}
                <Stack gap={60}>
                    {STEPS.map((step) => (
                        <Box key={step.step} style={{ color: 'white' }}>
                            <Group gap="md" mb="md" align="center">
                                <ThemeIcon 
                                    size={48} 
                                    radius="xl" 
                                    color="indigo" 
                                    variant="filled"
                                    style={{ border: '4px solid rgba(255,255,255,0.1)' }}
                                >
                                    <step.icon size={24} />
                                </ThemeIcon>
                                <Text fw={700} fz={24} style={{ letterSpacing: '-0.5px' }}>{step.title}</Text>
                            </Group>
                            <Text size="lg" style={{ opacity: 0.7, lineHeight: 1.6, paddingLeft: 64 }}>
                                {step.description}
                            </Text>
                        </Box>
                    ))}
                    
                    <Box pl={64} mt="xl">
                        <Button size="xl" color="indigo" rightSection={<IconArrowRight />} onClick={() => navigate('/register')}>
                            Start processing now
                        </Button>
                    </Box>
                </Stack>
            </SimpleGrid>
        </Container>
      </Box>

      {/* SECTION 3: The Output (Code Block) */}
      <Box py={100} bg="var(--mantine-color-body)">
        <Container size="lg">
             <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60}>
                <Stack>
                     <BadgeTitle label="The Output" color="teal" />
                     <Title order={2}>Generic JSONL, ready for anything.</Title>
                     <Text c="dimmed" size="lg">
                        We don't lock you into a bespoke query language. You get standard JSONL files.
                        Load them into Postgres, Pinecone, or just simple pandas dataframes.
                     </Text>
                </Stack>
                <Paper withBorder radius="md" p={0} shadow="md" style={{ overflow: 'hidden' }}>
                    <Box bg="var(--mantine-color-default-hover)" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                        <Group gap="xs">
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                            <Text size="xs" c="dimmed" ml="sm" ff="monospace">output.jsonl</Text>
                        </Group>
                    </Box>
                    <Code block bg="var(--mantine-color-body)" c="dimmed" p="xl" style={{ fontSize: 13 }}>
{`{"block_id": "blk_192", "type": "financial_table", "data": {"revenue": 4000, "yoy_growth": 0.12}}
{"block_id": "blk_193", "type": "paragraph", "content": "Despite headwinds..."}
{"block_id": "blk_194", "type": "risk_factor", "data": {"severity": "high", "category": "market"}}`}
                    </Code>
                </Paper>
             </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}

function BadgeTitle({ label, color = 'indigo' }: { label: string, color?: string }) {
    return (
        <Text 
            tt="uppercase" 
            fw={800} 
            size="sm" 
            c={color} 
            style={{ letterSpacing: '1px' }}
        >
            {label}
        </Text>
    )
}

function PipelineVisual() {
    return (
        <Paper 
            radius="lg" 
            p="xl" 
            bg="rgba(255,255,255,0.03)" 
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
            <Stack gap={0} align="center" style={{ color: 'white' }}>
                 <VisualStep icon={IconFileText} label="PDF / DOCX" />
                 <Connector />
                 <VisualStep icon={IconSchema} label="Schema Check" />
                 <Connector />
                 <VisualStep icon={IconAnalyze} label="AI Extraction" />
                 <Connector />
                 <VisualStep icon={IconDatabase} label="Structured Data" active />
            </Stack>
        </Paper>
    )
}

function VisualStep({ icon: Icon, label, active }: any) {
    return (
        <Stack align="center" gap="xs">
            <ThemeIcon 
                size={60} 
                radius="md" 
                color={active ? 'teal' : 'dark'} 
                variant={active ? 'filled' : 'light'}
            >
                <Icon size={30} />
            </ThemeIcon>
            <Text size="xs" fw={700} tt="uppercase" opacity={0.7}>{label}</Text>
        </Stack>
    )
}

function Connector() {
    return (
        <Box h={40} w={2} bg="rgba(255,255,255,0.1)" my="xs" />
    )
}
