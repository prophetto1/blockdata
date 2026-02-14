import { useMemo, useState } from 'react';
import { Badge, Button, Card, Grid, Group, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { JsonViewer } from '@/components/common/JsonViewer';
import { PageHeader } from '@/components/common/PageHeader';
import { SCHEMA_TEMPLATE_SEEDS } from '@/lib/schemaTemplates';

export default function SchemaTemplates() {
  const navigate = useNavigate();
  const location = useLocation();
  const [category, setCategory] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SCHEMA_TEMPLATE_SEEDS[0]?.template_id ?? '');
  const contextQuery = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const withContext = (path: string, extra: Record<string, string> = {}) => {
    const url = new URL(path, 'https://local.invalid');
    const query = new URLSearchParams(url.search);
    for (const key of ['sourceUid', 'projectId', 'convUid', 'returnTo']) {
      const value = contextQuery.get(key);
      if (value) query.set(key, value);
    }
    for (const [key, value] of Object.entries(extra)) {
      query.set(key, value);
    }
    const search = query.toString();
    return `${url.pathname}${search ? `?${search}` : ''}`;
  };

  const categories = useMemo(() => {
    const values = Array.from(new Set(SCHEMA_TEMPLATE_SEEDS.map((template) => template.category))).sort();
    return ['all', ...values];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (category === 'all') return SCHEMA_TEMPLATE_SEEDS;
    return SCHEMA_TEMPLATE_SEEDS.filter((template) => template.category === category);
  }, [category]);

  const effectiveSelectedTemplateId = useMemo(() => {
    if (filteredTemplates.length === 0) return '';
    if (filteredTemplates.some((template) => template.template_id === selectedTemplateId)) return selectedTemplateId;
    return filteredTemplates[0].template_id;
  }, [filteredTemplates, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((template) => template.template_id === effectiveSelectedTemplateId) ?? filteredTemplates[0] ?? null,
    [effectiveSelectedTemplateId, filteredTemplates],
  );

  return (
    <>
      <PageHeader title="Schema Library" subtitle="Curated seeds you can apply and customize in the wizard." />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="md">
          <Card withBorder padding="md">
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Text fw={600}>Categories</Text>
              <SegmentedControl
                value={category}
                onChange={setCategory}
                size="xs"
                data={categories.map((value) => ({ value, label: value }))}
              />
            </Group>
          </Card>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            {filteredTemplates.map((template) => {
              const selected = template.template_id === effectiveSelectedTemplateId;
              return (
                <Card
                  key={template.template_id}
                  withBorder
                  padding="md"
                  style={{
                    cursor: 'pointer',
                    borderColor: selected ? 'var(--mantine-color-blue-6)' : undefined,
                  }}
                  onClick={() => setSelectedTemplateId(template.template_id)}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Text fw={600}>{template.name}</Text>
                      <Badge variant="light">{template.category}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {template.description}
                    </Text>
                    <Group gap={6}>
                      {template.use_case_tags.map((tag) => (
                        <Badge key={`${template.template_id}-${tag}`} size="xs" variant="dot">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card withBorder padding="md">
            {selectedTemplate ? (
              <Stack gap="sm">
                <Text fw={700}>Preview Template</Text>
                <Group justify="space-between" align="center">
                  <Text fw={600}>{selectedTemplate.name}</Text>
                  <Badge variant="light">{selectedTemplate.category}</Badge>
                </Group>
                <Text size="sm" c="dimmed">{selectedTemplate.description}</Text>
                <Text size="sm">Use case: {selectedTemplate.preview.use_case}</Text>
                <Group gap={6}>
                  {selectedTemplate.use_case_tags.map((tag) => (
                    <Badge key={`${selectedTemplate.template_id}-preview-${tag}`} size="xs" variant="dot">
                      {tag}
                    </Badge>
                  ))}
                </Group>
                <JsonViewer value={selectedTemplate.schema_json_seed} maxHeight={560} minHeight={360} />
                <Group justify="flex-end">
                  <Button
                    size="xs"
                    onClick={() => navigate(withContext('/app/schemas/wizard', {
                      source: 'template',
                      templateId: selectedTemplate.template_id,
                    }))}
                  >
                    Apply
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">No schema library templates are available.</Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
