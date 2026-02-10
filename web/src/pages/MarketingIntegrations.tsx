import { Box, Title, Text, Stack, Paper, SimpleGrid, Badge, Group, Button, Divider, Code } from '@mantine/core';
import { IconArrowRight, IconDatabase, IconNetwork, IconWebhook } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { MarketingSection } from '@/components/marketing/MarketingSection';

const JSONL_EXAMPLE = `{
  "immutable": { "block_uid": "…", "block_index": 42, "block_type": "paragraph", "block_content": "…" },
  "user_defined": { "data": { "topic": "…", "entities": ["…"] } }
}`;

export default function MarketingIntegrations() {
  const navigate = useNavigate();

  return (
    <Box>
      <MarketingSection py={64}>
        <Stack gap="md" align="center">
          <Title order={1} ta="center" fz={{ base: 34, sm: 44 }} lh={1.1}>
            Integrations start with a real export contract.
          </Title>
          <Text ta="center" c="dimmed" size="lg" maw={860} lh={1.7}>
            Once overlays are confirmed, the platform produces canonical JSONL: one record per block, ordered, traceable, and ready for downstream systems.
          </Text>
        </Stack>
      </MarketingSection>

      <MarketingSection py={72} style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}>
        <Stack gap="xl">
          <Group justify="center">
            <Badge variant="light" color="indigo" radius="md">Canonical JSONL</Badge>
          </Group>
          <Paper withBorder radius="md" p="xl">
            <Stack gap="sm">
              <Text fw={700}>The contract</Text>
              <Text size="sm" c="dimmed" lh={1.7}>
                JSONL is the stable interchange format between the annotation workspace and your data stack. Every record includes immutable block identity and schema-defined fields.
              </Text>
              <Code block>{JSONL_EXAMPLE}</Code>
            </Stack>
          </Paper>
        </Stack>
      </MarketingSection>

      <MarketingSection py={72}>
        <Stack gap="xl">
          <Title order={2} ta="center" fz={30}>Connectors</Title>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="sm">
                <Group gap="sm">
                  <IconNetwork size={18} />
                  <Text fw={700}>Neo4j</Text>
                </Group>
                <Text size="sm" c="dimmed" lh={1.7}>
                  Push confirmed overlay data into a graph database. Schemas can optionally declare mappings for nodes and edges.
                </Text>
              </Stack>
            </Paper>
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="sm">
                <Group gap="sm">
                  <IconWebhook size={18} />
                  <Text fw={700}>Webhook</Text>
                </Group>
                <Text size="sm" c="dimmed" lh={1.7}>
                  POST JSONL to any endpoint when a run completes or when a project export is triggered.
                </Text>
              </Stack>
            </Paper>
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="sm">
                <Group gap="sm">
                  <IconDatabase size={18} />
                  <Text fw={700}>DuckDB / Parquet</Text>
                </Group>
                <Text size="sm" c="dimmed" lh={1.7}>
                  Export columnar datasets for analytics. Great for large corpora and fast exploration.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </MarketingSection>

      <Divider />

      <MarketingSection py={84}>
        <Stack align="center" gap="md">
          <Title order={2} ta="center" fz={32}>Build a dataset you can trust</Title>
          <Text ta="center" c="dimmed" size="lg" maw={680}>
            Upload documents, apply a schema, review results, and export a clean contract downstream.
          </Text>
          <Button size="lg" rightSection={<IconArrowRight size={18} />} onClick={() => navigate('/register')}>
            Get started
          </Button>
        </Stack>
      </MarketingSection>
    </Box>
  );
}

