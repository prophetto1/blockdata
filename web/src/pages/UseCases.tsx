import { Box, Title, Text, Stack, Paper, Group, ThemeIcon, SimpleGrid, Badge, Button, Divider } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { FEATURED_USE_CASES, MORE_USE_CASES } from '@/pages/marketing/content';

export default function UseCases() {
  const navigate = useNavigate();

  return (
    <Box>
      <MarketingSection py={64}>
        <Stack gap="md" align="center">
          <Title order={1} ta="center" fz={{ base: 34, sm: 44 }} lh={1.1}>
            Use cases that break normal “chat with a PDF” workflows.
          </Title>
          <Text ta="center" c="dimmed" size="lg" maw={860} lh={1.7}>
            If you need consistent, schema-constrained output across thousands of paragraphs — this is the workflow.
          </Text>
        </Stack>
      </MarketingSection>

      <MarketingSection py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Stack gap="xl">
          {FEATURED_USE_CASES.map((uc) => (
            <Paper key={uc.title} p="xl" radius="md" withBorder>
              <Stack gap="md">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <ThemeIcon variant="light" size="lg" radius="md" color="indigo">
                    <uc.icon size={20} />
                  </ThemeIcon>
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Title order={2} fz={22} fw={700}>{uc.title}</Title>
                    <Text size="sm" c="dimmed" lh={1.8}>{uc.scenario}</Text>
                  </Stack>
                </Group>
                <Box>
                  <Text size="sm" fw={700} mb={6}>How it works here</Text>
                  <Text size="sm" c="dimmed" lh={1.8}>{uc.how}</Text>
                </Box>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  {uc.examples.map((ex) => (
                    <Text key={ex} size="sm" c="dimmed">• {ex}</Text>
                  ))}
                </SimpleGrid>
                <Paper p="sm" radius="md" bg="var(--mantine-color-body)" withBorder>
                  <Text size="sm" fw={600} lh={1.7}>{uc.result}</Text>
                </Paper>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </MarketingSection>

      <MarketingSection py={72}>
        <Stack gap="xl">
          <Title order={2} ta="center" fz={30}>More</Title>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {MORE_USE_CASES.map((uc) => (
              <Paper key={uc.title} p="xl" radius="md" withBorder>
                <Stack gap="sm">
                  <Group gap="sm">
                    <ThemeIcon variant="light" size="lg" radius="md" color="indigo">
                      <uc.icon size={20} />
                    </ThemeIcon>
                    <Text fw={700}>{uc.title}</Text>
                  </Group>
                  <Badge variant="light" radius="md" color="gray">{uc.stat}</Badge>
                  <Text size="sm" c="dimmed" lh={1.7}>{uc.description}</Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      </MarketingSection>

      <Divider />

      <MarketingSection py={84}>
        <Stack align="center" gap="md">
          <Title order={2} ta="center" fz={32}>Try it on a real document</Title>
          <Text ta="center" c="dimmed" size="lg" maw={620}>
            Upload one file and see the grid populate.
          </Text>
          <Button size="lg" rightSection={<IconArrowRight size={18} />} onClick={() => navigate('/register')}>
            Create account
          </Button>
        </Stack>
      </MarketingSection>
    </Box>
  );
}

