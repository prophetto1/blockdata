import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowClickedEvent,
} from 'ag-grid-community';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconFileText,
  IconPlayerPlay,
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { edgeJson } from '@/lib/edge';
import type { DocumentRow, ProjectRow, RunRow, SchemaRow } from '@/lib/types';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { MultiDocumentUploader } from '@/components/documents/MultiDocumentUploader';

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_COLOR: Record<string, string> = {
  ingested: 'green',
  converting: 'yellow',
  uploaded: 'blue',
  conversion_failed: 'red',
  ingest_failed: 'red',
  running: 'blue',
  complete: 'green',
  failed: 'red',
  cancelled: 'gray',
};

type DocumentStatusFilter = 'all' | DocumentRow['status'];

type RunAttemptResult = {
  kind: 'started' | 'exists' | 'not_ready' | 'failed';
  error?: string;
};

const sortDocumentsByUploadedAt = (rows: DocumentRow[]) =>
  [...rows].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

function isDocSelectable(doc: DocumentRow): boolean {
  return doc.status === 'ingested' && !!doc.conv_uid;
}

function formatBytes(bytes: number | null | undefined): string {
  const value = typeof bytes === 'number' ? bytes : 0;
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let size = value;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  const rounded = size >= 10 || idx === 0 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[idx]}`;
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (absMs < minute) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), 'minute');
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (absMs < week) return rtf.format(Math.round(diffMs / day), 'day');
  if (absMs < month) return rtf.format(Math.round(diffMs / week), 'week');
  if (absMs < year) return rtf.format(Math.round(diffMs / month), 'month');
  return rtf.format(Math.round(diffMs / year), 'year');
}

function estimateConversionProgress(doc: DocumentRow, nowMs: number): number | null {
  if (doc.status === 'ingested') return 100;
  if (doc.status === 'conversion_failed' || doc.status === 'ingest_failed') return 100;
  if (doc.status !== 'uploaded' && doc.status !== 'converting') return null;

  const uploadedMs = new Date(doc.uploaded_at).getTime();
  const elapsedMinutes = Number.isFinite(uploadedMs) ? Math.max(0, (nowMs - uploadedMs) / 60000) : 0;

  if (doc.status === 'uploaded') {
    // Uploaded state often includes queue/wait time before conversion starts.
    const base = Math.min(28, 8 + elapsedMinutes * 1.2);
    const pulse = ((Math.sin((nowMs + uploadedMs) / 1200) + 1) / 2) * 4;
    return Math.min(34, base + pulse);
  }

  // Converting: coarse visual estimate only; pulse prevents "stuck" appearance.
  const base = Math.min(88, 35 + elapsedMinutes * 2.2);
  const pulse = ((Math.sin((nowMs + uploadedMs) / 900) + 1) / 2) * 8;
  return Math.min(96, base + pulse);
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = computedColorScheme === 'dark';

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteOpened, { open: openDeleteProject, close: closeDeleteProject }] = useDisclosure(false);
  const [uploadOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [selectedSourceUids, setSelectedSourceUids] = useState<string[]>([]);
  const [bulkSchemaId, setBulkSchemaId] = useState<string | null>(null);
  const [runningSelected, setRunningSelected] = useState(false);
  const [progressNowMs, setProgressNowMs] = useState(() => Date.now());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const load = useCallback(async () => {
    if (!projectId) return;

    const [projRes, docRes, schemaRes] = await Promise.all([
      supabase.from(TABLES.projects).select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from(TABLES.documents).select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false }),
      supabase.from(TABLES.schemas).select('*').order('created_at', { ascending: false }),
    ]);

    if (projRes.error) {
      setError(projRes.error.message);
      setLoading(false);
      return;
    }
    if (docRes.error) {
      setError(docRes.error.message);
      setLoading(false);
      return;
    }
    if (schemaRes.error) {
      setError(schemaRes.error.message);
      setLoading(false);
      return;
    }
    if (!projRes.data) {
      setError('Project not found');
      setLoading(false);
      return;
    }

    const proj = projRes.data as ProjectRow;
    setProject(proj);
    setEditName(proj.project_name);
    setEditDesc(proj.description ?? '');

    const docRows = (docRes.data ?? []) as DocumentRow[];
    setDocs(sortDocumentsByUploadedAt(docRows));

    const schemaRows = (schemaRes.data ?? []) as SchemaRow[];
    setSchemas(schemaRows);

    const convUids = docRows.filter((d) => d.conv_uid).map((d) => d.conv_uid as string);
    if (convUids.length > 0) {
      const { data: runData } = await supabase
        .from(TABLES.runs)
        .select('*')
        .in('conv_uid', convUids)
        .order('started_at', { ascending: false });
      setRuns((runData ?? []) as RunRow[]);
    } else {
      setRuns([]);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedSourceUids((prev) => {
      if (prev.length === 0) return prev;
      const validIds = new Set(docs.map((doc) => doc.source_uid));
      const next = prev.filter((sourceUid) => validIds.has(sourceUid));
      return next.length === prev.length ? prev : next;
    });
  }, [docs]);

  useEffect(() => {
    if (schemas.length === 0) {
      setBulkSchemaId(null);
      return;
    }
    setBulkSchemaId((current) => {
      if (current && schemas.some((schema) => schema.schema_id === current)) return current;
      return schemas[0].schema_id;
    });
  }, [schemas]);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-documents-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.documents,
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as DocumentRow;
            setDocs((prev) => prev.filter((doc) => doc.source_uid !== oldRow.source_uid));
            return;
          }

          const newRow = payload.new as DocumentRow;
          if (!newRow?.source_uid) return;

          setDocs((prev) => {
            const existing = prev.filter((doc) => doc.source_uid !== newRow.source_uid);
            return sortDocumentsByUploadedAt([...existing, newRow]);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  useEffect(() => {
    const timer = window.setInterval(() => setProgressNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedSourceUidSet = useMemo(() => new Set(selectedSourceUids), [selectedSourceUids]);

  const schemaOptions = useMemo(
    () => schemas.map((schema) => ({ value: schema.schema_id, label: schema.schema_ref })),
    [schemas],
  );

  const sourceTypeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        docs
          .map((doc) => (typeof doc.source_type === 'string' ? doc.source_type.trim() : ''))
          .filter((value) => value.length > 0),
      ),
    ).sort();
    return [
      { value: 'all', label: 'All types' },
      ...values.map((value) => ({ value, label: value.toUpperCase() })),
    ];
  }, [docs]);

  const schemaById = useMemo(() => {
    const map = new Map<string, SchemaRow>();
    for (const schema of schemas) map.set(schema.schema_id, schema);
    return map;
  }, [schemas]);

  const latestRunByConvAndSchema = useMemo(() => {
    const byConvAndSchema = new Map<string, RunRow>();
    for (const run of runs) {
      const key = `${run.conv_uid}::${run.schema_id}`;
      if (!byConvAndSchema.has(key)) byConvAndSchema.set(key, run);
    }
    return byConvAndSchema;
  }, [runs]);

  const latestRunByConv = useMemo(() => {
    const byConv = new Map<string, RunRow>();
    for (const run of runs) {
      if (!byConv.has(run.conv_uid)) byConv.set(run.conv_uid, run);
    }
    return byConv;
  }, [runs]);

  const filteredDocs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return docs.filter((doc) => {
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
      if (typeFilter !== 'all' && doc.source_type !== typeFilter) return false;
      if (!needle) return true;

      const haystack = `${doc.doc_title ?? ''} ${doc.source_type ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [docs, search, statusFilter, typeFilter]);

  const visibleSelectableDocs = useMemo(
    () => filteredDocs.filter((doc) => isDocSelectable(doc)),
    [filteredDocs],
  );

  const selectedDocs = useMemo(
    () => docs.filter((doc) => selectedSourceUidSet.has(doc.source_uid)),
    [docs, selectedSourceUidSet],
  );

  const selectedSelectableDocs = useMemo(
    () => selectedDocs.filter((doc) => isDocSelectable(doc)),
    [selectedDocs],
  );

  const selectedVisibleCount = useMemo(
    () => visibleSelectableDocs.filter((doc) => selectedSourceUidSet.has(doc.source_uid)).length,
    [visibleSelectableDocs, selectedSourceUidSet],
  );

  const allSelectableChecked = visibleSelectableDocs.length > 0 && selectedVisibleCount === visibleSelectableDocs.length;
  const selectableIndeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleSelectableDocs.length;

  const toggleDocSelection = useCallback((sourceUid: string, checked: boolean) => {
    setSelectedSourceUids((prev) => {
      if (checked) {
        if (prev.includes(sourceUid)) return prev;
        return [...prev, sourceUid];
      }
      return prev.filter((id) => id !== sourceUid);
    });
  }, []);

  const toggleSelectAllVisible = useCallback((checked: boolean) => {
    setSelectedSourceUids((prev) => {
      const visibleIds = visibleSelectableDocs.map((doc) => doc.source_uid);
      if (checked) {
        const next = new Set(prev);
        for (const sourceUid of visibleIds) next.add(sourceUid);
        return Array.from(next);
      }
      const visibleSet = new Set(visibleIds);
      return prev.filter((sourceUid) => !visibleSet.has(sourceUid));
    });
  }, [visibleSelectableDocs]);

  const createRunForDoc = useCallback(async (doc: DocumentRow, schemaId: string): Promise<RunAttemptResult> => {
    if (!doc.conv_uid || doc.status !== 'ingested') return { kind: 'not_ready' };

    const runKey = `${doc.conv_uid}::${schemaId}`;
    if (latestRunByConvAndSchema.has(runKey)) return { kind: 'exists' };

    try {
      await edgeJson<{ run_id: string; total_blocks: number }>('runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conv_uid: doc.conv_uid,
          schema_id: schemaId,
        }),
      });
      return { kind: 'started' };
    } catch (e) {
      return { kind: 'failed', error: e instanceof Error ? e.message : String(e) };
    }
  }, [latestRunByConvAndSchema]);

  const handleRunSelected = useCallback(async () => {
    if (!bulkSchemaId) {
      notifications.show({ color: 'yellow', title: 'Select schema', message: 'Choose a schema for the selected documents.' });
      return;
    }

    if (selectedSelectableDocs.length === 0) {
      notifications.show({ color: 'yellow', title: 'No ingest-ready documents', message: 'Select at least one ingest-ready document.' });
      return;
    }

    setRunningSelected(true);
    try {
      const results = await Promise.all(selectedSelectableDocs.map((doc) => createRunForDoc(doc, bulkSchemaId)));
      const started = results.filter((result) => result.kind === 'started').length;
      const exists = results.filter((result) => result.kind === 'exists').length;
      const notReady = results.filter((result) => result.kind === 'not_ready').length;
      const failed = results.filter((result) => result.kind === 'failed').length;

      if (failed > 0) {
        const firstError = results.find((result) => result.kind === 'failed' && result.error)?.error;
        if (firstError) setError(firstError);
      }

      notifications.show({
        color: failed > 0 ? 'yellow' : 'green',
        title: 'Batch run submitted',
        message: `Started ${started}, existing ${exists}, not ready ${notReady}, failed ${failed}`,
      });

      if (started > 0) {
        await load();
      }
    } finally {
      setRunningSelected(false);
    }
  }, [bulkSchemaId, createRunForDoc, load, selectedSelectableDocs]);

  const buildGridPath = useCallback((doc: DocumentRow): string => {
    const base = `/app/projects/${projectId}/documents/${doc.source_uid}`;
    if (!doc.conv_uid) return base;

    const run = bulkSchemaId
      ? latestRunByConvAndSchema.get(`${doc.conv_uid}::${bulkSchemaId}`)
      : latestRunByConv.get(doc.conv_uid);

    return run ? `${base}?runId=${run.run_id}` : base;
  }, [bulkSchemaId, latestRunByConv, latestRunByConvAndSchema, projectId]);

  const persistProjectMetadata = async () => {
    if (!projectId) return false;
    const nextName = editName.trim();
    if (!nextName) {
      notifications.show({ color: 'yellow', title: 'Project name required', message: 'Title cannot be empty.' });
      return false;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from(TABLES.projects)
      .update({ project_name: nextName, description: editDesc.trim() || null })
      .eq('project_id', projectId);
    if (err) {
      setError(err.message);
      setSaving(false);
      return false;
    }
    setProject((p) => (p ? { ...p, project_name: nextName, description: editDesc.trim() || null } : p));
    setSaving(false);
    setEditingField(null);
    notifications.show({ color: 'green', title: 'Saved', message: 'Project updated' });
    return true;
  };

  const beginInlineEdit = (field: 'title' | 'description') => {
    if (!project || saving) return;
    setEditName(project.project_name);
    setEditDesc(project.description ?? '');
    setEditingField(field);
  };

  const cancelInlineEdit = () => {
    if (!project) return;
    setEditName(project.project_name);
    setEditDesc(project.description ?? '');
    setEditingField(null);
  };

  const onInlineEditKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await persistProjectMetadata();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelInlineEdit();
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    setDeletingProject(true);
    try {
      const { error: err } = await supabase.rpc('delete_project', { p_project_id: projectId });
      if (err) throw new Error(err.message);
      notifications.show({ color: 'green', title: 'Deleted', message: 'Project and all contents removed' });
      navigate('/app/projects');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeletingProject(false);
      closeDeleteProject();
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

  const columnDefs = useMemo<ColDef<DocumentRow>[]>(() => ([
    {
      headerName: '',
      colId: 'select',
      width: 56,
      minWidth: 56,
      maxWidth: 56,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const doc = params.data;
        if (!doc) return null;
        const checked = selectedSourceUidSet.has(doc.source_uid);
        return (
          <Checkbox
            checked={checked}
            aria-label={`Select ${doc.doc_title}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => toggleDocSelection(doc.source_uid, event.currentTarget.checked)}
          />
        );
      },
    },
    {
      headerName: 'Document',
      field: 'doc_title',
      flex: 1.7,
      minWidth: 360,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const doc = params.data;
        if (!doc) return null;

        const selectedSchema = bulkSchemaId ? schemaById.get(bulkSchemaId) ?? null : null;
        const runForSelectedSchema = selectedSchema && doc.conv_uid
          ? latestRunByConvAndSchema.get(`${doc.conv_uid}::${selectedSchema.schema_id}`) ?? null
          : null;
        const latestRun = doc.conv_uid ? latestRunByConv.get(doc.conv_uid) ?? null : null;
        const displayRun = runForSelectedSchema ?? latestRun;

        const schemaLabel = selectedSchema
          ? selectedSchema.schema_ref
          : displayRun
            ? schemaById.get(displayRun.schema_id)?.schema_ref ?? 'schema'
            : null;

        let schemaSummary = 'Schema: --';
        if (selectedSchema && !isDocSelectable(doc)) {
          schemaSummary = `${selectedSchema.schema_ref} -> not ingest-ready`;
        } else if (displayRun && schemaLabel) {
          schemaSummary = `${schemaLabel} -> ${displayRun.status} (${displayRun.completed_blocks}/${displayRun.total_blocks})`;
        } else if (selectedSchema) {
          schemaSummary = `${selectedSchema.schema_ref} -> not started`;
        }
        const sourceTypeLabel = typeof doc.source_type === 'string' && doc.source_type.length > 0
          ? doc.source_type.toUpperCase()
          : 'UNKNOWN';

        return (
          <Stack gap={2}>
            <Anchor
              component="button"
              type="button"
              size="sm"
              fw={600}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                navigate(buildGridPath(doc));
              }}
            >
              {doc.doc_title}
            </Anchor>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {sourceTypeLabel} · {formatBytes(doc.source_filesize)} · {schemaSummary}
            </Text>
          </Stack>
        );
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 140,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const status = params.value as DocumentRow['status'] | undefined;
        if (!status) return null;
        const doc = params.data;
        const progressValue = doc ? estimateConversionProgress(doc, progressNowMs) : null;

        if (doc && (status === 'uploaded' || status === 'converting')) {
          return (
            <Stack gap={3} style={{ width: '100%' }}>
              <Badge size="xs" variant="light" color={STATUS_COLOR[status] ?? 'gray'}>
                {status}
              </Badge>
              <Progress
                value={progressValue ?? (status === 'converting' ? 60 : 15)}
                color={status === 'converting' ? 'yellow' : 'blue'}
                size="xs"
                radius="xl"
                striped
                animated
              />
            </Stack>
          );
        }

        return (
          <Badge size="xs" variant="light" color={STATUS_COLOR[status] ?? 'gray'}>
            {status}
          </Badge>
        );
      },
    },
    {
      headerName: 'Uploaded',
      field: 'uploaded_at',
      width: 150,
      sort: 'desc',
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const value = params.data?.uploaded_at;
        if (!value) return <Text size="xs" c="dimmed">--</Text>;
        const absolute = new Date(value).toLocaleString();
        return (
          <Tooltip label={absolute}>
            <Text size="xs" c="dimmed">{formatRelativeTime(value)}</Text>
          </Tooltip>
        );
      },
    },
  ]), [
    bulkSchemaId,
    buildGridPath,
    latestRunByConv,
    latestRunByConvAndSchema,
    navigate,
    schemaById,
    selectedSourceUidSet,
    toggleDocSelection,
    progressNowMs,
  ]);

  const defaultColDef = useMemo<ColDef<DocumentRow>>(() => ({
    resizable: true,
    sortable: true,
    filter: false,
    suppressHeaderMenuButton: true,
    cellStyle: {
      display: 'flex',
      alignItems: 'center',
    },
  }), []);

  const handleRowClicked = useCallback((event: RowClickedEvent<DocumentRow>) => {
    if (!event.data) return;
    navigate(buildGridPath(event.data));
  }, [buildGridPath, navigate]);

  if (loading) return <Center mt="xl"><Loader /></Center>;
  if (!project) return <ErrorAlert message={error ?? 'Project not found'} />;

  const hasFilters = search.trim().length > 0 || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <>
      <Group justify="space-between" align="flex-start" mb="lg">
        <Box style={{ minWidth: 0, flex: 1 }}>
          {editingField === 'title' ? (
            <TextInput
              value={editName}
              onChange={(event) => setEditName(event.currentTarget.value)}
              onKeyDown={(event) => {
                void onInlineEditKeyDown(event);
              }}
              onBlur={() => cancelInlineEdit()}
              autoFocus
              disabled={saving}
              size="md"
            />
          ) : (
            <Title order={2} onDoubleClick={() => beginInlineEdit('title')} style={{ cursor: 'text' }}>
              {project.project_name}
            </Title>
          )}

          {editingField === 'description' ? (
            <TextInput
              value={editDesc}
              onChange={(event) => setEditDesc(event.currentTarget.value)}
              onKeyDown={(event) => {
                void onInlineEditKeyDown(event);
              }}
              onBlur={() => cancelInlineEdit()}
              autoFocus
              disabled={saving}
              size="sm"
              mt={4}
            />
          ) : (
            <Text
              size="sm"
              c="dimmed"
              mt={4}
              onDoubleClick={() => beginInlineEdit('description')}
              style={{ cursor: 'text' }}
            >
              {project.description ?? 'Double-click to add description'}
            </Text>
          )}
        </Box>

        <Button variant="subtle" color="red" size="xs" onClick={openDeleteProject}>
          Delete project
        </Button>
      </Group>

      {error && <ErrorAlert message={error} />}

      <Box style={{ marginInline: 'calc(var(--mantine-spacing-md) * -1)' }}>
        <Divider my="md" />

        <Box px="md" pb="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light"><IconPlayerPlay size={14} /></ThemeIcon>
                <Text fw={600} size="sm">Unstructured Track B</Text>
              </Group>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="filled"
                  onClick={() => navigate(`/app/projects/${projectId}/track-b/workbench`)}
                  disabled={!project.workspace_id}
                >
                  Open Workbench
                </Button>
              </Group>
            </Group>
            {!project.workspace_id && (
              <Text size="xs" c="dimmed">
                This project is missing a workspace binding, so the Track B workbench is unavailable.
              </Text>
            )}
            {project.workspace_id && (
              <Text size="xs" c="dimmed">
                Track B execution and review are isolated to the dedicated workbench page.
              </Text>
            )}
          </Stack>
        </Box>

        <Divider my="md" />

        <Box px="md" pb="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light"><IconFileText size={14} /></ThemeIcon>
                <Text fw={600} size="sm">Documents</Text>
              </Group>
              <Button leftSection={<IconUpload size={14} />} onClick={openUpload}>
                Upload
              </Button>
            </Group>

            <Group align="end" wrap="wrap">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search documents"
                leftSection={<IconSearch size={14} />}
                w={300}
              />
              <Select
                label="Status"
                value={statusFilter}
                data={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'uploaded', label: 'Uploaded' },
                  { value: 'converting', label: 'Converting' },
                  { value: 'ingested', label: 'Ingested' },
                  { value: 'conversion_failed', label: 'Conversion failed' },
                  { value: 'ingest_failed', label: 'Ingest failed' },
                ]}
                onChange={(value) => setStatusFilter((value as DocumentStatusFilter) ?? 'all')}
                w={180}
              />
              <Select
                label="Type"
                value={typeFilter}
                data={sourceTypeOptions}
                onChange={(value) => setTypeFilter(value ?? 'all')}
                w={160}
              />
              <Checkbox
                label="Select visible ingest-ready"
                checked={allSelectableChecked}
                indeterminate={selectableIndeterminate}
                onChange={(event) => toggleSelectAllVisible(event.currentTarget.checked)}
              />
            </Group>

            {selectedSourceUids.length > 0 && (
              <Group
                justify="space-between"
                align="center"
                wrap="wrap"
                p="sm"
                style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}
              >
                <Text size="sm" fw={600}>{selectedSourceUids.length} selected</Text>
                <Group wrap="wrap">
                  <Select
                    value={bulkSchemaId}
                    onChange={(value) => setBulkSchemaId(value)}
                    data={schemaOptions}
                    placeholder={schemas.length > 0 ? 'Select schema' : 'No schemas'}
                    searchable
                    w={260}
                  />
                  <Button
                    leftSection={<IconPlayerPlay size={14} />}
                    onClick={() => {
                      void handleRunSelected();
                    }}
                    loading={runningSelected}
                    disabled={!bulkSchemaId || selectedSelectableDocs.length === 0}
                  >
                    Run Selected
                  </Button>
                  <Button variant="default" onClick={() => setSelectedSourceUids([])}>
                    Clear
                  </Button>
                </Group>
              </Group>
            )}

            {docs.length === 0 ? (
              <Center py="lg">
                <Stack align="center" gap="xs">
                  <Text size="sm" c="dimmed">No documents yet.</Text>
                  <Text size="xs" c="dimmed">Use Upload to add files to this project.</Text>
                </Stack>
              </Center>
            ) : (
              <div
                className="block-viewer-grid grid-font-medium grid-font-family-sans grid-valign-center"
                style={{ height: 640, width: '100%' }}
              >
                <AgGridReact
                  theme={gridTheme}
                  rowData={filteredDocs}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  getRowId={(params) => params.data.source_uid}
                  onRowClicked={handleRowClicked}
                  rowHeight={58}
                  headerHeight={44}
                  animateRows={false}
                  domLayout="normal"
                  overlayNoRowsTemplate={hasFilters
                    ? '<span style="color: var(--mantine-color-dimmed);">No matching documents.</span>'
                    : '<span style="color: var(--mantine-color-dimmed);">No documents yet.</span>'}
                />
              </div>
            )}
          </Stack>
        </Box>
      </Box>

      <Modal
        opened={uploadOpened}
        onClose={closeUpload}
        title="Upload documents"
        size="lg"
        centered
        withOverlay={false}
        trapFocus={false}
        lockScroll={false}
      >
        <MultiDocumentUploader
          projectId={project.project_id}
          title={null}
          subtitle={null}
          framed={false}
          onBatchUploaded={() => {
            void load();
            closeUpload();
          }}
        />
      </Modal>

      <Modal opened={deleteOpened} onClose={closeDeleteProject} title="Delete project" centered>
        <Stack gap="md">
          <Text size="sm">
            This will permanently delete <Text span fw={600}>{project.project_name}</Text> and all its documents, blocks, runs, and overlays. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteProject}>Cancel</Button>
            <Button color="red" onClick={handleDeleteProject} loading={deletingProject}>Delete project</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}


