import { useEffect, useState } from 'react';
import { Table, FileInput, TextInput, Button, Group, Code, Stack } from '@mantine/core';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { SchemaRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export default function Schemas() {
  const [rows, setRows] = useState<SchemaRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [schemaRef, setSchemaRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<unknown>(null);

  const load = () => {
    supabase
      .from(TABLES.schemas)
      .select('schema_id, schema_ref, schema_uid, created_at, owner_id, schema_jsonb')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data ?? []) as SchemaRow[]);
      });
  };

  useEffect(load, []);

  const upload = async () => {
    if (!file) { setError('Choose a schema JSON file first.'); return; }
    setBusy(true);
    setError(null);
    setLastUpload(null);
    try {
      const form = new FormData();
      if (schemaRef.trim()) form.set('schema_ref', schemaRef.trim());
      form.set('schema', file);
      const result = await edgeJson('schemas', { method: 'POST', body: form });
      setLastUpload(result);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Schemas" subtitle="Upload and list annotation schemas." />
      <Stack maw={700} gap="sm">
        <Group grow>
          <TextInput placeholder="schema_ref (optional)" value={schemaRef} onChange={(e) => setSchemaRef(e.currentTarget.value)} />
          <FileInput placeholder="Choose .json file" accept="application/json,.json" value={file} onChange={setFile} />
          <Button onClick={upload} loading={busy}>Upload schema</Button>
        </Group>
      </Stack>
      {error && <ErrorAlert message={error} />}
      {lastUpload && <Code block mt="md">{JSON.stringify(lastUpload, null, 2)}</Code>}
      <Table.ScrollContainer minWidth={500} mt="lg">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>schema_ref</Table.Th>
              <Table.Th>schema_uid</Table.Th>
              <Table.Th>created</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.schema_id}>
                <Table.Td ff="monospace" fz="xs">{r.schema_ref}</Table.Td>
                <Table.Td ff="monospace" fz="xs">{r.schema_uid.slice(0, 16)}...</Table.Td>
                <Table.Td>{new Date(r.created_at).toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3} ta="center" c="dimmed">No schemas yet.</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}
