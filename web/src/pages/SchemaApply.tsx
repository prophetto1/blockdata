import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Center, Loader, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { JsonViewer } from '@/components/common/JsonViewer';
import { PageHeader } from '@/components/common/PageHeader';
import { SchemaWorkflowNav } from '@/components/schemas/SchemaWorkflowNav';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { edgeJson } from '@/lib/edge';
import type { DocumentRow, SchemaRow } from '@/lib/types';

type ApplyQueryPayload = {
  schemaId: string | null;
  schemaRef: string | null;
  sourceUid: string | null;
  projectId: string | null;
  convUid: string | null;
};

export default function SchemaApply() {
  const navigate = useNavigate();
  const location = useLocation();
  const [schema, setSchema] = useState<SchemaRow | null>(null);
  const [documentRow, setDocumentRow] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAttemptedRef = useRef(false);

  const payload = useMemo<ApplyQueryPayload>(() => {
    const params = new URLSearchParams(location.search);
    return {
      schemaId: params.get('schemaId'),
      schemaRef: params.get('schemaRef'),
      sourceUid: params.get('sourceUid'),
      projectId: params.get('projectId'),
      convUid: params.get('convUid'),
    };
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!payload.schemaId) {
          throw new Error('Missing schemaId. Save a schema first, then apply it.');
        }

        const schemaReq = supabase
          .from(TABLES.schemas)
          .select('schema_id, owner_id, schema_ref, schema_uid, schema_jsonb, created_at')
          .eq('schema_id', payload.schemaId)
          .maybeSingle();

        const docReq = payload.sourceUid
          ? supabase
            .from(TABLES.documents)
            .select('*')
            .eq('source_uid', payload.sourceUid)
            .maybeSingle()
          : Promise.resolve({ data: null, error: null });

        const [{ data: schemaData, error: schemaErr }, { data: docData, error: docErr }] = await Promise.all([
          schemaReq,
          docReq,
        ]);

        if (schemaErr) throw new Error(schemaErr.message);
        if (!schemaData) throw new Error('Schema not found.');
        if (docErr) throw new Error(docErr.message);

        if (!cancelled) {
          setSchema(schemaData as SchemaRow);
          setDocumentRow((docData as DocumentRow | null) ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [payload.schemaId, payload.sourceUid]);

  const applySchemaToDocument = useCallback(async () => {
    if (!payload.schemaId) {
      setError('Missing schemaId.');
      return;
    }

    const targetConvUid = documentRow?.conv_uid ?? payload.convUid;
    if (!targetConvUid) {
      setError('Document has no conv_uid yet. Ingest must complete before applying a schema.');
      return;
    }
    if (documentRow && documentRow.status !== 'ingested') {
      setError(`Document status is "${documentRow.status}". Schema apply requires ingested status.`);
      return;
    }

    setApplying(true);
    setError(null);
    try {
      const run = await edgeJson<{ run_id: string; total_blocks: number }>('runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conv_uid: targetConvUid,
          schema_id: payload.schemaId,
        }),
      });

      notifications.show({
        color: 'green',
        title: 'Schema applied',
        message: `${schema?.schema_ref ?? payload.schemaRef ?? 'Schema'} run created.`,
      });

      const targetProjectId = payload.projectId ?? documentRow?.project_id ?? null;
      if (payload.sourceUid && targetProjectId) {
        navigate(`/app/projects/${targetProjectId}/documents/${payload.sourceUid}?runId=${run.run_id}`);
        return;
      }

      navigate('/app/schemas');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }, [
    documentRow,
    navigate,
    payload.convUid,
    payload.projectId,
    payload.schemaId,
    payload.schemaRef,
    payload.sourceUid,
    schema?.schema_ref,
  ]);

  useEffect(() => {
    if (loading || applying || autoAttemptedRef.current) return;
    if (!payload.schemaId || !payload.sourceUid) return;
    autoAttemptedRef.current = true;
    void applySchemaToDocument();
  }, [applySchemaToDocument, applying, loading, payload.schemaId, payload.sourceUid]);

  return (
    <>
      <AppBreadcrumbs
        items={[
          { label: 'Schemas', href: '/app/schemas' },
          { label: 'Start', href: '/app/schemas/start' },
          { label: 'Apply' },
        ]}
      />

      <PageHeader title="Apply Schema" subtitle="Bind a saved schema to a document run and open the grid.">
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas/start')}>
          Back to start
        </Button>
      </PageHeader>

      <SchemaWorkflowNav includeTemplates={false} />

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : (
        <Stack gap="md">
          <Alert color="blue" title="Applying schema to document">
            A run is created for this schema/document pair and then you are redirected back to the document grid.
          </Alert>

          <Card withBorder padding="md">
            <Stack gap="xs">
              <Text fw={600}>Resolved context</Text>
              <Text size="sm">Schema: {schema?.schema_ref ?? payload.schemaRef ?? payload.schemaId ?? '--'}</Text>
              <Text size="sm">Document: {documentRow?.doc_title ?? payload.sourceUid ?? '--'}</Text>
              <Text size="sm">conv_uid: {documentRow?.conv_uid ?? payload.convUid ?? '--'}</Text>
            </Stack>
          </Card>

          <Card withBorder padding="md">
            <Stack gap="xs">
              <Text fw={600}>Current query payload</Text>
              <JsonViewer value={payload} />
            </Stack>
          </Card>

          <Button onClick={applySchemaToDocument} loading={applying}>
            Apply now
          </Button>
        </Stack>
      )}

      {!loading && (
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text fw={600}>Outcome</Text>
            <Text size="sm" c="dimmed">
              After run creation, the document page will open with that run selected. User schema columns render on the right side of the immutable columns.
            </Text>
          </Stack>
        </Card>
      )}
    </>
  );
}
