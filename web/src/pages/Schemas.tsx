import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { FileInput, TextInput, Button, Group, Stack, ActionIcon, Tooltip, Modal, Text, Grid, Paper, Badge, useComputedColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { SchemaRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { JsonViewer } from '@/components/common/JsonViewer';
import { CopyUid } from '@/components/common/CopyUid';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function Schemas() {
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact<SchemaRow>>(null);
  const [rows, setRows] = useState<SchemaRow[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [schemaRef, setSchemaRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false);
  const [deleteTarget, setDeleteTarget] = useState<SchemaRow | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = computedColorScheme === 'dark';

  const load = () => {
    supabase
      .from(TABLES.schemas)
      .select('schema_id, schema_ref, schema_uid, created_at, owner_id, schema_jsonb')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else {
          const nextRows = (data ?? []) as SchemaRow[];
          setRows(nextRows);
          setSelectedSchemaId((prev) => {
            if (prev && nextRows.some((row) => row.schema_id === prev)) return prev;
            return nextRows[0]?.schema_id ?? null;
          });
        }
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
    if (!file) { setError('Choose a User Schema JSON file first.'); return; }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (schemaRef.trim()) form.set('schema_ref', schemaRef.trim());
      form.set('schema', file);
      await edgeJson('schemas', { method: 'POST', body: form });
      notifications.show({
        color: 'green',
        title: 'Schema uploaded',
        message: schemaRef.trim() ? `Saved as ${schemaRef.trim()}` : 'Upload completed.',
      });
      load();
      setFile(null);
      setSchemaRef('');
      closeUpload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const gridTheme = useMemo(() => {
    return themeQuartz.withParams({
      rowVerticalPaddingScale: 0.6,
      browserColorScheme: isDark ? 'dark' : 'light',
      backgroundColor: isDark ? '#09090b' : '#ffffff',
      chromeBackgroundColor: isDark ? '#09090b' : '#ffffff',
      foregroundColor: isDark ? '#fafafa' : '#09090b',
      borderColor: isDark ? '#27272a' : '#e4e4e7',
      subtleTextColor: isDark ? '#a1a1aa' : '#52525b',
    });
  }, [isDark]);

  const renderActions = useCallback((params: ICellRendererParams<SchemaRow>) => {
    const row = params.data;
    if (!row) return null;
    return (
      <Group gap={4} justify="flex-end" wrap="nowrap">
        <Tooltip label="Open advanced editor">
          <ActionIcon variant="subtle" size="sm" onClick={() => navigate(`/app/schemas/advanced/${row.schema_id}`)}>
            <IconPencil size={14} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete schema">
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => { setDeleteTarget(row); openDelete(); }}>
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }, [navigate, openDelete]);

  const columnDefs = useMemo<ColDef<SchemaRow>[]>(() => ([
    {
      headerName: 'schema_ref',
      field: 'schema_ref',
      flex: 1,
      minWidth: 220,
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams<SchemaRow>) => (
        <Button
          variant="subtle"
          size="compact-sm"
          px={0}
          onClick={() => {
            if (params.data) setSelectedSchemaId(params.data.schema_id);
          }}
        >
          {params.value as string}
        </Button>
      ),
    },
    {
      headerName: 'schema_uid',
      field: 'schema_uid',
      width: 200,
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams<SchemaRow>) => {
        const value = params.value as string | undefined;
        if (!value) return <Text size="sm" c="dimmed">--</Text>;
        return <CopyUid value={value} display={`${value.slice(0, 16)}...`} />;
      },
    },
    {
      headerName: 'created',
      field: 'created_at',
      width: 200,
      sortable: true,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value as string).toLocaleString();
      },
    },
    {
      headerName: '',
      colId: 'actions',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: renderActions,
    },
  ]), [renderActions]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    cellStyle: {
      display: 'flex',
      alignItems: 'center',
    },
  }), []);

  const gridHeight = rows.length === 0 ? 240 : 520;
  const selectedSchema = useMemo(
    () => rows.find((row) => row.schema_id === selectedSchemaId) ?? null,
    [rows, selectedSchemaId],
  );

  return (
    <>
      <PageHeader
        title="User Schemas"
        subtitle={
          <>
            You can create or upload your user-schemas here.
            <br />
            This page accepts User Schema JSON (structured schema object). Source Document JSONs belong in document/source integration.
          </>
        }
      >
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => navigate('/app/schemas/start')}>
          Create schema
        </Button>
        <Button size="xs" variant="light" leftSection={<IconUpload size={14} />} onClick={openUpload}>
          Upload schema
        </Button>
        <Button variant="light" size="xs" onClick={() => navigate('/app/schemas/advanced')}>
          Advanced editor
        </Button>
      </PageHeader>
      {error && <ErrorAlert message={error} />}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <div
            className="block-viewer-grid grid-font-medium grid-font-family-sans grid-valign-center"
            style={{ height: gridHeight, width: '100%' }}
          >
            <AgGridReact
              ref={gridRef}
              theme={gridTheme}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={44}
              headerHeight={44}
              animateRows={false}
              domLayout="normal"
              overlayNoRowsTemplate='<span style="color: var(--mantine-color-dimmed);">No schemas yet.</span>'
            />
          </div>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Paper withBorder p="md" radius="md" style={{ minHeight: gridHeight }}>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600} size="sm">User Schema JSON Preview</Text>
                {selectedSchema && (
                  <Badge variant="light" ff="monospace">
                    {selectedSchema.schema_ref}
                  </Badge>
                )}
              </Group>
              {selectedSchema ? (
                <JsonViewer
                  value={selectedSchema.schema_jsonb}
                  minHeight={Math.max(gridHeight - 80, 160)}
                  maxHeight={Math.max(gridHeight - 80, 160)}
                />
              ) : (
                <Text size="sm" c="dimmed">
                  Select a schema name from the left table to preview its JSON.
                </Text>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

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

      <Modal opened={uploadOpened} onClose={closeUpload} title="Upload schema" centered>
        <Stack gap="md">
          <TextInput
            label="schema_ref (optional)"
            placeholder="e.g. book_review"
            description="Leave blank to auto-derive from the uploaded schema."
            value={schemaRef}
            onChange={(e) => setSchemaRef(e.currentTarget.value)}
          />
          <FileInput
            label="User Schema JSON file"
            placeholder="Choose .json file"
            accept="application/json,.json"
            value={file}
            onChange={setFile}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeUpload}>Cancel</Button>
            <Button onClick={upload} loading={busy} disabled={!file}>Upload</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
