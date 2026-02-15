import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Center,
  Checkbox,
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
import { IconChevronLeft, IconChevronRight, IconFileText, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { CopyUid } from '@/components/common/CopyUid';
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
  status: 'pending' | 'ready' | 'failed';
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

const LAYOUT_STORAGE_KEY = 'track-b-workbench-panel-layout-v1';
const RESIZE_HANDLE_WIDTH = 10;
const FILES_PANE_WIDTH = 300;
const RESULT_MIN_WIDTH = 280;
const PREVIEW_MIN_WIDTH = 360;
const RESULT_MAX_WIDTH_RATIO = 0.45;

type ResizeTarget = 'result';

type ResizeDragState = {
  target: ResizeTarget;
  startX: number;
  startResultWidth: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isSchemaUid(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

function shortUid(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function TrackBWorkbench() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { ref: previewRef, width: previewWidth } = useElementSize();
  const { ref: layoutRef, width: layoutWidth } = useElementSize();
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
  const [resultPaneWidth, setResultPaneWidth] = useState(320);
  const resizeDragRef = useRef<ResizeDragState | null>(null);

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
            .select('run_uid, workspace_id, project_id, workflow_uid, workflow_template_key, user_schema_uid, flow_mode, status, accepted_count, rejected_count, error, started_at, ended_at, created_at, updated_at')
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
    const path = location.pathname.toLowerCase();
    if (path.endsWith('/extract')) {
      setFlowMode('extract');
      return;
    }
    if (path.endsWith('/transform')) {
      setFlowMode('transform');
    }
  }, [location.pathname]);

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

  useEffect(() => {
    if (!runData || runData.docs.length === 0 || !selectedSourceUid) return;
    if (runData.docs.some((doc) => doc.source_uid === selectedSourceUid)) return;
    setSelectedSourceUid(runData.docs[0].source_uid);
  }, [runData, selectedSourceUid]);

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
    resizable: false,
    suppressMovable: true,
    sortable: false,
    filter: false,
  }), []);

  const formattedResultRows = useMemo(() => formattedElements.map((element, idx) => {
    const text = typeof element.text === 'string' ? element.text : JSON.stringify(element);
    return {
      id: String(idx),
      text,
    };
  }), [formattedElements]);

  const getMaxResultWidth = useCallback((totalWidth: number) => {
    const maxByAvailableSpace = totalWidth - FILES_PANE_WIDTH - RESIZE_HANDLE_WIDTH - PREVIEW_MIN_WIDTH;
    const maxByRatio = Math.floor(totalWidth * RESULT_MAX_WIDTH_RATIO);
    return Math.max(0, Math.min(maxByAvailableSpace, maxByRatio));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { resultPaneWidth?: number };
      if (typeof parsed.resultPaneWidth === 'number') setResultPaneWidth(Math.round(parsed.resultPaneWidth));
    } catch {
      // Ignore malformed localStorage values.
    }
  }, []);

  useEffect(() => {
    if (layoutWidth <= 0) return;
    const maxResultWidth = getMaxResultWidth(layoutWidth);
    const minResultWidth = Math.min(RESULT_MIN_WIDTH, maxResultWidth);
    setResultPaneWidth((prev) => clamp(prev, minResultWidth, maxResultWidth));
  }, [getMaxResultWidth, layoutWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ resultPaneWidth }),
    );
  }, [resultPaneWidth]);

  const handleResizeStart = useCallback(
    (target: ResizeTarget) => (event: ReactMouseEvent<HTMLDivElement>) => {
      if (layoutWidth <= 0) return;
      event.preventDefault();
      resizeDragRef.current = {
        target,
        startX: event.clientX,
        startResultWidth: resultPaneWidth,
      };
    },
    [layoutWidth, resultPaneWidth],
  );

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = resizeDragRef.current;
      if (!drag || layoutWidth <= 0) return;
      const delta = event.clientX - drag.startX;
      const maxResultWidth = getMaxResultWidth(layoutWidth);
      const minResultWidth = Math.min(RESULT_MIN_WIDTH, maxResultWidth);
      setResultPaneWidth(clamp(drag.startResultWidth - delta, minResultWidth, maxResultWidth));
    };

    const onMouseUp = () => {
      resizeDragRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [getMaxResultWidth, layoutWidth]);

  const handleToggleDoc = (sourceUid: string, checked: boolean) => {
    setSelectedSourceUids((prev) => {
      if (checked) {
        if (prev.includes(sourceUid)) return prev;
        return [...prev, sourceUid];
      }
      return prev.filter((id) => id !== sourceUid);
    });
  };

  const resultColumnDefs = useMemo<ColDef<{ id: string; text: string }>[]>(() => [
    {
      headerName: '',
      field: 'text',
      flex: 1,
      minWidth: 180,
      cellRenderer: (params: ICellRendererParams<{ id: string; text: string }>) => (
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
      if (!isSchemaUid(schemaUid)) {
        notifications.show({ color: 'yellow', title: 'Invalid schema UID', message: 'user_schema_uid must be a 64-char hex schema_uid.' });
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
          onChange={(value) => {
            const next = (value as 'transform' | 'extract') ?? 'transform';
            setFlowMode(next);
            if (projectId) navigate(`/app/projects/${projectId}/track-b/${next}`, { replace: true });
          }}
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
  }, [flowMode, setCenter, projectName, editingName, editName, savingName, workflowUid, workflowOptions, workflowTemplateKey, schemaOptions, userSchemaUid, runs, runOptions, selectedRunUid, creatingRun, workspaceId, selectedSourceUids, beginEditName, cancelEditName, onNameKeyDown, handleCreateRun, navigate, projectId]);

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
        ref={layoutRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `${FILES_PANE_WIDTH}px minmax(${PREVIEW_MIN_WIDTH}px, 1fr) ${RESIZE_HANDLE_WIDTH}px ${resultPaneWidth}px`,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── Files column ── */}
        <div
          style={{
            borderRight: '1px solid var(--mantine-color-default-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 44, padding: '0 12px', borderBottom: '1px solid var(--mantine-color-default-border)', display: 'flex', alignItems: 'center' }}>
            <Group justify="space-between" style={{ width: '100%' }}>
              <Group gap={6}>
                <IconFileText size={14} />
                <Text fw={600} size="sm">Files</Text>
              </Group>
            </Group>
          </div>
          <div style={{ padding: '10px 10px 0' }}>
            <Button
              fullWidth
              size="xs"
              variant="default"
              rightSection={<IconPlus size={12} />}
              onClick={() => notifications.show({
                color: 'yellow',
                title: 'Use Project Upload Flow',
                message: 'Use the project upload flow to add files.',
              })}
            >
              Add new file
            </Button>
          </div>
          <ScrollArea style={{ flex: 1, minHeight: 0 }} p="xs">
            <Stack gap={6}>
              {docs.length === 0 && (
                <Text size="xs" c="dimmed">No files in this project.</Text>
              )}
              {docs.map((doc) => {
                const isSelected = selectedSourceUid === doc.source_uid;
                return (
                  <div
                    key={doc.source_uid}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSourceUid(doc.source_uid)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedSourceUid(doc.source_uid);
                      }
                    }}
                    style={{
                      width: '100%',
                      border: '1px solid var(--mantine-color-default-border)',
                      background: isSelected ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-body)',
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 4,
                      boxSizing: 'border-box',
                    }}
                  >
                    <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                      <Checkbox
                        checked={selectedSourceUids.includes(doc.source_uid)}
                        onChange={(event) => handleToggleDoc(doc.source_uid, event.currentTarget.checked)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" fw={600} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.doc_title}
                        </Text>
                        <CopyUid value={doc.source_uid} display={shortUid(doc.source_uid)} size="10px" />
                      </Stack>
                      <Badge size="xs" variant="light">
                        {String(doc.source_type || '').toUpperCase()}
                      </Badge>
                    </Group>
                  </div>
                );
              })}
            </Stack>
          </ScrollArea>
        </div>

        {/* ── Preview column ── */}
        <div
          style={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 44, padding: '0 12px', borderBottom: '1px solid var(--mantine-color-default-border)', display: 'flex', alignItems: 'center' }}>
            <Group justify="space-between" style={{ width: '100%' }}>
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
          </div>
          <ScrollArea style={{ flex: 1 }} p="xs">
            <div ref={previewRef}>
              {runLoading && <Center py="xl"><Loader size="sm" /></Center>}
              {!runLoading && previewManifestLoading && <Center py="xl"><Loader size="sm" /></Center>}
              {!runLoading && !previewManifestLoading && pdfUrl && (
                <Stack gap="sm" align="center" style={{ background: 'var(--mantine-color-default)', padding: 10 }}>
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
          role="separator"
          aria-label="Resize result panel"
          aria-orientation="vertical"
          onMouseDown={handleResizeStart('result')}
          style={{
            cursor: 'col-resize',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            background: 'transparent',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 1,
              height: '100%',
              background: 'var(--mantine-color-default-border)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 43,
              borderTop: '1px solid var(--mantine-color-default-border)',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 44, padding: '0 12px', borderBottom: '1px solid var(--mantine-color-default-border)', display: 'flex', alignItems: 'center' }}>
            <Group justify="space-between" align="center" style={{ width: '100%' }}>
              <Text fw={600} size="sm">Result</Text>
              <Group gap="sm">
                <Text
                  size="xs"
                  c={resultMode === 'formatted' ? 'blue' : 'dimmed'}
                  td="underline"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setResultMode('formatted')}
                >
                  Formatted
                </Text>
                <Text
                  size="xs"
                  c={resultMode === 'json' ? 'blue' : 'dimmed'}
                  td="underline"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setResultMode('json')}
                >
                  JSON
                </Text>
              </Group>
            </Group>
          </div>
          {elementsLoading && <Center py="lg"><Loader size="sm" /></Center>}
          {!elementsLoading && resultMode === 'formatted' && (
            <div
              className="block-viewer-grid trackb-flat-grid grid-font-medium grid-font-family-sans grid-valign-center"
              style={{ flex: 1, minHeight: 0, width: '100%' }}
            >
              <AgGridReact
                theme={gridTheme}
                rowData={formattedResultRows}
                columnDefs={resultColumnDefs}
                defaultColDef={defaultColDef}
                getRowId={(params) => params.data.id}
                rowHeight={54}
                headerHeight={0}
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
