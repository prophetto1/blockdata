import { Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { PageHeader } from '@/components/common/PageHeader';
import { SchemaWorkflowNav } from '@/components/schemas/SchemaWorkflowNav';

type StartOption = {
  title: string;
  description: string;
  cta: string;
  path: string;
};

const START_OPTIONS: StartOption[] = [
  {
    title: 'Browse Templates',
    description: 'Start from a curated template and customize it before save.',
    cta: 'Open templates',
    path: '/app/schemas/templates',
  },
  {
    title: 'From Existing Schema',
    description: 'Fork one of your existing schemas into the wizard flow.',
    cta: 'Fork existing',
    path: '/app/schemas/wizard?source=existing',
  },
  {
    title: 'Start from Scratch',
    description: 'Create a new schema with the step-by-step wizard.',
    cta: 'Start wizard',
    path: '/app/schemas/wizard?source=scratch',
  },
  {
    title: 'Upload JSON',
    description: 'Import JSON and route to wizard or advanced flow based on compatibility.',
    cta: 'Upload flow',
    path: '/app/schemas/wizard?source=upload',
  },
  {
    title: 'Advanced Editor',
    description: 'Open the full JSON editor escape hatch directly.',
    cta: 'Open advanced',
    path: '/app/schemas/advanced',
  },
];

export default function SchemaStart() {
  const navigate = useNavigate();

  return (
    <>
      <AppBreadcrumbs items={[{ label: 'Schemas', href: '/app/schemas' }, { label: 'Start' }]} />

      <PageHeader title="Create Schema" subtitle="Choose how to begin your schema workflow.">
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas')}>
          Back to list
        </Button>
      </PageHeader>

      <SchemaWorkflowNav />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {START_OPTIONS.map((option) => (
          <Card key={option.title} withBorder padding="md">
            <Stack gap="sm">
              <Text fw={600}>{option.title}</Text>
              <Text size="sm" c="dimmed">
                {option.description}
              </Text>
              <Group justify="flex-end" mt="xs">
                <Button size="xs" onClick={() => navigate(option.path)}>
                  {option.cta}
                </Button>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
}

