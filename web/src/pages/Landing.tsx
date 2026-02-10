import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { MarketingSplitSection } from '@/components/marketing/MarketingSplitSection';
import { CAPABILITIES, FEATURED_USE_CASES, STEPS } from '@/pages/marketing/content';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <Box>
      <MarketingSection containerSize="xl" py={88}>
        <MarketingSplitSection
          leftSlot={(
            <>
              <Badge variant="light" size="lg" radius="md">
                Document Intelligence Platform
              </Badge>
              <Title order={1} fz={{ base: 36, sm: 50 }} fw={800} lh={1.05}>
                Turn documents into structured knowledge —{' '}
                <Text component="span" inherit c="indigo">
                  paragraph by paragraph
                </Text>
                , at any scale.
              </Title>
              <Text size="xl" c="dimmed" maw={640} lh={1.7}>
                Upload any document. Define what you want extracted. AI processes every block against your schema.
                Watch results fill in — column by column — in real time.
              </Text>
              <Group gap="md">
                <Button size="lg" rightSection={<IconArrowRight size={18} />} onClick={() => navigate('/register')}>
                  Get started free
                </Button>
                <Button size="lg" variant="default" onClick={() => navigate('/how-it-works')}>
                  How it works
                </Button>
              </Group>
            </>
          )}
          rightSlot={(
            <Paper withBorder radius="md" p="xl">
              <Stack gap="md">
                <Text fw={700}>What you’ll see</Text>
                <SimpleGrid cols={1} spacing="sm">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon variant="light" radius="md" color="indigo">1</ThemeIcon>
                    <Text size="sm" c="dimmed" lh={1.6}>A block inventory with stable IDs</Text>
                  </Group>
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon variant="light" radius="md" color="indigo">2</ThemeIcon>
                    <Text size="sm" c="dimmed" lh={1.6}>Schema-driven columns in the grid</Text>
                  </Group>
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon variant="light" radius="md" color="indigo">3</ThemeIcon>
                    <Text size="sm" c="dimmed" lh={1.6}>Export-ready JSONL for downstream systems</Text>
                  </Group>
                </SimpleGrid>
              </Stack>
            </Paper>
          )}
        />
      </MarketingSection>

      <MarketingSection py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Stack gap="xl">
          <Stack gap={6} align="center">
            <Text size="sm" fw={600} c="indigo" tt="uppercase">How it works</Text>
            <Title order={2} ta="center" fz={30}>
              Four steps. One repeatable workflow.
            </Title>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {STEPS.map((s) => (
              <Paper key={s.step} p="xl" radius="md" withBorder>
                <Stack gap="sm">
                  <Group gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md" color="indigo">
                      <s.icon size={20} />
                    </ThemeIcon>
                    <Text size="xs" fw={800} c="dimmed">
                      STEP {s.step}
                    </Text>
                  </Group>
                  <Text fw={700}>{s.title}</Text>
                  <Text size="sm" c="dimmed" lh={1.7}>
                    {s.description}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
          <Group justify="center">
            <Button variant="default" onClick={() => navigate('/how-it-works')}>See the full workflow</Button>
          </Group>
        </Stack>
      </MarketingSection>

      <MarketingSection py={72}>
        <Stack gap="xl">
          <Stack gap={6} align="center">
            <Text size="sm" fw={600} c="indigo" tt="uppercase">Use cases</Text>
            <Title order={2} ta="center" fz={30}>
              Designed for long documents and large corpora.
            </Title>
          </Stack>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {FEATURED_USE_CASES.map((uc) => (
              <Paper key={uc.title} p="xl" radius="md" withBorder>
                <Stack gap="sm">
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon variant="light" size="lg" radius="md" color="indigo">
                      <uc.icon size={20} />
                    </ThemeIcon>
                    <Stack gap={4}>
                      <Text fw={800}>{uc.title}</Text>
                      <Text size="sm" c="dimmed" lh={1.7}>{uc.scenario}</Text>
                    </Stack>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
          <Group justify="center">
            <Button variant="default" onClick={() => navigate('/use-cases')}>Explore use cases</Button>
          </Group>
        </Stack>
      </MarketingSection>

      <MarketingSection py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Stack gap="xl">
          <Stack gap={6} align="center">
            <Text size="sm" fw={600} c="indigo" tt="uppercase">Capabilities</Text>
            <Title order={2} ta="center" fz={30}>
              Everything you need to extract structured knowledge.
            </Title>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {CAPABILITIES.map((c) => (
              <Paper key={c.title} p="lg" radius="md" withBorder>
                <Stack gap={6}>
                  <Text fw={800} size="sm">{c.title}</Text>
                  <Text size="sm" c="dimmed" lh={1.7}>{c.description}</Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
          <Group justify="center">
            <Button variant="default" onClick={() => navigate('/integrations')}>See integrations</Button>
          </Group>
        </Stack>
      </MarketingSection>

      <Divider />

      <MarketingSection py={88} containerSize="sm">
        <Stack align="center" gap="lg">
          <Title order={2} ta="center" fz={32}>
            Stop reading documents.{' '}
            <Text component="span" inherit c="indigo">
              Start extracting knowledge.
            </Text>
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={520} lh={1.7}>
            Upload your first document, define a schema, and watch structured results appear — block by block.
          </Text>
          <Button size="lg" rightSection={<IconArrowRight size={18} />} onClick={() => navigate('/register')}>
            Get started free
          </Button>
        </Stack>
      </MarketingSection>

      <Box py="lg" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <MarketingSection py={0} containerSize="lg">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">BlockData</Text>
            <Text size="xs" c="dimmed">Document intelligence platform</Text>
          </Group>
        </MarketingSection>
      </Box>
    </Box>
  );
}
