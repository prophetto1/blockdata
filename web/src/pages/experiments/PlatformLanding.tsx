import { Container, Title, Text, Stack, Group, Button, Box, SimpleGrid, ThemeIcon, Paper, Badge } from '@mantine/core';
import { IconBolt, IconSchema, IconListDetails } from '@tabler/icons-react';
import { MarketingGrid } from '@/components/marketing/MarketingGrid';
import { useNavigate } from 'react-router-dom';

export default function PlatformLanding() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box pt={100} pb={80}>
        <Container size="xl">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={60}>
            <Stack justify="center" gap="xl">
              <Badge variant="light" size="lg" color="gray">Enterprise Document Intelligence</Badge>
              <Title order={1} size={48} style={{ lineHeight: 1.1 }}>
                Structured data,<br />
                <span style={{ color: 'var(--mantine-color-dimmed)' }}>block by block.</span>
              </Title>
              <Text c="dimmed" size="xl" maw={500}>
                Stop treating documents as blobs of text. Decompose them into typed blocks, apply rigorous schemas, and export deterministic data.
              </Text>
              <Group>
                <Button size="xl" onClick={() => navigate('/register')}>Get Started</Button>
                <Button size="xl" variant="default" onClick={() => navigate('/how-it-works')}>Read the Docs</Button>
              </Group>
            </Stack>

            {/* The "Glass Box" - Actual Grid Component */}
            <Box>
               <MarketingGrid />
               <Group justify="space-between" mt="xs">
                  <Text size="xs" c="dimmed">● Live processing preview</Text>
                  <Text size="xs" c="dimmed">7 blocks • 2 extracted fields</Text>
               </Group>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Feature Strip */}
      <Box bg="var(--mantine-color-default-hover)" py={80}>
        <Container size="xl">
          <SimpleGrid cols={3} spacing="xl">
            <Paper p="xl" withBorder radius="md">
              <ThemeIcon size="lg" radius="md" variant="light" color="blue" mb="md">
                <IconListDetails />
              </ThemeIcon>
              <Text fw={700} size="lg" mb="sm">Block-Level Granularity</Text>
              <Text c="dimmed" size="sm">Every paragraph, heading, and list item is addressed individually with a stable ID.</Text>
            </Paper>
             <Paper p="xl" withBorder radius="md">
              <ThemeIcon size="lg" radius="md" variant="light" color="violet" mb="md">
                <IconSchema />
              </ThemeIcon>
              <Text fw={700} size="lg" mb="sm">Strict Schemas</Text>
              <Text c="dimmed" size="sm">Define exactly what you want extracted or revised. Type-safe outputs, every time.</Text>
            </Paper>
             <Paper p="xl" withBorder radius="md">
               <ThemeIcon size="lg" radius="md" variant="light" color="orange" mb="md">
                <IconBolt />
              </ThemeIcon>
              <Text fw={700} size="lg" mb="sm">Parallel Execution</Text>
              <Text c="dimmed" size="sm">Workers fan out to process thousands of blocks concurrently. Zero bottlenecks.</Text>
            </Paper>
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}
