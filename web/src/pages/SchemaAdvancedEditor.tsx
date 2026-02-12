import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Center, Group, Loader, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { edgeFetch } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { SchemaRow } from '@/lib/types';
import { loadMetaConfiguratorEmbed, type MountedSchemaEditor, type MetaConfiguratorEmbed } from '@/lib/metaConfiguratorEmbed';
import { readSchemaUploadDraft } from '@/lib/schemaUploadClassifier';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { SchemaWorkflowNav } from '@/components/schemas/SchemaWorkflowNav';

const DEFAULT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {},
};

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function SchemaAdvancedEditor() {
  const { schemaId } = useParams<{ schemaId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const uploadSource = params.get('source');
  const uploadKey = params.get('uploadKey');
  const uploadName = params.get('uploadName');

  const [embed, setEmbed] = useState<MetaConfiguratorEmbed | null>(null);
  const [row, setRow] = useState<SchemaRow | null>(null);
  const [schemaJson, setSchemaJson] = useState<unknown>(DEFAULT_SCHEMA);

  const [schemaRef, setSchemaRef] = useState('');
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaLoaded, setSchemaLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef<MountedSchemaEditor | null>(null);
  const schemaJsonForMountRef = useRef<unknown>(DEFAULT_SCHEMA);

  const schemaWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!isPlainObject(schemaJson)) {
      warnings.push('Schema must be a JSON object (not an array / primitive).');
      return warnings;
    }

    if (schemaJson.type !== 'object') {
      warnings.push('v0 worker/grid compatibility expects `schema_jsonb.type` to be "object".');
    }

    const props = schemaJson.properties;
    if (!isPlainObject(props)) {
      warnings.push('v0 worker/grid compatibility expects `schema_jsonb.properties` to be an object.');
    }

    return warnings;
  }, [schemaJson]);

  // 1) Load embed assets once
  useEffect(() => {
    let cancelled = false;
    loadMetaConfiguratorEmbed()
      .then((e) => {
        if (!cancelled) setEmbed(e);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Load schema (if editing), and prepare fork-by-default schema_ref
  useEffect(() => {
    setError(null);
    setSchemaLoaded(false);
    setUploadWarnings([]);

    if (!schemaId) {
      if (uploadSource === 'upload' && uploadKey) {
        const draft = readSchemaUploadDraft(uploadKey);
        if (!draft) {
          setError('Upload payload was not found (expired session). Re-upload from Start.');
          setRow(null);
          setSchemaJson(DEFAULT_SCHEMA);
          schemaJsonForMountRef.current = DEFAULT_SCHEMA;
          setSchemaRef('');
          setLoading(false);
          setSchemaLoaded(true);
          return;
        }

        setRow(null);
        setSchemaJson(draft.schemaJson);
        schemaJsonForMountRef.current = draft.schemaJson;
        setSchemaRef(draft.suggestedSchemaRef);
        setUploadWarnings(draft.classification.warnings);
        setLoading(false);
        setSchemaLoaded(true);
        return;
      }

      setRow(null);
      setSchemaJson(DEFAULT_SCHEMA);
      schemaJsonForMountRef.current = DEFAULT_SCHEMA;
      setSchemaRef('');
      setLoading(false);
      setSchemaLoaded(true);
      return;
    }

    setLoading(true);
    supabase
      .from(TABLES.schemas)
      .select('schema_id, owner_id, schema_ref, schema_uid, schema_jsonb, created_at')
      .eq('schema_id', schemaId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        if (!data) {
          setError('Schema not found');
          setLoading(false);
          return;
        }
        const r = data as SchemaRow;
        setRow(r);
        setSchemaJson(r.schema_jsonb ?? DEFAULT_SCHEMA);
        schemaJsonForMountRef.current = r.schema_jsonb ?? DEFAULT_SCHEMA;
        setSchemaRef(`${r.schema_ref}_v2`.slice(0, 64));
        setLoading(false);
        setSchemaLoaded(true);
      });
  }, [schemaId, uploadKey, uploadSource]);

  // 3) Mount the editor once both embed + schema are ready
  useEffect(() => {
    if (!embed) return;
    if (!schemaLoaded) return;
    const container = containerRef.current;
    if (!container) return;

    mountedRef.current?.destroy();
    mountedRef.current = embed.mountSchemaEditor(container, {
      initialSchema: schemaJsonForMountRef.current,
      onChange: (next) => setSchemaJson(next),
    });

    return () => {
      mountedRef.current?.destroy();
      mountedRef.current = null;
    };
  }, [embed, schemaLoaded, schemaId]);

  const save = async () => {
    const ref = schemaRef.trim();
    if (!ref) {
      setError('schema_ref is required.');
      return;
    }
    if (!SLUG_RE.test(ref)) {
      setError('schema_ref must match: ^[a-z0-9][a-z0-9_-]{0,63}$');
      return;
    }
    if (!isPlainObject(schemaJson)) {
      setError('Schema must be a JSON object.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const resp = await edgeFetch('schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_ref: ref, schema_json: schemaJson }),
      });

      const text = await resp.text();
      const payload = text ? (JSON.parse(text) as unknown) : null;

      if (resp.status === 409) {
        const msg = isPlainObject(payload) && typeof payload.error === 'string'
          ? payload.error
          : `schema_ref "${ref}" already exists with different content. Choose a new schema_ref.`;
        setError(msg);
        return;
      }

      if (!resp.ok) {
        throw new Error(`Save failed: HTTP ${resp.status} ${text.slice(0, 500)}`);
      }

      notifications.show({
        color: 'green',
        title: 'Saved',
        message: `Schema "${ref}" saved`,
      });
      navigate('/app/schemas');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <AppBreadcrumbs items={[
        { label: 'Schemas', href: '/app/schemas' },
        { label: schemaId ? (row?.schema_ref ?? 'Advanced editor') : 'Advanced editor' },
      ]} />

      <PageHeader
        title="Advanced editor"
        subtitle={
          schemaId
            ? `Editing "${row?.schema_ref}" (fork-by-default)`
            : uploadSource === 'upload'
              ? `Imported from ${uploadName ?? 'uploaded JSON'}`
              : 'Create or edit schemas with the full split view.'
        }
      >
        <Button
          variant="light"
          size="xs"
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => navigate('/app/schemas')}
        >
          Back
        </Button>
        <Button
          size="xs"
          leftSection={<IconDeviceFloppy size={14} />}
          onClick={save}
          loading={saving}
        >
          Save as new schema
        </Button>
      </PageHeader>

      <SchemaWorkflowNav />

      {error && <ErrorAlert message={error} />}

      <Stack gap="sm">
        {uploadSource === 'upload' && (
          <Alert color="blue" title={`Upload source: ${uploadName ?? 'unknown file'}`}>
            <Stack gap={4}>
              <Text size="sm">Upload classifier routed this schema to the advanced editor.</Text>
              {uploadWarnings.map((warning) => (
                <Text key={warning} size="xs" c="dimmed">{warning}</Text>
              ))}
            </Stack>
          </Alert>
        )}

        <Card withBorder padding="md">
          <Group align="flex-end" justify="space-between" wrap="wrap">
            <TextInput
              label="schema_ref (fork target)"
              description={schemaId ? 'Default is a fork. Choose a new schema_ref.' : 'Required. Lowercase slug used as the schema name.'}
              placeholder="e.g. book_review"
              value={schemaRef}
              onChange={(e) => setSchemaRef(e.currentTarget.value)}
              w={420}
            />
            {row && (
              <Stack gap={0}>
                <Text size="xs" c="dimmed">Source schema_uid</Text>
                <Text size="sm" ff="monospace">{row.schema_uid}</Text>
              </Stack>
            )}
          </Group>
        </Card>

        {schemaWarnings.length > 0 && (
          <Alert color="yellow" title="Compatibility warnings">
            <Stack gap={4}>
              {schemaWarnings.map((w) => (
                <Text key={w} size="sm">{w}</Text>
              ))}
            </Stack>
          </Alert>
        )}

        <Card withBorder padding={0} style={{ height: '70vh', overflow: 'hidden', position: 'relative' }}>
          <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
          {!embed && (
            <Center style={{ position: 'absolute', inset: 0 }}>
              <Loader />
            </Center>
          )}
        </Card>
      </Stack>
    </>
  );
}
