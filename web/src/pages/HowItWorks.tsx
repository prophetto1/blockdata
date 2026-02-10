import { Title, Text, Paper, SimpleGrid, Stack, Group, ThemeIcon, Button, Divider, Box } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { STEPS } from '@/pages/marketing/content';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <Box>
      <MarketingSection py={64}>
        <Stack gap="md" align="center">
          <Title order={1} ta="center" fz={{ base: 34, sm: 44 }} lh={1.1}>
            From raw documents to structured output — without context window limits.
          </Title>
          <Text ta="center" c="dimmed" size="lg" maw={820} lh={1.7}>
            The platform decomposes documents into ordered blocks, applies your schema, and processes each block independently in parallel.
            That’s how you get consistent quality on paragraph 4,000 — and a dataset you can actually trust downstream.
          </Text>
        </Stack>
      </MarketingSection>

      <MarketingSection
        py={72}
        style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}
      >
        <Stack gap="xl">
          <Stack gap={6} align="center">
            <Text size="sm" fw={600} tt="uppercase" c="indigo">The Pipeline</Text>
            <Title order={2} ta="center" fz={30}>Four steps. One contract.</Title>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {STEPS.map((s) => (
              <Paper key={s.step} p="xl" radius="md" withBorder>
                <Stack gap="sm">
                  <Group gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md" color="indigo">
                      <s.icon size={20} />
                    </ThemeIcon>
                    <Text size="xs" fw={800} c="dimmed">STEP {s.step}</Text>
                  </Group>
                  <Text fw={700}>{s.title}</Text>
                  <Text size="sm" c="dimmed" lh={1.7}>{s.description}</Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      </MarketingSection>

      <MarketingSection py={72}>
        <Stack gap="xl">
          <Title order={2} ta="center" fz={30}>What you get</Title>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <Paper p="xl" withBorder radius="md">
              <Stack gap="sm">
                <Text fw={700}>Consistent extraction</Text>
                <Text size="sm" c="dimmed" lh={1.7}>
                  Every block gets the same instructions and schema constraints. No drift. No “lost in the middle.”
                </Text>
              </Stack>
            </Paper>
            <Paper p="xl" withBorder radius="md">
              <Stack gap="sm">
                <Text fw={700}>Traceability</Text>
                <Text size="sm" c="dimmed" lh={1.7}>
                  Every extracted field traces back to a specific block. Auditing becomes mechanical.
                </Text>
              </Stack>
            </Paper>
            <Paper p="xl" withBorder radius="md">
              <Stack gap="sm">
                <Text fw={700}>Export-ready data</Text>
                <Text size="sm" c="dimmed" lh={1.7}>
                  JSONL is the contract. Use it to build knowledge graphs, feed internal systems, or power analytics.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </MarketingSection>

      <Divider />

      <MarketingSection py={84}>
        <Stack align="center" gap="md">
          <Title order={2} ta="center" fz={32}>
            Ready to process your first project?
          </Title>
          <Text ta="center" c="dimmed" size="lg" maw={640}>
            Create an account and upload a document in minutes.
          </Text>
          <Button size="lg" rightSection={<IconArrowRight size={18} />} onClick={() => navigate('/register')}>
            Get started
          </Button>
        </Stack>
      </MarketingSection>
    </Box>
  );
}

