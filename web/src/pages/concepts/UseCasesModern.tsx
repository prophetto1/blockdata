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
} from '@mantine/core';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '@/components/layout/PublicNav';
import { FEATURED_USE_CASES, MORE_USE_CASES } from '@/pages/marketing/content';

/**
 * CONCEPT: UseCasesModern (Restored Data-Driven Version)
 * - Hero: Spec copy with dark background.
 * - Featured: Iterates CONTENT.ts (Zig-Zag).
 * - Seconday: Iterates CONTENT.ts (Grid).
 */
export default function UseCasesModern() {
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
            <Stack align="center" gap="xl" ta="center">
                <Badge variant="filled" color="indigo" size="lg" radius="xl" tt="none">
                    Use Cases
                </Badge>
                
                <Title 
                    order={1} 
                    ta="center" 
                    style={{ color: 'white', fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', lineHeight: 1.1, fontWeight: 800 }}
                >
                    When "chat with a PDF" breaks.
                </Title>
                
                <Text ta="center" size="xl" maw={700} style={{ color: 'rgba(255,255,255,0.7)' }}>
                    For teams that need consistent, schema-constrained output across thousands of paragraphs.
                </Text>
            </Stack>
        </Container>
      </Box>

      {/* FEATURED USE CASES (From Content.ts) */}
      <Box py={100} bg="var(--mantine-color-body)">
        <Container size="lg">
            <Stack gap={100}>
                {FEATURED_USE_CASES.map((item, index) => (
                    <SimpleGrid key={item.title} cols={{ base: 1, md: 2 }} spacing={80} style={{ alignItems: 'center' }}>
                         {/* Text Side */}
                         <Stack style={{ order: index % 2 === 0 ? 1 : 2 }}>
                            <Group>
                                <ThemeIcon size={48} radius="md" color="indigo" variant="light">
                                    <item.icon size={24} />
                                </ThemeIcon>
                            </Group>
                            
                            <Title order={2}>{item.title}</Title>
                            
                            <Stack gap="sm">
                                <Text size="sm" fw={700} c="dimmed" tt="uppercase">The Problem</Text>
                                <Text size="lg">{item.scenario}</Text>
                            </Stack>
                            
                            <Stack gap="sm">
                                <Text size="sm" fw={700} c="dimmed" tt="uppercase">The Solution</Text>
                                <Text c="dimmed">{item.how}</Text>
                            </Stack>
                         </Stack>

                         {/* Visual/List Side */}
                         <Paper 
                            style={{ order: index % 2 === 0 ? 2 : 1 }}
                            withBorder 
                            p="xl" 
                            radius="lg" 
                            bg="var(--mantine-color-default)"
                         >
                            <Stack gap="xl">
                                <Box>
                                     <Text size="sm" fw={700} mb="sm" tt="uppercase">Examples:</Text>
                                     <Stack gap="xs">
                                        {item.examples.map((ex) => (
                                            <Group gap="xs" key={ex} align="start" wrap="nowrap">
                                                <ThemeIcon size={6} color="indigo" radius="xl" mt={6}><IconCheck/></ThemeIcon>
                                                <Text size="sm">{ex}</Text>
                                            </Group>
                                        ))}
                                     </Stack>
                                </Box>
                                <Box>
                                     <Text size="sm" fw={700} mb="sm" tt="uppercase">Delivers:</Text>
                                     <Group gap="xs" align="start">
                                        <ThemeIcon size="sm" color="teal" radius="xl" mt={4}><IconCheck size={10} /></ThemeIcon>
                                        <Text size="sm">{item.result}</Text>
                                     </Group>
                                </Box>
                            </Stack>
                         </Paper>
                    </SimpleGrid>
                ))}
            </Stack>
        </Container>
      </Box>

      {/* SECONDARY USE CASES (From Content.ts) */}
      <Box py={80} bg="var(--mantine-color-default-hover)">
        <Container size="lg">
             <Title order={2} mb="xl">Specific Scenarios</Title>
             <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {MORE_USE_CASES.map((item) => (
                    <SecondaryCard 
                        key={item.title}
                        title={item.title} 
                        track="Enrichment" // Content.ts doesn't have track, defaulting
                        stat={item.stat} 
                        desc={item.description} 
                    />
                ))}
             </SimpleGrid>
        </Container>
      </Box>
      
      <Box py={100} bg="var(--mantine-color-body)">
        <Container size="sm" ta="center">
             <Title order={2} mb="md">Try it on your own documents</Title>
             <Button size="xl" color="indigo" onClick={() => navigate('/register')} rightSection={<IconArrowRight />}>
                Start Building
             </Button>
        </Container>
      </Box>
    </Box>
  );
}

function SecondaryCard({ title, stat, desc }: any) {
    return (
        <Paper p="md" radius="md" withBorder>
             <Group justify="space-between" mb="xs">
                <Text fw={700}>{title}</Text>
                {/* Badge removed if not in data, or defaulted */}
             </Group>
             <Text size="xs" fw={700} c="indigo" mb="xs">{stat}</Text>
             <Text size="sm" c="dimmed">{desc}</Text>
        </Paper>
    )
}
