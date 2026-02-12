import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, FileInput, TextInput, Button, Group, Stack, ActionIcon, Tooltip, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { SchemaRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { JsonViewer } from '@/components/common/JsonViewer';

export default function Schemas() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SchemaRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [schemaRef, setSchemaRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<unknown>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchemaRow | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteSchema = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: err } = await supabase.rpc('delete_schema', { p_schema_id: deleteTarget.schema_id });
      if (err) throw new Error(err.message);
      notifications.show({ color: 'green', title: 'Deleted', message: `Schema "${deleteTarget.schema_ref}" removed` });
      closeDelete();
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      closeDelete();
    } finally {
      setDeleting(false);
    }
  };

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
      <PageHeader title="Schemas" subtitle="Create, upload, and manage annotation schemas.">
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => navigate('/app/schemas/start')}>
          Create schema
        </Button>
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas/advanced')}>
          Advanced editor
        </Button>
      </PageHeader>
      <Stack maw={700} gap="sm">
        <Group grow>
          <TextInput placeholder="schema_ref (optional)" value={schemaRef} onChange={(e) => setSchemaRef(e.currentTarget.value)} />
          <FileInput placeholder="Choose .json file" accept="application/json,.json" value={file} onChange={setFile} />
          <Button onClick={upload} loading={busy}>Upload schema</Button>
        </Group>
      </Stack>
      {error && <ErrorAlert message={error} />}
      {lastUpload && <div style={{ marginTop: 'var(--mantine-spacing-md)' }}><JsonViewer value={lastUpload} /></div>}
      <Table.ScrollContainer minWidth={500} mt="lg">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>schema_ref</Table.Th>
              <Table.Th>schema_uid</Table.Th>
              <Table.Th>created</Table.Th>
              <Table.Th w={96} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.schema_id}>
                <Table.Td ff="monospace" fz="xs">{r.schema_ref}</Table.Td>
                <Table.Td ff="monospace" fz="xs">{r.schema_uid.slice(0, 16)}...</Table.Td>
                <Table.Td>{new Date(r.created_at).toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Tooltip label="Open advanced editor">
                      <ActionIcon variant="subtle" size="sm" onClick={() => navigate(`/app/schemas/advanced/${r.schema_id}`)}>
                        <IconPencil size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete schema">
                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => { setDeleteTarget(r); openDelete(); }}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4} ta="center" c="dimmed">No schemas yet.</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete schema" centered>
        <Stack gap="md">
          <Text size="sm">
            Delete schema <Text span fw={600} ff="monospace">{deleteTarget?.schema_ref}</Text>? This will fail if any runs reference it.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>Cancel</Button>
            <Button color="red" onClick={handleDeleteSchema} loading={deleting}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
