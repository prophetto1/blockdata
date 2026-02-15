import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowClickedEvent,
} from 'ag-grid-community';
import { useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  useComputedColorScheme,
} from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconChevronRight, IconFileText, IconPlayerPlay } from '@tabler/icons-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { JsonViewer } from '@/components/common/JsonViewer';
import { edgeJson } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type {
  DocumentRow,
  SchemaRow,
  TrackBArtifactRow,
  TrackBRunGetResponse,
  TrackBRunRow,
  TrackBWorkflowRow,
} from '@/lib/types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

ModuleRegistry.registerModules([AllCommunityModule]);

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type PreviewManifest = {
  status: 'ready' | 'unavailable';
  preview_type: 'source_pdf' | 'preview_pdf' | 'none';
  source_locator: string;
  source_type: string;
  preview_pdf_storage_key?: string;
  reason?: string;
};

type TrackBRunCreateResponse = {
  run_uid: string;
  status: string;
  accepted_count: number;
  rejected_count: number;
};

const RUN_STATUS_COLOR: Record<string, string> = {
  queued: 'gray',
  running: 'blue',
  partial_success: 'yellow',
  success: 'green',
  failed: 'red',
  cancelled: 'gray',
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function shortUid(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function TrackBWorkbench() {
  const { projectId } = useParams<{ projectId: string }>();
  const { ref: previewRef, width: previewWidth } = useElementSize();
  const { setCenter } = useHeaderCenter();
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = computedColorScheme === 'dark';

  const [projectName, setProjectName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [workflows, setWorkflows] = useState<TrackBWorkflowRow[]>([]);
  const [runs, setRuns] = useState<TrackBRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [flowMode, setFlowMode] = useState<'transform' | 'extract'>('transform');

  const [workflowUid, setWorkflowUid] = useState<string | null>(null);
  const [workflowTemplateKey, setWorkflowTemplateKey] = useState('track-b-default');
  const [userSchemaUid, setUserSchemaUid] = useState('');
  const [selectedSourceUids, setSelectedSourceUids] = useState<string[]>([]);
  const [creatingRun, setCreatingRun] = useState(false);

  const [selectedRunUid, setSelectedRunUid] = useState<string | null>(null);
  const [runData, setRunData] = useState<TrackBRunGetResponse | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);

  const [previewManifest, setPreviewManifest] = useState<PreviewManifest | null>(null);
  const [previewManifestError, setPreviewManifestError] = useState<string | null>(null);
  const [previewManifestLoading, setPreviewManifestLoading] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [resultMode, setResultMode] = useState<'formatted' | 'json'>('formatted');
  const [elementsPayload, setElementsPayload] = useState<unknown>(null);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [projectRes, docRes, schemaRes] = await Promise.all([
        supabase.from(TABLES.projects).select('project_id, project_name, workspace_id').eq('project_id', projectId).maybeSingle(),
        supabase.from(TABLES.documents).select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false }),
        supabase.from(TABLES.schemas).select('*').order('created_at', { ascending: false }),
      ]);
      if (projectRes.error) throw new Error(projectRes.error.message);
      if (!projectRes.data) throw new Error('Project not found');
      if (docRes.error) throw new Error(docRes.error.message);
      if (schemaRes.error) throw new Error(schemaRes.error.message);

      const projectRow = projectRes.data as { project_name: string; workspace_id: string | null };
      setProjectName(projectRow.project_name);
      setWorkspaceId(projectRow.workspace_id);
      setDocs((docRes.data ?? []) as DocumentRow[]);
      setSchemas((schemaRes.data ?? []) as SchemaRow[]);

      if (projectRow.workspace_id) {
        const [workflowRes, runRes] = await Promise.all([
          supabase
            .from('unstructured_workflows_v2')
            .select('workflow_uid, workspace_id, project_id, owner_id, name, is_active, workflow_spec_json, created_at, updated_at')
            .eq('workspace_id', projectRow.workspace_id)
            .eq('is_active', true)
            .order('updated_at', { ascending: false }),
          supabase
            .from('unstructured_workflow_runs_v2')
            .select('run_uid, workspace_id, project_id, workflow_uid, flow_mode, status, accepted_count, rejected_count, error, started_at, ended_at, created_at, updated_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        if (workflowRes.error) throw new Error(workflowRes.error.message);
        if (runRes.error) throw new Error(runRes.error.message);
        setWorkflows((workflowRes.data ?? []) as TrackBWorkflowRow[]);
        setRuns((runRes.data ?? []) as TrackBRunRow[]);
      } else {
        setWorkflows([]);
        setRuns([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    setWorkflowUid((current) => {
      if (current && workflows.some((workflow) => workflow.workflow_uid === current)) return current;
      return workflows[0]?.workflow_uid ?? null;
    });
  }, [workflows]);

  useEffect(() => {
    setSelectedSourceUids((prev) => prev.filter((uid) => docs.some((doc) => doc.source_uid === uid)));
  }, [docs]);

  useEffect(() => {
    setSelectedRunUid((current) => {
      if (current && runs.some((run) => run.run_uid === current)) return current;
      return runs[0]?.run_uid ?? null;
    });
  }, [runs]);

  const loadRun = useCallback(async (runUid: string | null) => {
    if (!workspaceId || !runUid) {
      setRunData(null);
      return;
    }
    setRunLoading(true);
    setRunError(null);
    try {
      const data = await edgeJson<TrackBRunGetResponse>(
        `track-b-runs?workspace_id=${encodeURIComponent(workspaceId)}&run_uid=${encodeURIComponent(runUid)}`,
        { method: 'GET' },
      );
      setRunData(data);
    } catch (e) {
      setRunData(null);
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadRun(selectedRunUid);
  }, [loadRun, selectedRunUid]);

  useEffect(() => {
    if (!runData || runData.docs.length === 0) {
      setSelectedSourceUid(null);
      return;
    }
    setSelectedSourceUid((current) => {
      if (current && runData.docs.some((doc) => doc.source_uid === current)) return current;
      return runData.docs[0].source_uid;
    });
  }, [runData]);

  const runOptions = useMemo(
    () => runs.map((run) => ({
      value: run.run_uid,
      label: `${shortUid(run.run_uid)} | ${run.status} | ${run.flow_mode}`,
    })),
    [runs],
  );

  const workflowOptions = useMemo(
    () => workflows.map((workflow) => ({ value: workflow.workflow_uid, label: workflow.name })),
    [workflows],
  );

  const schemaOptions = useMemo(
    () => schemas.map((schema) => ({ value: schema.schema_uid, label: schema.schema_ref })),
    [schemas],
  );

  const selectedArtifacts = useMemo<TrackBArtifactRow[]>(() => {
    if (!runData || !selectedSourceUid) return [];
    return runData.artifacts.filter((artifact) => artifact.source_uid === selectedSourceUid);
  }, [runData, selectedSourceUid]);

  const selectedRunDoc = useMemo(() => {
    if (!runData || !selectedSourceUid) return null;
    return runData.docs.find((doc) => doc.source_uid === selectedSourceUid) ?? null;
  }, [runData, selectedSourceUid]);

  const previewManifestArtifact = useMemo(() => {
    const matches = selectedArtifacts.filter((artifact) => artifact.artifact_type === 'preview_manifest_json');
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }, [selectedArtifacts]);

  const previewPdfArtifact = useMemo(() => {
    const matches = selectedArtifacts.filter((artifact) => artifact.artifact_type === 'preview_pdf');
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }, [selectedArtifacts]);

  const elementsArtifact = useMemo(() => {
    const matches = selectedArtifacts.filter((artifact) => artifact.artifact_type === 'elements_json');
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }, [selectedArtifacts]);

  useEffect(() => {
    setPdfPageNumber(1);
    setPdfPageCount(0);
  }, [selectedSourceUid]);

  useEffect(() => {
    if (!previewManifestArtifact?.signed_url) {
      setPreviewManifest(null);
      setPreviewManifestError(previewManifestArtifact?.signed_url_error ?? 'No preview manifest artifact available yet.');
      return;
    }
    let active = true;
    setPreviewManifestLoading(true);
    setPreviewManifestError(null);
    fetch(previewManifestArtifact.signed_url)
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`Manifest fetch failed: HTTP ${resp.status}`);
        const payload = await resp.json() as PreviewManifest;
        if (active) setPreviewManifest(payload);
      })
      .catch((e) => {
        if (active) setPreviewManifestError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setPreviewManifestLoading(false);
      });
    return () => {
      active = false;
    };
  }, [previewManifestArtifact]);

  useEffect(() => {
    if (!elementsArtifact?.signed_url) {
      setElementsPayload(null);
      setElementsError(elementsArtifact?.signed_url_error ?? 'No result artifact yet.');
      return;
    }
    let active = true;
    setElementsLoading(true);
    setElementsError(null);
    fetch(elementsArtifact.signed_url)
      .then(async (resp) => {
        if (!resp.ok) throw new Error(`Result fetch failed: HTTP ${resp.status}`);
        const payload = await resp.json();
        if (active) setElementsPayload(payload);
      })
      .catch((e) => {
        if (active) setElementsError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setElementsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [elementsArtifact]);

  const previewPdfFromManifest = useMemo(() => {
    const key = previewManifest?.preview_pdf_storage_key;
    if (!key) return null;
    return selectedArtifacts.find((artifact) => artifact.storage_key === key) ?? null;
  }, [previewManifest?.preview_pdf_storage_key, selectedArtifacts]);

  const pdfUrl = useMemo(() => {
    if (previewPdfFromManifest?.signed_url) return previewPdfFromManifest.signed_url;
    if (previewPdfArtifact?.signed_url) return previewPdfArtifact.signed_url;
    if (selectedRunDoc?.source_signed_url && previewManifest?.preview_type === 'source_pdf') return selectedRunDoc.source_signed_url;
    return null;
  }, [previewPdfArtifact, previewPdfFromManifest, previewManifest?.preview_type, selectedRunDoc?.source_signed_url]);

  const runDocStatus = selectedRunDoc?.status ?? 'no_doc';
  const pdfRenderWidth = Math.max(previewWidth - 12, 320);

  const formattedElements = useMemo(() => {
    if (!Array.isArray(elementsPayload)) return [];
    return elementsPayload
      .map((item) => (typeof item === 'object' && item ? item as Record<string, unknown> : null))
      .filter((item): item is Record<string, unknown> => !!item)
      .slice(0, 32);
  }, [elementsPayload]);

  const gridTheme = useMemo(() => themeQuartz.withParams({
    rowVerticalPaddingScale: 0.5,
    browserColorScheme: isDark ? 'dark' : 'light',
    backgroundColor: isDark ? '#09090b' : '#ffffff',
    chromeBackgroundColor: isDark ? '#09090b' : '#ffffff',
    foregroundColor: isDark ? '#fafafa' : '#09090b',
    borderColor: isDark ? '#27272a' : '#e4e4e7',
    subtleTextColor: isDark ? '#a1a1aa' : '#52525b',
  }), [isDark]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: false,
    filter: false,
  }), []);

  const formattedResultRows = useMemo(() => formattedElements.map((element, idx) => {
    const type = typeof element.raw_element_type === 'string' ? element.raw_element_type : 'Element';
    const text = typeof element.text === 'string' ? element.text : JSON.stringify(element);
    return {
      id: `${type}-${idx}`,
      type,
      text,
    };
  }), [formattedElements]);

  const handleToggleDoc = (sourceUid: string, checked: boolean) => {
    setSelectedSourceUids((prev) => {
      if (checked) {
        if (prev.includes(sourceUid)) return prev;
        return [...prev, sourceUid];
      }
      return prev.filter((id) => id !== sourceUid);
    });
  };

  const filesColumnDefs = useMemo<ColDef<DocumentRow>[]>(() => [
    {
      headerName: '',
      colId: 'selected',
      width: 46,
      minWidth: 46,
      maxWidth: 46,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const row = params.data;
        if (!row) return null;
        return (
          <Checkbox
            checked={selectedSourceUids.includes(row.source_uid)}
            onChange={(event) => handleToggleDoc(row.source_uid, event.currentTarget.checked)}
            onClick={(event) => event.stopPropagation()}
          />
        );
      },
    },
    {
      headerName: 'Document',
      field: 'doc_title',
      flex: 1.2,
      minWidth: 160,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => {
        const row = params.data;
        if (!row) return null;
        return (
          <Stack gap={0}>
            <Text size="xs" fw={600} truncate>{row.doc_title}</Text>
            <Text size="10px" c="dimmed">{shortUid(row.source_uid)} | {row.source_type}</Text>
          </Stack>
        );
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 100,
      minWidth: 100,
      cellRenderer: (params: ICellRendererParams<DocumentRow>) => (
        <Badge size="xs" variant="light">{String(params.data?.status ?? '')}</Badge>
      ),
    },
  ], [selectedSourceUids]);

  const handleFileRowClick = useCallback((event: RowClickedEvent<DocumentRow>) => {
    if (!event.data) return;
    setSelectedSourceUid(event.data.source_uid);
  }, []);

  const resultColumnDefs = useMemo<ColDef<{ id: string; type: string; text: string }>[]>(() => [
    {
      headerName: 'Type',
      field: 'type',
      width: 110,
      minWidth: 110,
    },
    {
      headerName: 'Text',
      field: 'text',
      flex: 1,
      minWidth: 180,
      cellRenderer: (params: ICellRendererParams<{ id: string; type: string; text: string }>) => (
        <Text size="xs" lineClamp={4}>{params.data?.text ?? ''}</Text>
      ),
    },
  ], []);

  const handleCreateRun = useCallback(async () => {
    if (!projectId || !workspaceId) {
      notifications.show({ color: 'yellow', title: 'Workspace required', message: 'Project workspace is required.' });
      return;
    }
    if (selectedSourceUids.length === 0) {
      notifications.show({ color: 'yellow', title: 'No files selected', message: 'Select one or more files in the left pane.' });
      return;
    }
    const workflowTemplate = workflowTemplateKey.trim();
    const selectedWorkflowUid = (workflowUid ?? '').trim();
    if (!selectedWorkflowUid && !workflowTemplate) {
      notifications.show({ color: 'yellow', title: 'Workflow required', message: 'Choose a saved workflow or provide template key.' });
      return;
    }
    const schemaUid = userSchemaUid.trim();
    if (flowMode === 'extract') {
      if (!schemaUid) {
        notifications.show({ color: 'yellow', title: 'Schema required', message: 'Extract requires user_schema_uid.' });
        return;
      }
      if (!isUuid(schemaUid)) {
        notifications.show({ color: 'yellow', title: 'Invalid schema UID', message: 'user_schema_uid must be a UUID.' });
        return;
      }
    }

    setCreatingRun(true);
    try {
      const idempotencyKey = `track-b:${projectId}:${Date.now()}:${crypto.randomUUID()}`;
      const payload: {
        workspace_id: string;
        project_id: string;
        flow_mode: 'transform' | 'extract';
        selected_source_uids: string[];
        workflow_uid?: string;
        workflow_template_key?: string;
        user_schema_uid?: string;
      } = {
        workspace_id: workspaceId,
        project_id: projectId,
        flow_mode: flowMode,
        selected_source_uids: selectedSourceUids,
      };
      if (selectedWorkflowUid) payload.workflow_uid = selectedWorkflowUid;
      else payload.workflow_template_key = workflowTemplate;
      if (flowMode === 'extract') payload.user_schema_uid = schemaUid;

      const response = await edgeJson<TrackBRunCreateResponse>('track-b-runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      notifications.show({
        color: 'green',
        title: 'Track B run started',
        message: `${shortUid(response.run_uid)} | accepted ${response.accepted_count}, rejected ${response.rejected_count}`,
      });
      await loadPage();
      setSelectedRunUid(response.run_uid);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      notifications.show({ color: 'red', title: 'Run failed', message: message.slice(0, 220) });
    } finally {
      setCreatingRun(false);
    }
  }, [flowMode, loadPage, projectId, selectedSourceUids, userSchemaUid, workflowTemplateKey, workflowUid, workspaceId]);

  const beginEditName = useCallback(() => {
    if (savingName) return;
    setEditName(projectName);
    setEditingName(true);
  }, [projectName, savingName]);

  const cancelEditName = useCallback(() => {
    setEditName(projectName);
    setEditingName(false);
  }, [projectName]);

  const saveProjectName = useCallback(async () => {
    if (!projectId) return;
    const next = editName.trim();
    if (!next) {
      notifications.show({ color: 'yellow', title: 'Name required', message: 'Project name cannot be empty.' });
      return;
    }
    setSavingName(true);
    const { error: err } = await supabase
      .from(TABLES.projects)
      .update({ project_name: next })
      .eq('project_id', projectId);
    setSavingName(false);
    if (err) {
      notifications.show({ color: 'red', title: 'Save failed', message: err.message });
      return;
    }
    setProjectName(next);
    setEditingName(false);
    notifications.show({ color: 'green', title: 'Saved', message: 'Project name updated' });
  }, [editName, projectId]);

  const onNameKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); void saveProjectName(); }
    if (event.key === 'Escape') { event.preventDefault(); cancelEditName(); }
  }, [cancelEditName, saveProjectName]);

  useEffect(() => {
    setCenter(
      <Group gap="sm" align="center" wrap="nowrap">
        {editingName ? (
          <TextInput
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            onKeyDown={onNameKeyDown}
            onBlur={cancelEditName}
            autoFocus
            disabled={savingName}
            size="xs"
            w={160}
          />
        ) : (
          <Text
            fw={600}
            size="sm"
            onDoubleClick={beginEditName}
            style={{ cursor: 'text', whiteSpace: 'nowrap' }}
          >
            {projectName || 'Project'}
          </Text>
        )}
        <SegmentedControl
          size="xs"
          value={flowMode}
          onChange={(value) => setFlowMode((value as 'transform' | 'extract') ?? 'transform')}
          data={[
            { label: 'Transform', value: 'transform' },
            { label: 'Extract', value: 'extract' },
          ]}
        />
        <Select
          value={workflowUid}
          data={workflowOptions}
          placeholder="Workflow"
          clearable
          searchable
          onChange={setWorkflowUid}
          size="xs"
          w={170}
        />
        <TextInput
          value={workflowTemplateKey}
          onChange={(e) => setWorkflowTemplateKey(e.currentTarget.value)}
          placeholder="Template key"
          disabled={!!workflowUid}
          size="xs"
          w={140}
        />
        {flowMode === 'extract' && (
          <Select
            value={schemaOptions.some((o) => o.value === userSchemaUid) ? userSchemaUid : null}
            data={schemaOptions}
            placeholder="Schema"
            searchable
            onChange={(v) => setUserSchemaUid(v ?? '')}
            size="xs"
            w={160}
          />
        )}
        {runs.length > 0 && (
          <Select
            value={selectedRunUid}
            data={runOptions}
            placeholder="Run"
            onChange={setSelectedRunUid}
            size="xs"
            w={200}
          />
        )}
        <Button
          size="compact-xs"
          leftSection={<IconPlayerPlay size={12} />}
          onClick={() => void handleCreateRun()}
          loading={creatingRun}
          disabled={!workspaceId || selectedSourceUids.length === 0}
        >
          {flowMode === 'extract' ? 'Run Schema' : 'Run'}
        </Button>
      </Group>,
    );
    return () => setCenter(null);
  }, [flowMode, setCenter, projectName, editingName, editName, savingName, workflowUid, workflowOptions, workflowTemplateKey, schemaOptions, userSchemaUid, runs, runOptions, selectedRunUid, creatingRun, workspaceId, selectedSourceUids, beginEditName, cancelEditName, onNameKeyDown, handleCreateRun]);

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 56px)',
        margin: 'calc(-1 * var(--mantine-spacing-md))',
      }}
    >
      {(error || runError) && (
        <div style={{ padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)' }}>
          {error && <ErrorAlert message={error} />}
          {runError && <ErrorAlert message={runError} />}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── Files column ── */}
        <div
          style={{
            width: 280,
            minWidth: 280,
            borderRight: '1px solid var(--mantine-color-default-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 12px 0' }}>
            <Group justify="space-between" mb={8}>
              <Group gap={6}>
                <IconFileText size={14} />
                <Text fw={600} size="sm">Files</Text>
              </Group>
            </Group>
            <Divider />
          </div>
          <div
            className="block-viewer-grid grid-font-medium grid-font-family-sans grid-valign-center"
            style={{ flex: 1, minHeight: 0, width: '100%' }}
          >
            <AgGridReact
              theme={gridTheme}
              rowData={docs}
              columnDefs={filesColumnDefs}
              defaultColDef={defaultColDef}
              getRowId={(params) => params.data.source_uid}
              onRowClicked={handleFileRowClick}
              rowHeight={54}
              headerHeight={36}
              animateRows={false}
              domLayout="normal"
              getRowStyle={(params) => (
                params.data?.source_uid === selectedSourceUid
                  ? { backgroundColor: 'var(--mantine-color-blue-light)' }
                  : undefined
              )}
              overlayNoRowsTemplate='<span style="color: var(--mantine-color-dimmed);">No files in this project.</span>'
            />
          </div>
        </div>

        {/* ── Preview column ── */}
        <div
          style={{
            flex: 1,
            borderRight: '1px solid var(--mantine-color-default-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 12px 0' }}>
            <Group justify="space-between" mb={8}>
              <Text fw={600} size="sm">Preview</Text>
              <Group gap="xs">
                {selectedRunUid && (
                  <Badge size="sm" variant="light" color={RUN_STATUS_COLOR[runs.find((r) => r.run_uid === selectedRunUid)?.status ?? 'queued'] ?? 'gray'}>
                    {runs.find((r) => r.run_uid === selectedRunUid)?.status ?? 'queued'}
                  </Badge>
                )}
                <Badge size="sm" variant="light">{runDocStatus}</Badge>
              </Group>
            </Group>
            <Divider />
          </div>
          <ScrollArea style={{ flex: 1 }} p="xs">
            <div ref={previewRef}>
              {runLoading && <Center py="xl"><Loader size="sm" /></Center>}
              {!runLoading && previewManifestLoading && <Center py="xl"><Loader size="sm" /></Center>}
              {!runLoading && !previewManifestLoading && pdfUrl && (
                <Stack gap="sm" align="center" style={{ background: 'var(--mantine-color-default)', borderRadius: 8, padding: 10 }}>
                  <Document
                    file={pdfUrl}
                    loading={<Loader size="sm" />}
                    onLoadSuccess={({ numPages }) => {
                      setPdfPageCount(numPages);
                      setPdfPageNumber((p) => Math.min(Math.max(1, p), numPages));
                    }}
                    onLoadError={(e) => setPreviewManifestError(e.message)}
                  >
                    <Page pageNumber={pdfPageNumber} width={pdfRenderWidth} />
                  </Document>
                  <Group gap="xs">
                    <Button
                      size="compact-xs"
                      variant="light"
                      leftSection={<IconChevronLeft size={14} />}
                      disabled={pdfPageNumber <= 1}
                      onClick={() => setPdfPageNumber((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Text size="sm">Page {pdfPageNumber} of {pdfPageCount || 1}</Text>
                    <Button
                      size="compact-xs"
                      variant="light"
                      rightSection={<IconChevronRight size={14} />}
                      disabled={pdfPageNumber >= pdfPageCount}
                      onClick={() => setPdfPageNumber((p) => Math.min(pdfPageCount, p + 1))}
                    >
                      Next
                    </Button>
                  </Group>
                </Stack>
              )}
              {!runLoading && !previewManifestLoading && !pdfUrl && (
                <Center py="xl">
                  <Stack gap={4} align="center">
                    <Text size="sm" c="dimmed">Select/run files to see visual preview.</Text>
                    <Text size="xs" c="dimmed" ta="center" maw={420}>
                      {previewManifestError ?? 'Preview artifact not available yet for this file/run.'}
                    </Text>
                  </Stack>
                </Center>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Result column ── */}
        <div
          style={{
            width: 320,
            minWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 12px 0' }}>
            <Group justify="space-between" mb={8}>
              <Text fw={600} size="sm">Result</Text>
            </Group>
            <Divider mb={8} />
            <SegmentedControl
              value={resultMode}
              onChange={(value) => setResultMode((value as 'formatted' | 'json') ?? 'formatted')}
              data={[
                { label: 'Formatted', value: 'formatted' },
                { label: 'JSON', value: 'json' },
              ]}
              size="xs"
              fullWidth
              mb={8}
            />
          </div>
          {elementsLoading && <Center py="lg"><Loader size="sm" /></Center>}
          {!elementsLoading && resultMode === 'formatted' && (
            <div
              className="block-viewer-grid grid-font-medium grid-font-family-sans grid-valign-center"
              style={{ flex: 1, minHeight: 0, width: '100%' }}
            >
              <AgGridReact
                theme={gridTheme}
                rowData={formattedResultRows}
                columnDefs={resultColumnDefs}
                defaultColDef={defaultColDef}
                getRowId={(params) => params.data.id}
                rowHeight={54}
                headerHeight={36}
                animateRows={false}
                domLayout="normal"
                overlayNoRowsTemplate={`<span style="color: var(--mantine-color-dimmed);">${elementsError ?? 'No parsed result yet.'}</span>`}
              />
            </div>
          )}
          {!elementsLoading && resultMode === 'json' && (
            <ScrollArea style={{ flex: 1 }} p="xs">
              <JsonViewer value={elementsPayload ?? { error: elementsError ?? 'No result payload loaded.' }} maxHeight={600} />
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
