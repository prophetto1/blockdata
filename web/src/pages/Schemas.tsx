import { useCallback, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconCirclePlus,
  IconCode,
  IconDotsVertical,
  IconPencil,
  IconTable,
  IconTrash,
} from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';

type ExtractSchemaMode = 'table' | 'code';
type ExtractSchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array:string'
  | 'array:number'
  | 'array:boolean'
  | 'array:object';

type ExtractSchemaField = {
  id: string;
  name: string;
  type: ExtractSchemaFieldType;
  description: string;
  required: boolean;
};

const EXTRACT_SCHEMA_TYPE_OPTIONS: Array<{ value: ExtractSchemaFieldType; label: string }> = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
  { value: 'object', label: 'object' },
  { value: 'array:string', label: 'array<string>' },
  { value: 'array:number', label: 'array<number>' },
  { value: 'array:boolean', label: 'array<boolean>' },
  { value: 'array:object', label: 'array<object>' },
];

export default function Schemas() {
  const [extractSchemaMode, setExtractSchemaMode] = useState<ExtractSchemaMode>('table');
  const [extractSchemaReady, setExtractSchemaReady] = useState(false);
  const [extractSchemaFields, setExtractSchemaFields] = useState<ExtractSchemaField[]>([]);
  const [extractSchemaDraft, setExtractSchemaDraft] = useState('');

  const createSchemaField = useCallback((seed?: Partial<ExtractSchemaField>): ExtractSchemaField => (
    {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: seed?.name ?? '',
      type: seed?.type ?? 'string',
      description: seed?.description ?? '',
      required: seed?.required ?? true,
    }
  ), []);

  const updateExtractSchemaField = useCallback((id: string, patch: Partial<ExtractSchemaField>) => {
    setExtractSchemaFields((prev) => prev.map((field) => (
      field.id === id ? { ...field, ...patch } : field
    )));
  }, []);

  const addExtractSchemaField = useCallback((afterFieldId?: string) => {
    setExtractSchemaFields((prev) => {
      const nextField = createSchemaField();
      if (!afterFieldId) return [...prev, nextField];
      const index = prev.findIndex((field) => field.id === afterFieldId);
      if (index < 0) return [...prev, nextField];
      return [...prev.slice(0, index + 1), nextField, ...prev.slice(index + 1)];
    });
  }, [createSchemaField]);

  const removeExtractSchemaField = useCallback((id: string) => {
    setExtractSchemaFields((prev) => prev.filter((field) => field.id !== id));
  }, []);

  const initializeManualSchema = useCallback(() => {
    setExtractSchemaReady(true);
    setExtractSchemaMode('table');
    setExtractSchemaFields([createSchemaField({ name: '', type: 'string', description: '', required: true })]);
  }, [createSchemaField]);

  const initializeAutoSchema = useCallback(() => {
    setExtractSchemaReady(true);
    setExtractSchemaMode('table');
    setExtractSchemaFields([
      createSchemaField({ name: 'invoice', type: 'string', description: 'Invoice identifier', required: true }),
      createSchemaField({ name: 'total_amount', type: 'number', description: 'Total billed amount', required: true }),
      createSchemaField({ name: 'due_date', type: 'string', description: 'Payment due date', required: false }),
    ]);
  }, [createSchemaField]);

  const clearExtractSchema = useCallback(() => {
    setExtractSchemaReady(false);
    setExtractSchemaFields([]);
    setExtractSchemaDraft('');
    setExtractSchemaMode('table');
  }, []);

  const extractSchemaPreviewJson = useMemo(() => {
    const properties = extractSchemaFields.reduce<Record<string, unknown>>((acc, field) => {
      const key = field.name.trim();
      if (!key) return acc;
      if (field.type.startsWith('array:')) {
        const itemType = field.type.replace('array:', '') as 'string' | 'number' | 'boolean' | 'object';
        acc[key] = {
          type: 'array',
          items: { type: itemType },
          description: field.description.trim() || undefined,
        };
        return acc;
      }
      acc[key] = {
        type: field.type,
        description: field.description.trim() || undefined,
      };
      return acc;
    }, {});

    const required = extractSchemaFields
      .filter((field) => field.required && field.name.trim().length > 0)
      .map((field) => field.name.trim());

    return JSON.stringify({
      type: 'object',
      properties,
      required,
    }, null, 2);
  }, [extractSchemaFields]);

  return (
    <>
      <PageHeader title="Schema" subtitle="Schema JSON editor">
        <Text size="xs" c="dimmed">Standalone schema workspace</Text>
      </PageHeader>

      <Paper withBorder radius="md" p="md">
        <Stack gap="md">
          <Group justify="space-between" wrap="nowrap" className="extract-schema-toolbar">
            <Group gap={4} wrap="nowrap" className="extract-schema-mode-toggle">
              <ActionIcon
                size="sm"
                variant={extractSchemaMode === 'table' ? 'light' : 'subtle'}
                aria-label="Table schema mode"
                onClick={() => setExtractSchemaMode('table')}
              >
                <IconTable size={14} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant={extractSchemaMode === 'code' ? 'light' : 'subtle'}
                aria-label="Code schema mode"
                onClick={() => setExtractSchemaMode('code')}
              >
                <IconCode size={14} />
              </ActionIcon>
            </Group>

            <Group gap={6} wrap="nowrap">
              <ActionIcon size="sm" variant="subtle" aria-label="Expand schema">
                <IconArrowsMaximize size={14} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="subtle"
                aria-label="Reset schema"
                onClick={clearExtractSchema}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>

          {!extractSchemaReady && (
            <Center className="extract-schema-create-wrap">
              <Stack align="center" gap="sm" className="extract-schema-create-card">
                <Text fw={700} size="xl">Create Schema</Text>
                <Text size="sm" c="dimmed" ta="center" maw={460}>
                  Upload a file or provide a natural language description to automatically generate a schema.
                  Or use the Schema Builder to manually create a schema.
                </Text>
                <Group gap="sm">
                  <Button variant="filled" onClick={initializeAutoSchema}>Auto-Generate</Button>
                  <Button variant="default" onClick={initializeManualSchema}>Create Manually</Button>
                </Group>
              </Stack>
            </Center>
          )}

          {extractSchemaReady && extractSchemaMode === 'table' && (
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Text fw={600}>Apply to all fields</Text>
                  <IconDotsVertical size={14} />
                  <Badge variant="light" radius="xl">{extractSchemaFields.length}</Badge>
                </Group>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<IconPencil size={14} />}
                >
                  Edit
                </Button>
              </Group>

              <Box className="extract-schema-table-head">
                <Box />
                <Text fw={700} size="sm">Field Name</Text>
                <Text fw={700} size="sm">Field Type</Text>
                <Text fw={700} size="sm">Field Description</Text>
                <Box />
              </Box>

              <Stack gap={8}>
                {extractSchemaFields.map((field) => {
                  const hasName = field.name.trim().length > 0;
                  return (
                    <Box key={field.id} className="extract-schema-row">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        aria-label="Add schema field"
                        onClick={() => addExtractSchemaField(field.id)}
                      >
                        <IconCirclePlus size={16} />
                      </ActionIcon>

                      <TextInput
                        placeholder="e.g. invoice"
                        value={field.name}
                        onChange={(event) => updateExtractSchemaField(field.id, { name: event.currentTarget.value })}
                      />

                      <Select
                        data={EXTRACT_SCHEMA_TYPE_OPTIONS}
                        value={field.type}
                        comboboxProps={{ withinPortal: false }}
                        onChange={(value) => {
                          if (!value) return;
                          updateExtractSchemaField(field.id, { type: value as ExtractSchemaFieldType });
                        }}
                      />

                      <TextInput
                        placeholder="(optional)"
                        value={field.description}
                        onChange={(event) => updateExtractSchemaField(field.id, { description: event.currentTarget.value })}
                      />

                      <Group gap={4} wrap="nowrap" className="extract-schema-row-actions">
                        <ActionIcon
                          size="sm"
                          variant={field.required ? 'light' : 'subtle'}
                          aria-label="Toggle required field"
                          onClick={() => updateExtractSchemaField(field.id, { required: !field.required })}
                        >
                          <Text fw={700}>*</Text>
                        </ActionIcon>

                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          aria-label="Delete schema field"
                          onClick={() => removeExtractSchemaField(field.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>

                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color={hasName ? 'gray' : 'red'}
                          aria-label="Schema field validation state"
                        >
                          <IconAlertTriangle size={14} />
                        </ActionIcon>
                      </Group>
                    </Box>
                  );
                })}
              </Stack>

              <Group>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<IconCirclePlus size={14} />}
                  onClick={() => addExtractSchemaField()}
                >
                  Add field
                </Button>
              </Group>
            </Stack>
          )}

          {extractSchemaReady && extractSchemaMode === 'code' && (
            <Stack gap="sm">
              <Textarea
                label="Schema JSON"
                minRows={14}
                value={extractSchemaDraft || extractSchemaPreviewJson}
                onChange={(event) => setExtractSchemaDraft(event.currentTarget.value)}
              />
              <Text size="xs" c="dimmed">
                Switch back to table mode to edit fields visually.
              </Text>
            </Stack>
          )}
        </Stack>
      </Paper>
    </>
  );
}
