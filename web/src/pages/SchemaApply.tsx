import { useMemo } from 'react';
import { Alert, Button, Card, List, Stack, Text } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { JsonViewer } from '@/components/common/JsonViewer';
import { PageHeader } from '@/components/common/PageHeader';
import { SchemaWorkflowNav } from '@/components/schemas/SchemaWorkflowNav';

export default function SchemaApply() {
  const navigate = useNavigate();
  const location = useLocation();

  const payload = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      schemaId: params.get('schemaId'),
      schemaRef: params.get('schemaRef'),
      sourceUid: params.get('sourceUid'),
      projectId: params.get('projectId'),
    };
  }, [location.search]);

  return (
    <>
      <AppBreadcrumbs
        items={[
          { label: 'Schemas', href: '/app/schemas' },
          { label: 'Start', href: '/app/schemas/start' },
          { label: 'Apply' },
        ]}
      />

      <PageHeader title="Apply Schema" subtitle="Bind a saved schema to a document or project run.">
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas/start')}>
          Back to start
        </Button>
      </PageHeader>

      <SchemaWorkflowNav includeTemplates={false} />

      <Stack gap="md">
        <Alert color="blue" title="Apply flow scaffold is active">
          This route is wired for post-save handoff. Run-creation UI and validation will be implemented here.
        </Alert>

        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600}>Current query payload</Text>
            <JsonViewer value={payload} />
          </Stack>
        </Card>

        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600}>Planned apply steps</Text>
            <List size="sm" spacing={4}>
              <List.Item>Select target scope (project or document).</List.Item>
              <List.Item>Validate selected schema and target ownership.</List.Item>
              <List.Item>Create run with current runs edge function boundary.</List.Item>
              <List.Item>Redirect to run detail for review workflow.</List.Item>
            </List>
          </Stack>
        </Card>
      </Stack>
    </>
  );
}

