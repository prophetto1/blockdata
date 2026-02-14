import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { JsonViewer } from '@/components/common/JsonViewer';
import { PageHeader } from '@/components/common/PageHeader';
import { getSchemaTemplateSeed } from '@/lib/schemaTemplates';

export default function SchemaTemplateDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { templateId } = useParams<{ templateId: string }>();
  const template = templateId ? getSchemaTemplateSeed(templateId) : null;
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

  if (!template) {
    return (
      <>
        <AppBreadcrumbs
          items={[
            { label: 'Schemas', href: '/app/schemas' },
            { label: 'Templates', href: '/app/schemas/templates' },
            { label: 'Template' },
          ]}
        />
        <PageHeader title="Template not found" subtitle="The selected template id does not exist.">
          <Button variant="light" size="xs" onClick={() => navigate(withContext('/app/schemas/templates'))}>
            Back to templates
          </Button>
        </PageHeader>
        <ErrorAlert message={`Unknown template id: ${templateId ?? 'missing'}`} />
      </>
    );
  }

  return (
    <>
      <AppBreadcrumbs
        items={[
          { label: 'Schemas', href: '/app/schemas' },
          { label: 'Templates', href: '/app/schemas/templates' },
          { label: template.name },
        ]}
      />

      <PageHeader title={template.name} subtitle={`Template ${template.template_id} v${template.template_version}`}>
        <Button variant="default" size="xs" onClick={() => navigate(withContext('/app/schemas/templates'))}>
          Back to templates
        </Button>
        <Button
          size="xs"
          onClick={() => navigate(withContext('/app/schemas/wizard', {
            source: 'template',
            templateId: template.template_id,
          }))}
        >
          Apply to wizard
        </Button>
      </PageHeader>

      <Stack gap="md">
        <Card withBorder padding="md">
          <Stack gap="sm">
            <Text>{template.description}</Text>
            <Group gap={6}>
              {template.use_case_tags.map((tag) => (
                <Badge key={`${template.template_id}-${tag}`} size="xs" variant="dot">
                  {tag}
                </Badge>
              ))}
            </Group>
            <Text size="sm" c="dimmed">
              Use case: {template.preview.use_case}
            </Text>
          </Stack>
        </Card>

        <Card withBorder padding="md">
          <Stack gap="sm">
            <Text fw={600}>Preview fields</Text>
            {template.preview.fields.map((field) => (
              <Group key={`${template.template_id}-${field.key}`} justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text ff="monospace" size="sm">
                    {field.key}
                  </Text>
                  {field.description && (
                    <Text size="xs" c="dimmed">
                      {field.description}
                    </Text>
                  )}
                </Stack>
                <Badge variant="light">{field.type}</Badge>
              </Group>
            ))}
          </Stack>
        </Card>

        <Card withBorder padding="md">
          <Stack gap="sm">
            <Text fw={600}>Schema seed JSON</Text>
            <JsonViewer value={template.schema_json_seed} maxHeight={500} />
          </Stack>
        </Card>
      </Stack>
    </>
  );
}
