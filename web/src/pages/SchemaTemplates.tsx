import { useMemo, useState } from 'react';
import { Badge, Button, Card, Group, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { PageHeader } from '@/components/common/PageHeader';
import { SchemaWorkflowNav } from '@/components/schemas/SchemaWorkflowNav';
import { SCHEMA_TEMPLATE_SEEDS } from '@/lib/schemaTemplates';

export default function SchemaTemplates() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const values = Array.from(new Set(SCHEMA_TEMPLATE_SEEDS.map((template) => template.category))).sort();
    return ['all', ...values];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (category === 'all') return SCHEMA_TEMPLATE_SEEDS;
    return SCHEMA_TEMPLATE_SEEDS.filter((template) => template.category === category);
  }, [category]);

  return (
    <>
      <AppBreadcrumbs
        items={[
          { label: 'Schemas', href: '/app/schemas' },
          { label: 'Start', href: '/app/schemas/start' },
          { label: 'Templates' },
        ]}
      />

      <PageHeader title="Schema Templates" subtitle="Curated seeds you can apply and customize in the wizard.">
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas/start')}>
          Back to start
        </Button>
      </PageHeader>

      <SchemaWorkflowNav includeApply={false} />

      <Card withBorder padding="md" mb="md">
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

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {filteredTemplates.map((template) => (
          <Card key={template.template_id} withBorder padding="md">
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

              <Group justify="space-between" mt="xs">
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => navigate(`/app/schemas/templates/${template.template_id}`)}
                >
                  Inspect
                </Button>
                <Button
                  size="xs"
                  onClick={() => navigate(`/app/schemas/wizard?source=template&templateId=${encodeURIComponent(template.template_id)}`)}
                >
                  Apply
                </Button>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
}

