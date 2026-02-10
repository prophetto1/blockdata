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
} from '@mantine/core';
import { IconArrowRight, IconDatabase, IconCheck, IconPencil, IconWand } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNavModern } from '@/components/layout/PublicNavModern';

/**
 * CONCEPT: LandingModern (Updated to match Spec)
 * - Hero: Problem-led messaging.
 * - Section 2: Three Tracks (Enrich, Revise, Combined).
 * - Section 3: How It Works (4 steps from spec).
 * - Section 4: Use Cases Teaser.
 * - Section 5: Capabilities.
 */
export default function LandingModern() {
  const navigate = useNavigate();

  return (
    <Box>
      <PublicNavModern />
      {/* SECTION 1: HERO */}
      <Box 
        bg="var(--mantine-color-dark-8)" 
        style={{ position: 'relative', overflow: 'hidden' }}
        py={{ base: 80, md: 120 }}
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
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80} style={{ alignItems: 'center' }}>
                <Stack align="start" gap="xl">
                    <Badge variant="filled" color="indigo" size="lg" radius="xl" tt="none">
                        Document Intelligence Platform
                    </Badge>
                    
                    <Title 
                        order={1} 
                        style={{ color: 'white', fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', lineHeight: 1.1, fontWeight: 800 }}
                    >
                        Structured knowledge, trapped in unstructured paragraphs.
                    </Title>
                    
                    <Text size="xl" maw={600} style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Upload documents. Define what you want—metadata, revisions, or both. 
                        We process every block independently, so you can review and export with confidence.
                    </Text>

                    <Group mt="md">
                        <Button size="xl" color="indigo" onClick={() => navigate('/register')}>
                            Get started free
                        </Button>
                        <Button size="xl" variant="default" onClick={() => navigate('/how-it-works')} 
                            styles={{ root: { backgroundColor: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.3)' } }}
                        >
                            How it works
                        </Button>
                    </Group>
                </Stack>

                {/* VISUAL: Transformation */}
                <Paper 
                    radius="md" 
                    p="xl" 
                    bg="rgba(255,255,255,0.05)" 
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <Stack gap="md">
                        <Box>
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Input Block (Paragraph)</Text>
                            <Paper p="md" radius="sm" bg="rgba(0,0,0,0.3)" style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', fontSize: 13 }}>
                                "The tenant shall pay a base rent of $4,500 per month, subject to a 3% annual increase starting year 2."
                            </Paper>
                        </Box>
                        <Box h={1} bg="rgba(255,255,255,0.1)" />
                        <Box>
                            <Text size="xs" fw={700} tt="uppercase" c="brand" mb={4} style={{ color: 'var(--mantine-color-teal-4)' }}>Structured Output</Text>
                            <Paper p="md" radius="sm" bg="rgba(0,0,0,0.3)">
                                <Code block bg="transparent" c="dimmed" style={{ fontSize: 13 }}>
{`{
  "rent_amount": 4500,
  "currency": "USD",
  "period": "monthly",
  "escalation_rate": 0.03
}`}
                                </Code>
                            </Paper>
                        </Box>
                    </Stack>
                </Paper>
            </SimpleGrid>
        </Container>
      </Box>

      {/* SECTION 2: THREE TRACKS */}
      <Box py={100} bg="var(--mantine-color-body)">
        <Container size="lg">
            <Title order={2} ta="center" mb={60}>One platform. Three ways to work.</Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                <TrackCard 
                    title="Enrich"
                    icon={IconDatabase}
                    description="AI analyzes each block and adds structured labels without changing the source content."
                    example="Classify rhetorical function. Extract citations. Tag topics."
                />
                <TrackCard 
                    title="Revise"
                    icon={IconPencil}
                    description="AI rewrites each block according to your rules. Reassemble into a revised document."
                    example="Rewrite to plain language. Update specs to new style guide."
                />
                <TrackCard 
                    title="Combine"
                    icon={IconWand}
                    description="AI revises content AND produces metadata about the revision."
                    example="Simplify legal text to 6th-grade level, tag what changed."
                />
            </SimpleGrid>
        </Container>
      </Box>

      {/* SECTION 3: HOW IT WORKS (Summary) */}
      <Box py={100} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
            <Stack align="center" gap="xl" mb={60}>
                 <Title order={2}>How it works</Title>
            </Stack>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
                 <StepCard number="01" title="Upload" text="Drop in any document interactions. Multi-format support built-in." />
                 <StepCard number="02" title="Define Schema" text="Tell the platform what to extract or revise. Your schema is the contract." />
                 <StepCard number="03" title="Process" text="Concurrent workers process blocks in parallel. 5,000 blocks in minutes." />
                 <StepCard number="04" title="Review & Export" text="Staging -> Confirm -> Export. Nothing leaves without approval." />
            </SimpleGrid>
            <Group justify="center" mt="xl">
                <Button variant="subtle" size="lg" rightSection={<IconArrowRight />} onClick={() => navigate('/how-it-works')}>
                    See the full workflow
                </Button>
            </Group>
        </Container>
      </Box>

       {/* SECTION 4: USE CASES (Teaser) */}
       <Box py={100} bg="var(--mantine-color-body)">
        <Container size="lg">
             <Title order={2} ta="center" mb={60}>Built for scale</Title>
             <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                <UseCaseCard title="Long Document Review" text="Work through a 50,000-word document paragraph by paragraph." track="Revision" />
                <UseCaseCard title="Corpus Knowledge" text="Turn 77 documents into a structured, searchable dataset." track="Enrichment" />
                <UseCaseCard title="Compliance Audit" text="Extract obligations clause by clause with full traceability." track="Combined" />
             </SimpleGrid>
             <Group justify="center" mt="xl">
                <Button variant="subtle" size="lg" rightSection={<IconArrowRight />} onClick={() => navigate('/use-cases')}>
                    Explore all use cases
                </Button>
            </Group>
        </Container>
       </Box>

       {/* SECTION 5: CAPABILITIES */}
       <Box py={100} bg="var(--mantine-color-default-hover)">
         <Container size="lg">
            <Title order={2} ta="center" mb={60}>Enterprise Grade</Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
                <Capability title="Multi-Format Ingestion" text="Markdown, DOCX, PDF via Docling." />
                <Capability title="Schema-Driven Processing" text="Define exactly what to extract or revise." />
                <Capability title="Block-Level Parallelism" text="20 workers, 5,000 blocks, under 15 minutes." />
                <Capability title="Realtime Working Surface" text="Watch results fill in live. Edit inline." />
                <Capability title="Deterministic Identity" text="Stable block IDs for joinability." />
                <Capability title="Human-in-the-Loop" text="AI writes to staging. You confirm." />
            </SimpleGrid>
             <Group justify="center" mt="xl">
                <Button variant="subtle" size="lg" rightSection={<IconArrowRight />} onClick={() => navigate('/integrations')}>
                    See integrations
                </Button>
            </Group>
         </Container>
       </Box>

       {/* SECTION 6: CTA */}
       <Box py={120} bg="var(--mantine-color-body)">
         <Container size="md" ta="center">
            <Title order={1} mb="md">Extract metadata. Revise content.</Title>
            <Text size="xl" c="dimmed" mb="xl">Build datasets you can trust.</Text>
            <Button size="xl" color="indigo" onClick={() => navigate('/register')}>
                Get started free
            </Button>
         </Container>
       </Box>

    </Box>
  );
}

function TrackCard({ title, icon: Icon, description, example }: any) {
    return (
        <Paper withBorder p="xl" radius="md">
            <ThemeIcon size={48} radius="md" color="indigo" variant="light" mb="md">
                <Icon size={24} />
            </ThemeIcon>
            <Title order={3} size="h4" mb="xs">{title}</Title>
            <Text size="sm" mb="md">{description}</Text>
            <Text size="xs" c="dimmed" bg="var(--mantine-color-default)" p="xs" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
                Example: {example}
            </Text>
        </Paper>
    )
}

function StepCard({ number, title, text }: any) {
    return (
        <Paper withBorder p="lg" radius="md">
            <Text size="xl" fw={800} c="dimmed" mb="xs" style={{ opacity: 0.3 }}>{number}</Text>
            <Text fw={700} mb="xs">{title}</Text>
            <Text size="sm" c="dimmed">{text}</Text>
        </Paper>
    )
}

function UseCaseCard({ title, text, track }: any) {
    return (
        <Paper withBorder p="xl" radius="md">
            <Badge variant="light" color="gray" mb="md">{track}</Badge>
            <Title order={3} size="h4" mb="sm">{title}</Title>
            <Text size="sm" c="dimmed">{text}</Text>
        </Paper>
    )
}

function Capability({ title, text }: any) {
    return (
        <Box>
            <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" radius="xl" color="teal" variant="filled"><IconCheck size={10} /></ThemeIcon>
                <Text fw={700} size="sm">{title}</Text>
            </Group>
            <Text size="sm" c="dimmed" pl={28}>{text}</Text>
        </Box>
    )
}
