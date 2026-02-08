import { useEffect, useState } from 'react';
import { Table, Select, Button, Group, Badge, Anchor, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { DocumentRow, SchemaRow, RunRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const STATUS_COLOR: Record<string, string> = {
  running: 'blue',
  complete: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export default function RunsList() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = () => {
    supabase
      .from(TABLES.runs)
      .select('run_id, conv_uid, schema_id, status, started_at, total_blocks, completed_blocks, failed_blocks, owner_id, completed_at, model_config')
      .order('started_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRuns((data ?? []) as RunRow[]);
      });
  };

  useEffect(() => {
    loadRuns();
    supabase
      .from(TABLES.documents)
      .select('source_uid, conv_uid, doc_title, status, owner_id, source_type, source_filesize, source_total_characters, uploaded_at, error')
      .eq('status', 'ingested')
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => setDocs((data ?? []) as DocumentRow[]));
    supabase
      .from(TABLES.schemas)
      .select('schema_id, schema_ref, schema_uid, created_at, owner_id, schema_jsonb')
      .order('created_at', { ascending: false })
      .then(({ data }) => setSchemas((data ?? []) as SchemaRow[]));
  }, []);

  const createRun = async () => {
    const doc = docs.find((d) => d.source_uid === selectedDoc);
    if (!doc?.conv_uid) { setError('Select an ingested document.'); return; }
    if (!selectedSchema) { setError('Select a schema.'); return; }
    setBusy(true);
    setError(null);
    try {
      const resp = await edgeJson<{ run_id: string; total_blocks: number }>('runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_uid: doc.conv_uid, schema_id: selectedSchema }),
      });
      notifications.show({ color: 'green', title: 'Run created', message: `${resp.total_blocks} blocks` });
      loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Runs" subtitle="Create and monitor annotation runs." />
      <Stack maw={700} gap="sm" mb="lg">
        <Group grow>
          <Select
            placeholder="Select document"
            data={docs.map((d) => ({ value: d.source_uid, label: d.doc_title }))}
            value={selectedDoc}
            onChange={setSelectedDoc}
            searchable
          />
          <Select
            placeholder="Select schema"
            data={schemas.map((s) => ({ value: s.schema_id, label: s.schema_ref }))}
            value={selectedSchema}
            onChange={setSelectedSchema}
            searchable
          />
          <Button onClick={createRun} loading={busy}>Create run</Button>
        </Group>
      </Stack>
      {error && <ErrorAlert message={error} />}
      <Table.ScrollContainer minWidth={600}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>run_id</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Blocks</Table.Th>
              <Table.Th>Started</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {runs.map((r) => (
              <Table.Tr key={r.run_id}>
                <Table.Td>
                  <Anchor component={Link} to={`/app/runs/${r.run_id}`} size="sm" ff="monospace">
                    {r.run_id.slice(0, 12)}...
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" color={STATUS_COLOR[r.status] ?? 'gray'}>{r.status}</Badge>
                </Table.Td>
                <Table.Td>{r.completed_blocks}/{r.total_blocks} ({r.failed_blocks} failed)</Table.Td>
                <Table.Td>{new Date(r.started_at).toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
            {runs.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4} ta="center" c="dimmed">No runs yet.</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}
