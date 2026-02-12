import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Code,
  Group,
  List,
  Select,
  Stack,
  Stepper,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { JsonViewer } from '@/components/common/JsonViewer';
import { PageHeader } from '@/components/common/PageHeader';
import { SchemaWorkflowNav } from '@/components/schemas/SchemaWorkflowNav';
import { edgeFetch } from '@/lib/edge';
import { getSchemaTemplateSeed } from '@/lib/schemaTemplates';
import { readSchemaUploadDraft, type SchemaUploadDraft } from '@/lib/schemaUploadClassifier';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { SchemaRow } from '@/lib/types';

type WizardSource = 'scratch' | 'existing' | 'template' | 'upload' | 'advanced';
type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
type ArrayItemType = 'string' | 'number' | 'integer' | 'boolean' | 'object';

type WizardField = {
  id: string;
  key: string;
  type: FieldType;
  nullable: boolean;
  description: string;
  required: boolean;
  enumCsv: string;
  minimum: string;
  maximum: string;
  pattern: string;
  format: string;
  minItems: string;
  maxItems: string;
  itemsType: ArrayItemType;
};

type PromptConfigDraft = {
  systemInstructions: string;
  perBlockPrompt: string;
  model: string;
  temperature: string;
  maxTokensPerBlock: string;
};

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const FIELD_TYPE_OPTIONS = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'integer', label: 'integer' },
  { value: 'boolean', label: 'boolean' },
  { value: 'array', label: 'array' },
  { value: 'object', label: 'object' },
] as const;

const ARRAY_ITEM_TYPE_OPTIONS = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'integer', label: 'integer' },
  { value: 'boolean', label: 'boolean' },
  { value: 'object', label: 'object' },
] as const;

function normalizeSource(value: string | null): WizardSource {
  if (value === 'existing' || value === 'template' || value === 'upload' || value === 'advanced') return value;
  return 'scratch';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createField(partial: Partial<WizardField> = {}): WizardField {
  return {
    id: `f_${Math.random().toString(36).slice(2, 10)}`,
    key: '',
    type: 'string',
    nullable: false,
    description: '',
    required: false,
    enumCsv: '',
    minimum: '',
    maximum: '',
    pattern: '',
    format: '',
    minItems: '',
    maxItems: '',
    itemsType: 'string',
    ...partial,
  };
}

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 64);
  return cleaned || 'schema';
}

function pickFieldType(def: Record<string, unknown>): { baseType: FieldType; nullable: boolean } {
  const typeValue = def.type;
  if (typeof typeValue === 'string') {
    if (typeValue === 'string' || typeValue === 'number' || typeValue === 'integer' || typeValue === 'boolean' || typeValue === 'array' || typeValue === 'object') {
      return { baseType: typeValue, nullable: false };
    }
    return { baseType: 'string', nullable: false };
  }
  if (Array.isArray(typeValue)) {
    const nullable = typeValue.includes('null');
    const first = typeValue.find((v) => typeof v === 'string' && v !== 'null');
    if (first === 'string' || first === 'number' || first === 'integer' || first === 'boolean' || first === 'array' || first === 'object') {
      return { baseType: first, nullable };
    }
  }
  if (Array.isArray(def.enum)) return { baseType: 'string', nullable: false };
  return { baseType: 'string', nullable: false };
}

function schemaToFields(schemaJson: Record<string, unknown>): WizardField[] {
  const propsRaw = schemaJson.properties;
  const requiredRaw = Array.isArray(schemaJson.required) ? schemaJson.required : [];
  const requiredSet = new Set(requiredRaw.filter((item): item is string => typeof item === 'string'));
  if (!isPlainObject(propsRaw)) return [];

  const fields: WizardField[] = [];
  Object.entries(propsRaw).forEach(([key, rawDef]) => {
    if (!isPlainObject(rawDef)) return;
    const typeInfo = pickFieldType(rawDef);
    const enumCsv = Array.isArray(rawDef.enum) ? rawDef.enum.map((value) => String(value)).join(', ') : '';
    const itemsType = isPlainObject(rawDef.items) && typeof rawDef.items.type === 'string'
      ? (rawDef.items.type as ArrayItemType)
      : 'string';

    fields.push(createField({
      key,
      type: typeInfo.baseType,
      nullable: typeInfo.nullable,
      description: typeof rawDef.description === 'string' ? rawDef.description : '',
      required: requiredSet.has(key),
      enumCsv,
      minimum: typeof rawDef.minimum === 'number' ? String(rawDef.minimum) : '',
      maximum: typeof rawDef.maximum === 'number' ? String(rawDef.maximum) : '',
      pattern: typeof rawDef.pattern === 'string' ? rawDef.pattern : '',
      format: typeof rawDef.format === 'string' ? rawDef.format : '',
      minItems: typeof rawDef.minItems === 'number' ? String(rawDef.minItems) : '',
      maxItems: typeof rawDef.maxItems === 'number' ? String(rawDef.maxItems) : '',
      itemsType: ARRAY_ITEM_TYPE_OPTIONS.some((option) => option.value === itemsType) ? itemsType : 'string',
    }));
  });

  return fields;
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildFieldSchema(field: WizardField): Record<string, unknown> {
  const definition: Record<string, unknown> = {
    type: field.nullable ? [field.type, 'null'] : field.type,
  };
  const description = field.description.trim();
  if (description) definition.description = description;

  const enumValues = field.enumCsv
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (enumValues.length > 0) definition.enum = enumValues;

  const minimum = parseNumber(field.minimum);
  const maximum = parseNumber(field.maximum);
  if ((field.type === 'number' || field.type === 'integer') && minimum !== undefined) definition.minimum = minimum;
  if ((field.type === 'number' || field.type === 'integer') && maximum !== undefined) definition.maximum = maximum;

  if (field.type === 'string') {
    const pattern = field.pattern.trim();
    const format = field.format.trim();
    if (pattern) definition.pattern = pattern;
    if (format) definition.format = format;
  }

  if (field.type === 'array') {
    definition.items = { type: field.itemsType };
    const minItems = parseNumber(field.minItems);
    const maxItems = parseNumber(field.maxItems);
    if (minItems !== undefined) definition.minItems = minItems;
    if (maxItems !== undefined) definition.maxItems = maxItems;
  }

  if (field.type === 'object') {
    definition.properties = {};
    definition.additionalProperties = false;
  }

  return definition;
}

function buildPromptConfig(prompt: PromptConfigDraft): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  if (prompt.systemInstructions.trim()) out.system_instructions = prompt.systemInstructions.trim();
  if (prompt.perBlockPrompt.trim()) out.per_block_prompt = prompt.perBlockPrompt.trim();
  if (prompt.model.trim()) out.model = prompt.model.trim();
  const temperature = parseNumber(prompt.temperature);
  if (temperature !== undefined) out.temperature = temperature;
  const maxTokens = parseNumber(prompt.maxTokensPerBlock);
  if (maxTokens !== undefined) out.max_tokens_per_block = maxTokens;
  return Object.keys(out).length > 0 ? out : undefined;
}

function buildSchemaPreview(fields: WizardField[], prompt: PromptConfigDraft, intent: string): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  fields.forEach((field) => {
    const key = field.key.trim();
    if (!key) return;
    properties[key] = buildFieldSchema(field);
    if (field.required) required.push(key);
  });

  const schema: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    properties,
  };

  if (required.length > 0) schema.required = required;
  if (intent.trim()) schema.description = intent.trim();

  const promptConfig = buildPromptConfig(prompt);
  if (promptConfig) schema.prompt_config = promptConfig;

  return schema;
}

function evaluateCompatibility(schemaJson: Record<string, unknown>): { status: 'pass' | 'warn'; issues: string[] } {
  const issues: string[] = [];

  if (schemaJson.type !== 'object') {
    issues.push('Top-level type must be "object".');
  }

  const props = schemaJson.properties;
  if (!isPlainObject(props)) {
    issues.push('Top-level properties must be an object.');
  } else if (Object.keys(props).length === 0) {
    issues.push('At least one field is required (properties is empty).');
  }

  return {
    status: issues.length === 0 ? 'pass' : 'warn',
    issues,
  };
}

function extractPrompt(schemaJson: Record<string, unknown>): PromptConfigDraft {
  const prompt = isPlainObject(schemaJson.prompt_config) ? schemaJson.prompt_config : {};
  return {
    systemInstructions: typeof prompt.system_instructions === 'string' ? prompt.system_instructions : '',
    perBlockPrompt: typeof prompt.per_block_prompt === 'string' ? prompt.per_block_prompt : '',
    model: typeof prompt.model === 'string' ? prompt.model : '',
    temperature: typeof prompt.temperature === 'number' ? String(prompt.temperature) : '',
    maxTokensPerBlock: typeof prompt.max_tokens_per_block === 'number' ? String(prompt.max_tokens_per_block) : '',
  };
}

export default function SchemaWizard() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const source = normalizeSource(params.get('source'));
  const templateId = params.get('templateId');
  const schemaId = params.get('schemaId');
  const uploadKey = params.get('uploadKey');
  const uploadName = params.get('uploadName');

  const [active, setActive] = useState(0);
  const [intent, setIntent] = useState('');
  const [fields, setFields] = useState<WizardField[]>([createField({ key: 'label' })]);
  const [prompt, setPrompt] = useState<PromptConfigDraft>({
    systemInstructions: '',
    perBlockPrompt: '',
    model: '',
    temperature: '',
    maxTokensPerBlock: '',
  });
  const [schemaRef, setSchemaRef] = useState('');
  const [existingRows, setExistingRows] = useState<SchemaRow[]>([]);
  const [uploadDraft, setUploadDraft] = useState<SchemaUploadDraft | null>(null);
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(schemaId ?? null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefilledTemplateRef = useRef<string | null>(null);
  const prefilledExistingRef = useRef<string | null>(null);
  const prefilledUploadRef = useRef<string | null>(null);

  const sourceLabel = useMemo(() => {
    if (source === 'existing') return 'From existing schema';
    if (source === 'template') return 'From template';
    if (source === 'upload') return 'From upload JSON';
    if (source === 'advanced') return 'From advanced editor';
    return 'Start from scratch';
  }, [source]);

  const schemaPreview = useMemo(() => buildSchemaPreview(fields, prompt, intent), [fields, prompt, intent]);
  const compatibility = useMemo(() => evaluateCompatibility(schemaPreview), [schemaPreview]);

  const fieldError = useMemo(() => {
    if (fields.length === 0) return 'Add at least one field.';
    const seen = new Set<string>();
    for (const field of fields) {
      const key = field.key.trim();
      if (!key) return 'Every field needs a key.';
      if (seen.has(key)) return 'Field keys must be unique.';
      seen.add(key);
    }
    return null;
  }, [fields]);

  useEffect(() => {
    if (source !== 'existing') return;
    setLoadingExisting(true);
    supabase
      .from(TABLES.schemas)
      .select('schema_id, owner_id, schema_ref, schema_uid, schema_jsonb, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          setLoadingExisting(false);
          return;
        }
        setExistingRows((data ?? []) as SchemaRow[]);
        setLoadingExisting(false);
      });
  }, [source]);

  useEffect(() => {
    if (source !== 'template' || !templateId) return;
    if (prefilledTemplateRef.current === templateId) return;
    const template = getSchemaTemplateSeed(templateId);
    if (!template) {
      setError(`Template not found: ${templateId}`);
      return;
    }

    const schemaJson = template.schema_json_seed;
    setIntent(`Adapted from template: ${template.name}`);
    setFields(schemaToFields(schemaJson));
    setPrompt(extractPrompt(schemaJson));
    setSchemaRef(slugify(`${template.template_id}_v${template.template_version.replace(/\./g, '_')}`));
    prefilledTemplateRef.current = templateId;
  }, [source, templateId]);

  useEffect(() => {
    if (source !== 'existing' || !schemaId) return;
    if (prefilledExistingRef.current === schemaId) return;
    const row = existingRows.find((candidate) => candidate.schema_id === schemaId);
    if (!row) return;

    setSelectedExistingId(row.schema_id);
    setIntent(`Forked from existing schema: ${row.schema_ref}`);
    setFields(schemaToFields(row.schema_jsonb));
    setPrompt(extractPrompt(row.schema_jsonb));
    setSchemaRef(slugify(`${row.schema_ref}_v2`));
    prefilledExistingRef.current = schemaId;
  }, [existingRows, schemaId, source]);

  useEffect(() => {
    if (source !== 'upload') return;
    if (!uploadKey) {
      setError('Upload source payload is missing. Return to Start and upload a .json file.');
      return;
    }
    if (prefilledUploadRef.current === uploadKey) return;

    const draft = readSchemaUploadDraft(uploadKey);
    if (!draft) {
      setError('Upload payload was not found (expired session). Re-upload from Start.');
      return;
    }

    setUploadDraft(draft);
    if (draft.classification.mode === 'advanced') {
      const nextParams = new URLSearchParams({
        source: 'upload',
        uploadKey,
        uploadName: draft.uploadName,
      });
      navigate(`/app/schemas/advanced?${nextParams.toString()}`, { replace: true });
      return;
    }

    setIntent(
      typeof draft.schemaJson.description === 'string' && draft.schemaJson.description.trim()
        ? draft.schemaJson.description
        : `Imported from upload: ${draft.uploadName}`,
    );
    setFields(schemaToFields(draft.schemaJson));
    setPrompt(extractPrompt(draft.schemaJson));
    setSchemaRef(draft.suggestedSchemaRef);
    setError(null);
    prefilledUploadRef.current = uploadKey;
  }, [navigate, source, uploadKey]);

  const applyExistingSchema = (row: SchemaRow) => {
    setSelectedExistingId(row.schema_id);
    setIntent(`Forked from existing schema: ${row.schema_ref}`);
    setFields(schemaToFields(row.schema_jsonb));
    setPrompt(extractPrompt(row.schema_jsonb));
    setSchemaRef(slugify(`${row.schema_ref}_v2`));
    if (active < 1) setActive(1);
  };

  const addField = () => setFields((prev) => [...prev, createField()]);
  const removeField = (id: string) => setFields((prev) => prev.filter((field) => field.id !== id));
  const updateField = (id: string, patch: Partial<WizardField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const canAdvance = useMemo(() => {
    if (active === 0) {
      if (source === 'existing') return selectedExistingId !== null;
      return intent.trim().length > 0;
    }
    if (active === 1) return fieldError === null;
    if (active === 4) return SLUG_RE.test(schemaRef.trim());
    return true;
  }, [active, fieldError, intent, schemaRef, selectedExistingId, source]);

  const navigationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (source === 'existing' && selectedExistingId === null) {
      warnings.push('Select an existing schema in Step 1 before saving.');
    }
    if (source !== 'existing' && !intent.trim()) {
      warnings.push('Intent is blank. You can continue, but schema description will be empty.');
    }
    if (fieldError) warnings.push(fieldError);
    if (!SLUG_RE.test(schemaRef.trim())) {
      warnings.push('schema_ref is not valid yet; save will remain blocked until Step 5 is valid.');
    }
    return warnings;
  }, [fieldError, intent, schemaRef, selectedExistingId, source]);

  const jumpToStep = (stepIndex: number) => {
    setError(null);
    const safeIndex = Math.max(0, Math.min(4, stepIndex));
    setActive(safeIndex);
  };

  const nextStep = () => {
    if (!canAdvance) return;
    setError(null);
    setActive((current) => Math.min(current + 1, 4));
  };

  const prevStep = () => {
    setError(null);
    setActive((current) => Math.max(current - 1, 0));
  };

  const saveSchema = async () => {
    const ref = schemaRef.trim();
    if (source === 'existing' && selectedExistingId === null) {
      setError('Choose an existing schema in Step 1 before saving.');
      setActive(0);
      return;
    }
    if (!SLUG_RE.test(ref)) {
      setError('schema_ref must match: ^[a-z0-9][a-z0-9_-]{0,63}$');
      setActive(4);
      return;
    }
    if (fieldError) {
      setError(fieldError);
      setActive(1);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await edgeFetch('schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_ref: ref, schema_json: schemaPreview }),
      });

      const text = await response.text();
      const payload = text ? (JSON.parse(text) as unknown) : null;
      if (response.status === 409) {
        const conflictMessage = isPlainObject(payload) && typeof payload.error === 'string'
          ? payload.error
          : `schema_ref "${ref}" already exists with different content.`;
        setError(conflictMessage);
        setActive(4);
        return;
      }
      if (!response.ok) {
        throw new Error(`Save failed: HTTP ${response.status} ${text.slice(0, 500)}`);
      }

      notifications.show({
        color: 'green',
        title: 'Schema saved',
        message: `Schema "${ref}" created successfully.`,
      });
      navigate('/app/schemas');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppBreadcrumbs
        items={[
          { label: 'Schemas', href: '/app/schemas' },
          { label: 'Start', href: '/app/schemas/start' },
          { label: 'Wizard' },
        ]}
      />

      <PageHeader title="Schema Wizard" subtitle={`Source: ${sourceLabel}`}>
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas/start')}>
          Back to start
        </Button>
      </PageHeader>

      <SchemaWorkflowNav includeApply={false} />

      {error && <ErrorAlert message={error} />}

      {source === 'template' && (
        <Alert color="blue" mb="md">
          {`Template prefill source: ${templateId ?? 'missing template id'}`}
        </Alert>
      )}

      {source === 'upload' && (
        <Alert
          color={uploadDraft?.classification.mode === 'wizard' ? 'blue' : 'yellow'}
          mb="md"
          title={`Upload source: ${uploadDraft?.uploadName ?? uploadName ?? 'unknown file'}`}
        >
          <Stack gap={4}>
            <Text size="sm">
              {uploadDraft
                ? uploadDraft.classification.mode === 'wizard'
                  ? 'Upload is wizard-compatible and has been prefilled.'
                  : 'Upload requires advanced editing due to unsupported constructs.'
                : 'Upload source payload is still loading.'}
            </Text>
            {uploadDraft?.classification.warnings.map((warning) => (
              <Text key={warning} size="xs" c="dimmed">
                {warning}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      {active > 0 && navigationWarnings.length > 0 && (
        <Alert color="yellow" mb="md" title="Flexible navigation is enabled">
          <List size="xs">
            {navigationWarnings.map((warning) => (
              <List.Item key={warning}>{warning}</List.Item>
            ))}
          </List>
        </Alert>
      )}

      <Stepper active={active} onStepClick={jumpToStep} allowNextStepsSelect mb="md">
        <Stepper.Step label="Step 1" description="Intent" />
        <Stepper.Step label="Step 2" description="Fields" />
        <Stepper.Step label="Step 3" description="Prompt config" />
        <Stepper.Step label="Step 4" description="Preview" />
        <Stepper.Step label="Step 5" description="Save" />
      </Stepper>

      <Stack gap="md">
        {active === 0 && (
          <Card withBorder padding="md">
            <Stack gap="md">
              <Text fw={600}>What do you want to extract or annotate?</Text>
              <Textarea
                minRows={3}
                placeholder="Describe your extraction or annotation intent."
                value={intent}
                onChange={(event) => setIntent(event.currentTarget.value)}
              />

              {source === 'existing' && (
                <Stack gap="sm">
                  <Text fw={600}>Pick an existing schema to fork</Text>
                  {loadingExisting && <Text size="sm" c="dimmed">Loading schemas...</Text>}
                  {!loadingExisting && existingRows.length === 0 && (
                    <Text size="sm" c="dimmed">No schemas found for this user.</Text>
                  )}
                  {!loadingExisting && existingRows.length > 0 && (
                    <Table.ScrollContainer minWidth={500}>
                      <Table striped withTableBorder>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>schema_ref</Table.Th>
                            <Table.Th>created</Table.Th>
                            <Table.Th />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {existingRows.map((row) => (
                            <Table.Tr key={row.schema_id}>
                              <Table.Td ff="monospace" fz="xs">{row.schema_ref}</Table.Td>
                              <Table.Td>{new Date(row.created_at).toLocaleString()}</Table.Td>
                              <Table.Td>
                                <Button size="xs" variant={selectedExistingId === row.schema_id ? 'filled' : 'light'} onClick={() => applyExistingSchema(row)}>
                                  {selectedExistingId === row.schema_id ? 'Selected' : 'Use this schema'}
                                </Button>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        {active === 1 && (
          <Stack gap="md">
            {fieldError && <ErrorAlert message={fieldError} />}
            {fields.map((field) => (
              <Card key={field.id} withBorder padding="md">
                <Stack gap="sm">
                  <Group grow align="flex-end">
                    <TextInput
                      label="Field key"
                      placeholder="e.g. risk_level"
                      value={field.key}
                      onChange={(event) => updateField(field.id, { key: event.currentTarget.value })}
                    />
                    <Select
                      label="Type"
                      data={FIELD_TYPE_OPTIONS as unknown as { value: string; label: string }[]}
                      value={field.type}
                      onChange={(value) => {
                        if (!value) return;
                        updateField(field.id, { type: value as FieldType });
                      }}
                    />
                  </Group>

                  <TextInput
                    label="Description"
                    placeholder="Explain what this field should capture."
                    value={field.description}
                    onChange={(event) => updateField(field.id, { description: event.currentTarget.value })}
                  />

                  <Group grow align="flex-end">
                    <TextInput
                      label="Enum values (comma-separated)"
                      placeholder="low, medium, high"
                      value={field.enumCsv}
                      onChange={(event) => updateField(field.id, { enumCsv: event.currentTarget.value })}
                    />
                    <Switch
                      mt={28}
                      label="Required"
                      checked={field.required}
                      onChange={(event) => updateField(field.id, { required: event.currentTarget.checked })}
                    />
                    <Switch
                      mt={28}
                      label="Allow null"
                      checked={field.nullable}
                      onChange={(event) => updateField(field.id, { nullable: event.currentTarget.checked })}
                    />
                  </Group>

                  {(field.type === 'number' || field.type === 'integer') && (
                    <Group grow>
                      <TextInput
                        label="Minimum"
                        placeholder="optional"
                        value={field.minimum}
                        onChange={(event) => updateField(field.id, { minimum: event.currentTarget.value })}
                      />
                      <TextInput
                        label="Maximum"
                        placeholder="optional"
                        value={field.maximum}
                        onChange={(event) => updateField(field.id, { maximum: event.currentTarget.value })}
                      />
                    </Group>
                  )}

                  {field.type === 'string' && (
                    <Group grow>
                      <TextInput
                        label="Pattern"
                        placeholder="optional regex"
                        value={field.pattern}
                        onChange={(event) => updateField(field.id, { pattern: event.currentTarget.value })}
                      />
                      <TextInput
                        label="Format"
                        placeholder="optional format"
                        value={field.format}
                        onChange={(event) => updateField(field.id, { format: event.currentTarget.value })}
                      />
                    </Group>
                  )}

                  {field.type === 'array' && (
                    <Group grow align="flex-end">
                      <Select
                        label="Items type"
                        data={ARRAY_ITEM_TYPE_OPTIONS as unknown as { value: string; label: string }[]}
                        value={field.itemsType}
                        onChange={(value) => {
                          if (!value) return;
                          updateField(field.id, { itemsType: value as ArrayItemType });
                        }}
                      />
                      <TextInput
                        label="Min items"
                        placeholder="optional"
                        value={field.minItems}
                        onChange={(event) => updateField(field.id, { minItems: event.currentTarget.value })}
                      />
                      <TextInput
                        label="Max items"
                        placeholder="optional"
                        value={field.maxItems}
                        onChange={(event) => updateField(field.id, { maxItems: event.currentTarget.value })}
                      />
                    </Group>
                  )}

                  <Group justify="flex-end">
                    <Button
                      color="red"
                      variant="light"
                      size="xs"
                      onClick={() => removeField(field.id)}
                      disabled={fields.length === 1}
                    >
                      Remove field
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ))}

            <Group justify="flex-end">
              <Button size="xs" variant="default" onClick={addField}>
                Add field
              </Button>
            </Group>
          </Stack>
        )}

        {active === 2 && (
          <Card withBorder padding="md">
            <Stack gap="sm">
              <Text fw={600}>Prompt config (optional)</Text>
              <Textarea
                label="system_instructions"
                minRows={3}
                placeholder="Optional system-level instructions."
                value={prompt.systemInstructions}
                onChange={(event) => setPrompt((prev) => ({ ...prev, systemInstructions: event.currentTarget.value }))}
              />
              <Textarea
                label="per_block_prompt"
                minRows={3}
                placeholder="Optional per-block prompt."
                value={prompt.perBlockPrompt}
                onChange={(event) => setPrompt((prev) => ({ ...prev, perBlockPrompt: event.currentTarget.value }))}
              />
              <Group grow>
                <TextInput
                  label="model"
                  placeholder="Optional model override"
                  value={prompt.model}
                  onChange={(event) => setPrompt((prev) => ({ ...prev, model: event.currentTarget.value }))}
                />
                <TextInput
                  label="temperature"
                  placeholder="e.g. 0.2"
                  value={prompt.temperature}
                  onChange={(event) => setPrompt((prev) => ({ ...prev, temperature: event.currentTarget.value }))}
                />
                <TextInput
                  label="max_tokens_per_block"
                  placeholder="e.g. 2000"
                  value={prompt.maxTokensPerBlock}
                  onChange={(event) => setPrompt((prev) => ({ ...prev, maxTokensPerBlock: event.currentTarget.value }))}
                />
              </Group>
            </Stack>
          </Card>
        )}

        {active === 3 && (
          <Card withBorder padding="md">
            <Stack gap="sm">
              <Text fw={600}>Preview</Text>
              <Alert
                color={compatibility.status === 'pass' ? 'green' : 'yellow'}
                title={`Compatibility: ${compatibility.status === 'pass' ? 'Pass' : 'Warn'}`}
              >
                {compatibility.status === 'pass'
                  ? 'Schema meets the wizard compatibility contract (type object + non-empty properties).'
                  : (
                    <List size="xs">
                      {compatibility.issues.map((issue) => (
                        <List.Item key={issue}>{issue}</List.Item>
                      ))}
                    </List>
                  )}
              </Alert>
              <Text size="sm" c="dimmed">
                Columns: {fields.map((field) => field.key.trim()).filter(Boolean).join(', ') || 'none'}
              </Text>
              <JsonViewer value={schemaPreview} maxHeight={500} />
            </Stack>
          </Card>
        )}

        {active === 4 && (
          <Stack gap="md">
            <Card withBorder padding="md">
              <Stack gap="sm">
                <Text fw={600}>Save</Text>
                <TextInput
                  label="schema_ref"
                  placeholder="e.g. contract_review_v2"
                  value={schemaRef}
                  onChange={(event) => setSchemaRef(event.currentTarget.value)}
                />
                <Text size="xs" c="dimmed">
                  Must match: <Code>^[a-z0-9][a-z0-9_-]{"{0,63}"}$</Code>
                </Text>
                <List size="xs">
                  <List.Item>`409` means this ref already exists with different content.</List.Item>
                  <List.Item>Rename and save again to create a new schema artifact.</List.Item>
                </List>
              </Stack>
            </Card>

            <Card withBorder padding="md">
              <Stack gap="sm">
                <Text fw={600}>Final payload preview</Text>
                <JsonViewer value={{ schema_ref: schemaRef.trim(), schema_json: schemaPreview }} maxHeight={500} />
              </Stack>
            </Card>
          </Stack>
        )}
      </Stack>

      <Group justify="space-between" mt="md">
        <Button variant="default" onClick={prevStep} disabled={active === 0}>
          Back
        </Button>
        <Group gap="xs">
          {active < 4 && (
            <Button variant="light" onClick={saveSchema} loading={saving}>
              Save now
            </Button>
          )}
          {active < 4 ? (
            <Button onClick={nextStep} disabled={!canAdvance}>
              Next
            </Button>
          ) : (
            <Button onClick={saveSchema} loading={saving} disabled={!SLUG_RE.test(schemaRef.trim())}>
              Save schema
            </Button>
          )}
        </Group>
      </Group>
    </>
  );
}
