import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useParams } from 'react-router-dom';
import { useLocalStorage } from '@mantine/hooks';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  Pagination,
  Radio,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Textarea,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconChevronLeft,
  IconChevronRight,
  IconCirclePlus,
  IconCode,
  IconDeviceFloppy,
  IconDotsVertical,
  IconDownload,
  IconFileText,
  IconInfoCircle,
  IconPencil,
  IconPlayerPlay,
  IconTable,
  IconTrash,
} from '@tabler/icons-react';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PdfResultsHighlighter, type ParsedResultBlock } from '@/components/documents/PdfResultsHighlighter';
import { PptxPreview } from '@/components/documents/PptxPreview';
import { ProjectParseUppyUploader, type UploadBatchResult } from '@/components/documents/ProjectParseUppyUploader';
import { BlockViewerGrid } from '@/components/blocks/BlockViewerGrid';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useRuns } from '@/hooks/useRuns';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { DocumentRow, ProjectRow } from '@/lib/types';

const PAGE_SIZE = 10;
const EXPLORER_WIDTH_DEFAULT = 500;
const EXPLORER_WIDTH_MIN = 500;
const EXPLORER_WIDTH_MAX = 500;
const EXPLORER_WIDTH_COLLAPSED = 56;
const CONFIG_WIDTH_DEFAULT = 450;
const CONFIG_WIDTH_MIN = 450;
const CONFIG_WIDTH_MAX = 450;
const CONFIG_WIDTH_COLLAPSED = 56;
const TRANSFORM_TEST_CONFIG_WIDTH_MIN = 300;
const TRANSFORM_TEST_CONFIG_WIDTH_MAX = 760;
const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

const TEXT_SOURCE_TYPES = new Set([
  'md',
  'txt',
  'csv',
  'html',
  'asciidoc',
  'xml_uspto',
  'xml_jats',
  'json_docling',
  'rst',
  'latex',
  'org',
  'vtt',
]);
const IMAGE_SOURCE_TYPES = new Set(['image']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff']);
const DOCX_SOURCE_TYPES = new Set([
  'docx',
  'docm',
  'dotx',
  'dotm',
]);
const DOCX_EXTENSIONS = new Set([
  'docx',
  'docm',
  'dotx',
  'dotm',
]);
const PPTX_SOURCE_TYPES = new Set(['pptx', 'pptm', 'ppsx']);
const PPTX_EXTENSIONS = new Set(['pptx', 'pptm', 'ppsx']);

type ProjectDocumentRow = DocumentRow & {
  source_locator?: string | null;
  conv_locator?: string | null;
};

type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'docx' | 'pptx' | 'file';
type ProjectDetailMode = 'parse' | 'extract' | 'transform';
type ProjectDetailSurface = 'default' | 'test';
type MiddlePreviewTab = 'preview' | 'results';
type TestRightTab = 'preview' | 'metadata' | 'blocks';
type ParseConfigView = 'Basic' | 'Advanced';
type ExtractConfigView = 'Basic' | 'Advanced' | 'Schema';
type ExtractSchemaMode = 'table' | 'code';
type ConfigCollapseState = 'full' | 'half' | 'collapsed';
type ExtractSchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array:string'
  | 'array:number'
  | 'array:boolean'
  | 'array:object';
type ExtractSchemaField = {
  id: string;
  name: string;
  type: ExtractSchemaFieldType;
  description: string;
  required: boolean;
};
type ProjectDetailProps = {
  mode?: ProjectDetailMode;
  surface?: ProjectDetailSurface;
};

type TestBlockCardRow = {
  blockUid: string;
  blockIndex: number;
  blockType: string;
  snippet: string;
};

const EXTRACT_SCHEMA_TYPE_OPTIONS: Array<{ value: ExtractSchemaFieldType; label: string }> = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'boolean', label: 'boolean' },
  { value: 'object', label: 'object' },
  { value: 'array:string', label: 'array > string' },
  { value: 'array:number', label: 'array > number' },
  { value: 'array:boolean', label: 'array > boolean' },
  { value: 'array:object', label: 'array > object' },
];

const DOC_STATUS_META: Record<ProjectDocumentRow['status'], { label: string; tone: 'yellow' | 'green' | 'red' }> = {
  uploaded: { label: 'Uploaded', tone: 'green' },
  converting: { label: 'In progress', tone: 'yellow' },
  ingested: { label: 'Uploaded', tone: 'green' },
  conversion_failed: { label: 'Failed', tone: 'red' },
  ingest_failed: { label: 'Failed', tone: 'red' },
} as const;

type SignedUrlResult = {
  url: string | null;
  error: string | null;
};

async function createSignedUrlForLocator(locator: string | null | undefined): Promise<SignedUrlResult> {
  const normalized = locator?.trim();
  if (!normalized) {
    return { url: null, error: 'No file locator was found.' };
  }

  const sourceKey = normalized.replace(/^\/+/, '');
  const { data, error: signedUrlError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(sourceKey, 60 * 20);

  if (signedUrlError) {
    return { url: null, error: signedUrlError.message };
  }
  if (!data?.signedUrl) {
    return { url: null, error: 'Storage did not return a signed URL.' };
  }
  return { url: data.signedUrl, error: null };
}

async function resolveSignedUrlForLocators(locators: Array<string | null | undefined>): Promise<SignedUrlResult> {
  const errors: string[] = [];
  for (const locator of locators) {
    if (!locator?.trim()) continue;
    const result = await createSignedUrlForLocator(locator);
    if (result.url) return result;
    if (result.error) errors.push(result.error);
  }
  return {
    url: null,
    error: errors[0] ?? 'No previewable file was available for this document.',
  };
}

function toDoclingJsonLocator(locator: string | null | undefined): string | null {
  const normalized = locator?.trim();
  if (!normalized) return null;
  if (normalized.toLowerCase().endsWith('.docling.json')) return normalized;

  const lastSlash = normalized.lastIndexOf('/');
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : '';
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const lastDot = filename.lastIndexOf('.');
  const basename = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  if (!basename) return null;
  return `${dir}${basename}.docling.json`;
}

function dedupeLocators(locators: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const locator of locators) {
    const value = locator?.trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function sortDocumentsByUploadedAt(rows: ProjectDocumentRow[]) {
  return [...rows].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
}

function formatBytes(bytes: number | null | undefined): string {
  const value = typeof bytes === 'number' ? bytes : 0;
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const rounded = size >= 10 || index === 0 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[index]}`;
}

function getExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index < 0 || index === name.length - 1) return '';
  return name.slice(index + 1).toLowerCase();
}

function getSourceLocatorExtension(doc: ProjectDocumentRow): string {
  return getExtension(doc.source_locator ?? '');
}

function isPdfDocument(doc: ProjectDocumentRow): boolean {
  if (doc.source_type.toLowerCase() === 'pdf') return true;
  return getSourceLocatorExtension(doc) === 'pdf';
}

function isImageDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (IMAGE_SOURCE_TYPES.has(sourceType)) return true;
  return IMAGE_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function isTextDocument(doc: ProjectDocumentRow): boolean {
  return TEXT_SOURCE_TYPES.has(doc.source_type.toLowerCase());
}

function isDocxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (DOCX_SOURCE_TYPES.has(sourceType)) return true;
  return DOCX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function isPptxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (PPTX_SOURCE_TYPES.has(sourceType)) return true;
  return PPTX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function getDocumentFormat(doc: ProjectDocumentRow): string {
  const type = typeof doc.source_type === 'string' ? doc.source_type.trim() : '';
  if (type.length > 0) return type.toUpperCase();
  const extension = getExtension(doc.source_locator ?? '');
  if (extension) return extension.toUpperCase();
  return '--';
}

export default function ProjectDetail({ mode = 'parse', surface = 'default' }: ProjectDetailProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const isExtractMode = mode === 'extract';
  const isTransformMode = mode === 'transform';
  const isTestSurfacePage = surface === 'test';
  const isTransformTestSurface = isTransformMode && isTestSurfacePage;

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);
  const [selectedSourceUids, setSelectedSourceUids] = useState<string[]>([]);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<ProjectDocumentRow | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  const [previewKind, setPreviewKind] = useState<PreviewKind>('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [resultsDoclingJsonUrl, setResultsDoclingJsonUrl] = useState<string | null>(null);
  const [resultsDoclingLoading, setResultsDoclingLoading] = useState(false);
  const [resultsDoclingError, setResultsDoclingError] = useState<string | null>(null);
  const [resultsBlocks, setResultsBlocks] = useState<ParsedResultBlock[]>([]);
  const [showAllBboxes, setShowAllBboxes] = useState(true);
  const [showMetadataBlocksPanel, setShowMetadataBlocksPanel] = useState(true);
  const [middlePreviewTab, setMiddlePreviewTab] = useState<MiddlePreviewTab>('preview');
  const [testRightTab, setTestRightTab] = useState<TestRightTab>('preview');
  const [testBlocksToolbarHost, setTestBlocksToolbarHost] = useState<HTMLDivElement | null>(null);
  const [testBlocks, setTestBlocks] = useState<TestBlockCardRow[]>([]);
  const [testBlocksLoading, setTestBlocksLoading] = useState(false);
  const [testBlocksError, setTestBlocksError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [parseConfigView, setParseConfigView] = useState<ParseConfigView>('Basic');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [extractConfigView, setExtractConfigView] = useState<ExtractConfigView>('Advanced');
  const [extractSchemaMode, setExtractSchemaMode] = useState<ExtractSchemaMode>('table');
  const [extractSchemaReady, setExtractSchemaReady] = useState(false);
  const [extractSchemaFields, setExtractSchemaFields] = useState<ExtractSchemaField[]>([]);
  const [extractSchemaDraft, setExtractSchemaDraft] = useState('');

  const [explorerWidth, setExplorerWidth] = useState(EXPLORER_WIDTH_DEFAULT);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [configWidth, setConfigWidth] = useState(CONFIG_WIDTH_DEFAULT);
  const [configCollapseState, setConfigCollapseState] = useState<ConfigCollapseState>('full');
  const [activeResizer, setActiveResizer] = useState<'explorer' | 'config' | null>(null);
  const [desktopNavOpened] = useLocalStorage<boolean>({
    key: 'blockdata.shell.nav_open_desktop',
    defaultValue: true,
  });
  const isConfigCollapsed = isTestSurfacePage && configCollapseState === 'collapsed';
  const isConfigHalf = isTransformTestSurface && configCollapseState === 'half';

  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const pendingUploadedSelectionRef = useRef<string[] | null>(null);
  const selectNewestAfterUploadRef = useRef(false);

  const createSchemaField = useCallback((seed?: Partial<ExtractSchemaField>): ExtractSchemaField => (
    {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: seed?.name ?? '',
      type: seed?.type ?? 'string',
      description: seed?.description ?? '',
      required: seed?.required ?? true,
    }
  ), []);

  const updateExtractSchemaField = useCallback((id: string, patch: Partial<ExtractSchemaField>) => {
    setExtractSchemaFields((prev) => prev.map((field) => (
      field.id === id ? { ...field, ...patch } : field
    )));
  }, []);

  const addExtractSchemaField = useCallback((afterFieldId?: string) => {
    setExtractSchemaFields((prev) => {
      const nextField = createSchemaField();
      if (!afterFieldId) return [...prev, nextField];
      const index = prev.findIndex((field) => field.id === afterFieldId);
      if (index < 0) return [...prev, nextField];
      return [...prev.slice(0, index + 1), nextField, ...prev.slice(index + 1)];
    });
  }, [createSchemaField]);

  const removeExtractSchemaField = useCallback((id: string) => {
    setExtractSchemaFields((prev) => prev.filter((field) => field.id !== id));
  }, []);

  const initializeManualSchema = useCallback(() => {
    setExtractSchemaReady(true);
    setExtractSchemaMode('table');
    setExtractSchemaFields([createSchemaField({ name: '', type: 'string', description: '', required: true })]);
  }, [createSchemaField]);

  const initializeAutoSchema = useCallback(() => {
    setExtractSchemaReady(true);
    setExtractSchemaMode('table');
    setExtractSchemaFields([
      createSchemaField({ name: 'invoice', type: 'string', description: 'Invoice identifier', required: true }),
      createSchemaField({ name: 'total_amount', type: 'number', description: 'Total billed amount', required: true }),
      createSchemaField({ name: 'due_date', type: 'string', description: 'Payment due date', required: false }),
    ]);
  }, [createSchemaField]);

  const clearExtractSchema = useCallback(() => {
    setExtractSchemaReady(false);
    setExtractSchemaFields([]);
    setExtractSchemaDraft('');
    setExtractSchemaMode('table');
  }, []);

  const extractSchemaPreviewJson = useMemo(() => {
    const properties = extractSchemaFields.reduce<Record<string, unknown>>((acc, field) => {
      const key = field.name.trim();
      if (!key) return acc;
      if (field.type.startsWith('array:')) {
        const itemType = field.type.replace('array:', '') as 'string' | 'number' | 'boolean' | 'object';
        acc[key] = {
          type: 'array',
          items: { type: itemType },
          description: field.description.trim() || undefined,
        };
        return acc;
      }
      acc[key] = {
        type: field.type,
        description: field.description.trim() || undefined,
      };
      return acc;
    }, {});

    const required = extractSchemaFields
      .filter((field) => field.required && field.name.trim().length > 0)
      .map((field) => field.name.trim());

    return JSON.stringify({
      type: 'object',
      properties,
      required,
    }, null, 2);
  }, [extractSchemaFields]);

  const load = useCallback(async () => {
    if (!projectId) return;

    setError(null);
    setLoading(true);

    const [projectResult, docsResult] = await Promise.all([
      supabase.from(TABLES.projects).select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from(TABLES.documents).select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false }),
    ]);

    if (projectResult.error) {
      setError(projectResult.error.message);
      setLoading(false);
      return;
    }
    if (docsResult.error) {
      setError(docsResult.error.message);
      setLoading(false);
      return;
    }
    if (!projectResult.data) {
      setError('Project not found');
      setLoading(false);
      return;
    }

    setProject(projectResult.data as ProjectRow);
    setDocs(sortDocumentsByUploadedAt((docsResult.data ?? []) as ProjectDocumentRow[]));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project-documents-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.sourceDocuments,
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, projectId]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(docs.length / PAGE_SIZE));
    setPage((current) => Math.min(current, totalPages));

    const pendingUploadedSelection = pendingUploadedSelectionRef.current;
    if (pendingUploadedSelection && pendingUploadedSelection.length > 0) {
      const nextSelectedSourceUid = pendingUploadedSelection.find((sourceUid) => (
        docs.some((doc) => doc.source_uid === sourceUid)
      ));
      if (nextSelectedSourceUid) {
        pendingUploadedSelectionRef.current = null;
        selectNewestAfterUploadRef.current = false;
        setSelectedSourceUid(nextSelectedSourceUid);
        return;
      }
    }

    if (selectNewestAfterUploadRef.current && docs.length > 0) {
      pendingUploadedSelectionRef.current = null;
      selectNewestAfterUploadRef.current = false;
      setSelectedSourceUid(docs[0].source_uid);
      return;
    }

    const exists = selectedSourceUid ? docs.some((doc) => doc.source_uid === selectedSourceUid) : false;
    if (!exists) {
      setSelectedSourceUid(docs[0]?.source_uid ?? null);
    }
  }, [docs, selectedSourceUid]);

  useEffect(() => {
    setSelectedSourceUids((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set(docs.map((doc) => doc.source_uid));
      const next = prev.filter((sourceUid) => valid.has(sourceUid));
      return next.length === prev.length ? prev : next;
    });
  }, [docs]);


  const totalPages = useMemo(() => Math.max(1, Math.ceil(docs.length / PAGE_SIZE)), [docs.length]);
  const pagedDocs = useMemo(() => {
    const offset = (page - 1) * PAGE_SIZE;
    return docs.slice(offset, offset + PAGE_SIZE);
  }, [docs, page]);
  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.source_uid === selectedSourceUid) ?? null,
    [docs, selectedSourceUid],
  );
  const { runs: selectedDocRuns } = useRuns(selectedDoc?.conv_uid ?? null);
  useEffect(() => {
    if (selectedDocRuns.length === 0) {
      setSelectedRunId(null);
      return;
    }
    setSelectedRunId((current) => {
      if (current && selectedDocRuns.some((run) => run.run_id === current)) return current;
      return selectedDocRuns[0].run_id;
    });
  }, [selectedDocRuns]);
  const selectedRun = useMemo(
    () => selectedDocRuns.find((run) => run.run_id === selectedRunId) ?? null,
    [selectedDocRuns, selectedRunId],
  );
  const selectedSourceUidSet = useMemo(() => new Set(selectedSourceUids), [selectedSourceUids]);
  const allPagedSelected = useMemo(
    () => pagedDocs.length > 0 && pagedDocs.every((doc) => selectedSourceUidSet.has(doc.source_uid)),
    [pagedDocs, selectedSourceUidSet],
  );
  const somePagedSelected = useMemo(
    () => !allPagedSelected && pagedDocs.some((doc) => selectedSourceUidSet.has(doc.source_uid)),
    [allPagedSelected, pagedDocs, selectedSourceUidSet],
  );
  const docSelectorCheckboxStyles = useMemo(() => ({
    input: {
      borderRadius: 4,
      width: '14px',
      height: '14px',
      backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-gray-7))',
      borderColor: 'light-dark(var(--mantine-color-gray-4), var(--mantine-color-gray-6))',
      '&[data-checked], &[data-indeterminate]': {
        backgroundColor: 'light-dark(var(--mantine-color-gray-5), var(--mantine-color-gray-4))',
        borderColor: 'light-dark(var(--mantine-color-gray-5), var(--mantine-color-gray-4))',
      },
    },
    icon: { color: 'var(--mantine-color-white)' },
  }), []);

  const handleBatchUploaded = useCallback((result: UploadBatchResult) => {
    const uploadedSourceUids = result.uploadedSourceUids.filter((sourceUid) => sourceUid.length > 0);
    pendingUploadedSelectionRef.current = uploadedSourceUids.length > 0 ? uploadedSourceUids : null;
    selectNewestAfterUploadRef.current = true;
    setPage(1);
    void load();
  }, [load]);

  const handleRunParse = useCallback(async () => {
    // Parse all checked documents, or the currently viewed document if none checked.
    const targets = selectedSourceUids.length > 0
      ? selectedSourceUids
      : selectedSourceUid ? [selectedSourceUid] : [];
    if (targets.length === 0) return;

    setParseLoading(true);
    setParseError(null);
    try {
      for (const uid of targets) {
        await edgeJson('trigger-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_uid: uid }),
        });
      }
      void load();
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
    } finally {
      setParseLoading(false);
    }
  }, [selectedSourceUids, selectedSourceUid, load]);

  const toggleDocSelection = useCallback((sourceUid: string, checked: boolean) => {
    setSelectedSourceUids((prev) => {
      if (checked) {
        if (prev.includes(sourceUid)) return prev;
        return [...prev, sourceUid];
      }
      return prev.filter((value) => value !== sourceUid);
    });
  }, []);
  const toggleAllPagedDocSelection = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedSourceUids([]);
      return;
    }
    setSelectedSourceUids(pagedDocs.map((doc) => doc.source_uid));
  }, [pagedDocs]);

  const closeDeleteDialog = useCallback(() => {
    if (deletingDoc) return;
    setDeleteTargetDoc(null);
  }, [deletingDoc]);

  const handleConfirmDeleteDocument = useCallback(async () => {
    if (!deleteTargetDoc || deletingDoc) return;
    setDeletingDoc(true);
    try {
      const sourceUid = deleteTargetDoc.source_uid;
      const { error: deleteError } = await supabase.rpc('delete_document', { p_source_uid: sourceUid });
      if (deleteError) throw new Error(deleteError.message);
      setDocs((prev) => prev.filter((doc) => doc.source_uid !== sourceUid));
      setSelectedSourceUids((prev) => prev.filter((value) => value !== sourceUid));
      if (selectedSourceUid === sourceUid) {
        setSelectedSourceUid(null);
      }
      setDeleteTargetDoc(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setDeletingDoc(false);
    }
  }, [deleteTargetDoc, deletingDoc, selectedSourceUid]);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!selectedDoc) {
        setPreviewKind('none');
        setPreviewUrl(null);
        setPreviewText(null);
        setPreviewError(null);
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);
      setPreviewText(null);

      let signedUrl: string | null = null;
      let signedUrlError: string | null = null;

      // Prefer original for PDF/image, converted content for text-like preview.
      if (isPdfDocument(selectedDoc) || isImageDocument(selectedDoc)) {
        const signedResult = await resolveSignedUrlForLocators([selectedDoc.source_locator, selectedDoc.conv_locator]);
        signedUrl = signedResult.url;
        signedUrlError = signedResult.error;
      } else if (isDocxDocument(selectedDoc) || isPptxDocument(selectedDoc)) {
        const signedResult = await resolveSignedUrlForLocators([selectedDoc.source_locator, selectedDoc.conv_locator]);
        signedUrl = signedResult.url;
        signedUrlError = signedResult.error;
      } else if (isTextDocument(selectedDoc)) {
        const signedResult = await resolveSignedUrlForLocators([selectedDoc.conv_locator, selectedDoc.source_locator]);
        signedUrl = signedResult.url;
        signedUrlError = signedResult.error;
      } else {
        const signedResult = await resolveSignedUrlForLocators([selectedDoc.source_locator, selectedDoc.conv_locator]);
        signedUrl = signedResult.url;
        signedUrlError = signedResult.error;
      }

      if (cancelled) return;

      if (!signedUrl) {
        setPreviewKind('none');
        setPreviewUrl(null);
        setPreviewText(null);
        setPreviewError(
          signedUrlError
            ? `Preview unavailable: ${signedUrlError}`
            : 'Preview unavailable for this document.',
        );
        setPreviewLoading(false);
        return;
      }

      if (isPdfDocument(selectedDoc)) {
        setPreviewKind('pdf');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }

      if (isImageDocument(selectedDoc)) {
        setPreviewKind('image');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }

      if (isTextDocument(selectedDoc)) {
        try {
          const response = await fetch(signedUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const text = await response.text();
          if (cancelled) return;
          const truncated = text.length > 200000 ? `${text.slice(0, 200000)}\n\n[Preview truncated]` : text;
          setPreviewKind('text');
          setPreviewText(truncated);
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        } catch {
          setPreviewKind('file');
          setPreviewUrl(signedUrl);
          setPreviewError(null);
          setPreviewLoading(false);
          return;
        }
      }

      if (isDocxDocument(selectedDoc)) {
        setPreviewKind('docx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }

      if (isPptxDocument(selectedDoc)) {
        setPreviewKind('pptx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }

      setPreviewKind('file');
      setPreviewUrl(signedUrl);
      setPreviewLoading(false);
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedDoc]);

  useEffect(() => {
    let cancelled = false;

    const loadDoclingJsonForResults = async () => {
      setResultsDoclingJsonUrl(null);
      setResultsDoclingError(null);
      setResultsDoclingLoading(false);

      if (!selectedDoc || !isPdfDocument(selectedDoc) || !selectedDoc.conv_uid) {
        return;
      }

      const locators = dedupeLocators([
        selectedDoc.conv_locator,
        toDoclingJsonLocator(selectedDoc.conv_locator),
        toDoclingJsonLocator(selectedDoc.source_locator),
      ]);

      if (locators.length === 0) {
        setResultsDoclingError('Docling JSON artifact locator was not found.');
        return;
      }

      setResultsDoclingLoading(true);
      const signedResult = await resolveSignedUrlForLocators(locators);
      if (cancelled) return;

      if (!signedResult.url) {
        setResultsDoclingError(
          signedResult.error
            ? `Docling JSON unavailable: ${signedResult.error}`
            : 'Docling JSON unavailable for this document.',
        );
        setResultsDoclingLoading(false);
        return;
      }

      setResultsDoclingJsonUrl(signedResult.url);
      setResultsDoclingLoading(false);
    };

    void loadDoclingJsonForResults();
    return () => {
      cancelled = true;
    };
  }, [selectedDoc]);

  useEffect(() => {
    setResultsBlocks([]);
  }, [selectedDoc?.source_uid]);

  useEffect(() => {
    let cancelled = false;

    const loadTestBlocks = async () => {
      if (surface !== 'test') {
        setTestBlocks([]);
        setTestBlocksError(null);
        setTestBlocksLoading(false);
        return;
      }
      if (!selectedDoc?.conv_uid) {
        setTestBlocks([]);
        setTestBlocksError(null);
        setTestBlocksLoading(false);
        return;
      }

      setTestBlocksLoading(true);
      setTestBlocksError(null);

      const { data, error: blocksError } = await supabase
        .from(TABLES.blocks)
        .select('block_uid, block_index, block_type, block_content')
        .eq('conv_uid', selectedDoc.conv_uid)
        .order('block_index', { ascending: true });

      if (cancelled) return;

      if (blocksError) {
        setTestBlocks([]);
        setTestBlocksError(blocksError.message);
        setTestBlocksLoading(false);
        return;
      }

      const mapped = (data ?? []).map((row) => {
        const record = row as {
          block_uid: string;
          block_index: number;
          block_type: string;
          block_content: string | null;
        };
        const snippet = typeof record.block_content === 'string'
          ? record.block_content.trim().replace(/\s+/g, ' ').slice(0, 280)
          : '';
        return {
          blockUid: record.block_uid,
          blockIndex: record.block_index,
          blockType: record.block_type,
          snippet,
        } satisfies TestBlockCardRow;
      });

      setTestBlocks(mapped);
      setTestBlocksLoading(false);
    };

    void loadTestBlocks();
    return () => {
      cancelled = true;
    };
  }, [selectedDoc?.conv_uid, surface]);

  useEffect(() => {
    if (!isTestSurfacePage) {
      if (configCollapseState !== 'full') setConfigCollapseState('full');
      return;
    }
    if (!isTransformTestSurface && configCollapseState === 'half') {
      setConfigCollapseState('full');
    }
  }, [configCollapseState, isTestSurfacePage, isTransformTestSurface]);

  const handleExplorerResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (isExplorerCollapsed) return;
    event.preventDefault();
    resizeStateRef.current = { startX: event.clientX, startWidth: explorerWidth };
    setActiveResizer('explorer');
  }, [explorerWidth, isExplorerCollapsed]);

  const handleConfigResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (isTestSurfacePage && configCollapseState !== 'full') return;
    event.preventDefault();
    resizeStateRef.current = { startX: event.clientX, startWidth: configWidth };
    setActiveResizer('config');
  }, [configCollapseState, configWidth, isTestSurfacePage]);

  const handleConfigToggle = useCallback(() => {
    if (!isTestSurfacePage) return;
    setConfigCollapseState((current) => {
      if (isTransformTestSurface) {
        if (current === 'full') return 'half';
        if (current === 'half') return 'collapsed';
        return 'full';
      }
      return current === 'collapsed' ? 'full' : 'collapsed';
    });
  }, [isTestSurfacePage, isTransformTestSurface]);

  useEffect(() => {
    if (!activeResizer) return;

    const onPointerMove = (event: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      if (activeResizer === 'explorer') {
        const delta = event.clientX - state.startX;
        const nextWidth = Math.max(
          EXPLORER_WIDTH_MIN,
          Math.min(EXPLORER_WIDTH_MAX, state.startWidth + delta),
        );
        setExplorerWidth(nextWidth);
        return;
      }
      const delta = state.startX - event.clientX;
      const configMin = isTestSurfacePage ? TRANSFORM_TEST_CONFIG_WIDTH_MIN : CONFIG_WIDTH_MIN;
      const configMax = isTestSurfacePage ? TRANSFORM_TEST_CONFIG_WIDTH_MAX : CONFIG_WIDTH_MAX;
      const nextWidth = Math.max(
        configMin,
        Math.min(configMax, state.startWidth + delta),
      );
      setConfigWidth(nextWidth);
    };

    const onPointerUp = () => {
      resizeStateRef.current = null;
      setActiveResizer(null);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [activeResizer, isTestSurfacePage]);

  useShellHeaderTitle({
    title: project?.project_name ?? 'Project',
    subtitle: project?.description ?? undefined,
  });

  if (loading) return <Center mt="xl"><Loader /></Center>;
  if (!project) return <ErrorAlert message={error ?? 'Project not found'} />;

  const isTestSurface = isTestSurfacePage;
  const shouldRouteCollapsedSpaceToConfig = isTestSurface || (isExtractMode && extractConfigView === 'Schema');
  const navCompactionExplorerBoost = desktopNavOpened ? 0 : (isTestSurface ? 0 : 20);
  const navCompactionConfigBoost = desktopNavOpened ? 0 : (isTestSurface ? 0 : 130);
  const expandedExplorerWidth = explorerWidth + navCompactionExplorerBoost;
  const collapsedDelta = isExplorerCollapsed
    ? Math.max(0, expandedExplorerWidth - EXPLORER_WIDTH_COLLAPSED)
    : 0;
  const effectiveExplorerWidth = isExplorerCollapsed ? EXPLORER_WIDTH_COLLAPSED : expandedExplorerWidth;
  const expandedConfigWidth = configWidth + navCompactionConfigBoost + (shouldRouteCollapsedSpaceToConfig ? collapsedDelta : 0);
  const halfConfigWidth = Math.max(CONFIG_WIDTH_COLLAPSED, Math.round(expandedConfigWidth * 0.5));
  const effectiveConfigWidth = isConfigCollapsed
    ? CONFIG_WIDTH_COLLAPSED
    : isConfigHalf
      ? halfConfigWidth
      : expandedConfigWidth;
  const configToggleLabel = isTransformTestSurface
    ? (configCollapseState === 'full'
      ? 'Collapse Configuration column to 50%'
      : configCollapseState === 'half'
        ? 'Collapse Configuration column fully'
        : 'Expand Configuration column')
    : (isConfigCollapsed ? 'Expand Configuration column' : 'Collapse Configuration column');
  const layoutStyle = {
    '--parse-explorer-width': `${effectiveExplorerWidth}px`,
    '--parse-config-width': `${effectiveConfigWidth}px`,
  } as CSSProperties;
  const isMarkdownTextPreview = (
    previewKind === 'text'
    && selectedDoc?.source_type?.toLowerCase() === 'md'
  );
  const isRightPreviewTab = isTestSurface ? testRightTab === 'preview' : middlePreviewTab === 'preview';
  const isRightMetadataTab = isTestSurface ? testRightTab === 'metadata' : middlePreviewTab === 'results';
  const isRightBlocksTab = isTestSurface && testRightTab === 'blocks';
  const showMetadataOverlayToggle = (
    isRightMetadataTab
    && !!selectedDoc
    && isPdfDocument(selectedDoc)
    && !!selectedDoc.conv_uid
  );
  const showPdfInPreview = (
    isRightPreviewTab
    && !!selectedDoc
    && !previewLoading
    && !previewError
    && previewKind === 'pdf'
    && !!previewUrl
  );
  const showCenterResultsList = !isTestSurface && middlePreviewTab === 'results';
  const showCenterConfig = isTestSurface || middlePreviewTab !== 'results';
  const middleTabsControl = (
    isTestSurface ? (
      <>
        <Text
          size="sm"
          fw={testRightTab === 'preview' ? 700 : 600}
          c={testRightTab === 'preview' ? undefined : 'dimmed'}
          className={`parse-middle-tab${testRightTab === 'preview' ? ' is-active' : ''}`}
          onClick={() => setTestRightTab('preview')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Preview
        </Text>
        <Text
          size="sm"
          fw={testRightTab === 'metadata' ? 700 : 600}
          c={testRightTab === 'metadata' ? undefined : 'dimmed'}
          className={`parse-middle-tab${testRightTab === 'metadata' ? ' is-active' : ''}`}
          onClick={() => setTestRightTab('metadata')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Metadata
        </Text>
        <Text
          size="sm"
          fw={testRightTab === 'blocks' ? 700 : 600}
          c={testRightTab === 'blocks' ? undefined : 'dimmed'}
          className={`parse-middle-tab${testRightTab === 'blocks' ? ' is-active' : ''}`}
          onClick={() => setTestRightTab('blocks')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Blocks
        </Text>
      </>
    ) : (
      <>
        <Text
          size="sm"
          fw={middlePreviewTab === 'preview' ? 700 : 600}
          c={middlePreviewTab === 'preview' ? undefined : 'dimmed'}
          className={`parse-middle-tab${middlePreviewTab === 'preview' ? ' is-active' : ''}`}
          onClick={() => setMiddlePreviewTab('preview')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Preview
        </Text>
        <Text
          size="sm"
          fw={middlePreviewTab === 'results' ? 700 : 600}
          c={middlePreviewTab === 'results' ? undefined : 'dimmed'}
          className={`parse-middle-tab${middlePreviewTab === 'results' ? ' is-active' : ''}`}
          onClick={() => setMiddlePreviewTab('results')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Results
        </Text>
      </>
    )
  );

  return (
    <>
      {error && <ErrorAlert message={error} />}

      <Box
        className={`parse-playground-layout${surface === 'test' ? ' parse-playground-layout--test' : ''}`}
        data-surface={surface}
        style={layoutStyle}
      >
        <Box className={`parse-playground-explorer${isExplorerCollapsed ? ' is-collapsed' : ''}`}>
          <Box
            className={`parse-playground-resizer parse-playground-resizer-explorer${activeResizer === 'explorer' ? ' is-active' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize documents pane"
            onPointerDown={handleExplorerResizeStart}
          />
          <ActionIcon
            size="sm"
            variant="subtle"
            className="parse-explorer-collapse-toggle"
            aria-label={isExplorerCollapsed ? 'Expand Add Documents column' : 'Collapse Add Documents column'}
            title={isExplorerCollapsed ? 'Expand Add Documents column' : 'Collapse Add Documents column'}
            onClick={() => setIsExplorerCollapsed((current) => !current)}
          >
            {isExplorerCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
          </ActionIcon>

          <Box className="parse-playground-upload">
            <ProjectParseUppyUploader
              projectId={project.project_id}
              ingestMode="upload_only"
              compactUi
              onBatchUploaded={handleBatchUploaded}
              height={240}
            />
          </Box>

          <Box className="parse-playground-docs">
            <Stack gap="xs" style={{ minHeight: 0, height: '100%' }}>
              <Group justify="space-between" align="center" wrap="nowrap" className="parse-docs-toolbar">
                <Text
                  size="xs"
                  c="dimmed"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleAllPagedDocSelection(!allPagedSelected)}
                >
                  {allPagedSelected || somePagedSelected ? 'Deselect all' : 'Select all'}
                </Text>
              </Group>

              {docs.length === 0 ? (
                <Center py="lg">
                  <Text size="sm" c="dimmed">No documents yet.</Text>
                </Center>
              ) : (
                <>
                  <Box className="parse-doc-card-list">
                    {pagedDocs.map((doc) => {
                      const selected = doc.source_uid === selectedSourceUid;
                      const checked = selectedSourceUidSet.has(doc.source_uid);
                      const statusMeta = DOC_STATUS_META[doc.status];
                      return (
                        <Box
                          key={doc.source_uid}
                          className={`parse-doc-card${selected ? ' is-active' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSourceUid(doc.source_uid)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            setSelectedSourceUid(doc.source_uid);
                          }}
                        >
                          <Checkbox
                            checked={checked}
                            size="xs"
                            styles={docSelectorCheckboxStyles}
                            aria-label={`Select ${doc.doc_title}`}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => toggleDocSelection(doc.source_uid, event.currentTarget.checked)}
                          />
                          <Text size="xs" fw={selected ? 700 : 600} className="parse-doc-card-name" title={doc.doc_title}>
                            {doc.doc_title}
                          </Text>
                          <Text size="xs" className="parse-doc-card-format">{getDocumentFormat(doc)}</Text>
                          <Text size="xs" className="parse-doc-card-size">{formatBytes(doc.source_filesize)}</Text>
                          <Group
                            gap={6}
                            wrap="nowrap"
                            className="parse-doc-card-status"
                            aria-label={`Status: ${statusMeta.label}`}
                            title={statusMeta.label}
                          >
                            <span className={`parse-doc-card-status-dot is-${statusMeta.tone}`} />
                          </Group>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            aria-label={`Delete ${doc.doc_title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTargetDoc(doc);
                            }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Box>
                      );
                    })}

                    {totalPages > 1 && (
                      <Group justify="center" className="parse-docs-pagination-wrap">
                        <Pagination
                          value={page}
                          onChange={setPage}
                          total={totalPages}
                          siblings={1}
                          boundaries={1}
                          size="xs"
                          className="parse-docs-pagination"
                          withControls={false}
                          withEdges={false}
                        />
                      </Group>
                    )}
                  </Box>
                </>
              )}
            </Stack>
          </Box>
        </Box>
        <Box className="parse-playground-work">
          <Box className="parse-playground-preview">
            <Box className="parse-preview-frame">
              {!showPdfInPreview && (
                <Group justify="space-between" align="center" className="parse-middle-view-tabs" wrap="nowrap">
                  <Group gap={12} align="center" wrap="nowrap">
                    {middleTabsControl}
                  </Group>
                  {isTransformMode && isRightBlocksTab && (
                    <Box className="parse-middle-grid-toolbar-host" ref={setTestBlocksToolbarHost} />
                  )}
                  {!isTransformMode && isRightBlocksTab && testBlocks.length > 0 && (
                    <Text size="xs" c="dimmed">{testBlocks.length} blocks</Text>
                  )}
                  {showMetadataOverlayToggle && (
                    <Group gap={8} wrap="nowrap">
                      <Switch
                        className="parse-overlay-toggle"
                        size="xs"
                        label="Show overlay"
                        checked={showAllBboxes}
                        disabled={previewLoading || resultsDoclingLoading}
                        onChange={(event) => setShowAllBboxes(event.currentTarget.checked)}
                      />
                      <Switch
                        className="parse-overlay-toggle"
                        size="xs"
                        label="Show results"
                        checked={showMetadataBlocksPanel}
                        disabled={previewLoading || resultsDoclingLoading}
                        onChange={(event) => setShowMetadataBlocksPanel(event.currentTarget.checked)}
                      />
                    </Group>
                  )}
                </Group>
              )}

              <Box className="parse-preview-content">
                {isRightPreviewTab && (
                  <>
                    {!selectedDoc && (
                      <Center h="100%">
                        <Text size="sm" c="dimmed">Select a document to preview.</Text>
                      </Center>
                    )}

                    {selectedDoc && previewLoading && (
                      <Center h="100%">
                        <Stack align="center" gap="xs">
                          <Loader size="sm" />
                          <Text size="sm" c="dimmed">Loading preview...</Text>
                        </Stack>
                      </Center>
                    )}

                    {selectedDoc && !previewLoading && previewError && (
                      <Box p="sm">
                        <Alert color="red" variant="light">
                          {previewError}
                        </Alert>
                      </Box>
                    )}

                    {selectedDoc && !previewLoading && previewKind === 'pdf' && previewUrl && (
                      <PdfPreview
                        key={`${selectedDoc.source_uid}:${previewUrl}`}
                        title={selectedDoc.doc_title}
                        url={previewUrl}
                        toolbarLeft={middleTabsControl}
                      />
                    )}

                    {selectedDoc && !previewLoading && previewKind === 'image' && previewUrl && (
                      <Center h="100%">
                        <img src={previewUrl} alt={selectedDoc.doc_title} className="parse-preview-image" />
                      </Center>
                    )}

                    {selectedDoc && !previewLoading && previewKind === 'text' && (
                      <Box className="parse-text-preview">
                        {isMarkdownTextPreview && (
                          <Group justify="space-between" wrap="nowrap" className="parse-text-preview-header">
                            <Group gap={6} wrap="nowrap" className="parse-text-preview-file">
                              <IconFileText size={14} />
                              <Text size="xs" className="parse-text-preview-filename" title={selectedDoc.doc_title}>
                                {selectedDoc.doc_title}
                              </Text>
                            </Group>
                            {previewUrl && (
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                component="a"
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                aria-label="Download markdown"
                              >
                                <IconDownload size={14} />
                              </ActionIcon>
                            )}
                          </Group>
                        )}
                        <pre className="parse-preview-text">{previewText ?? ''}</pre>
                      </Box>
                    )}

                    {selectedDoc && !previewLoading && previewKind === 'docx' && previewUrl && (
                      <DocxPreview
                        key={`${selectedDoc.source_uid}:${previewUrl}`}
                        title={selectedDoc.doc_title}
                        url={previewUrl}
                      />
                    )}

                    {selectedDoc && !previewLoading && previewKind === 'pptx' && previewUrl && (
                      <PptxPreview
                        key={`${selectedDoc.source_uid}:${previewUrl}`}
                        title={selectedDoc.doc_title}
                        url={previewUrl}
                      />
                    )}

                    {selectedDoc && !previewLoading && previewKind === 'file' && (
                      <Center h="100%">
                        <Stack align="center" gap="xs" p="md">
                          <Text size="sm" c="dimmed" ta="center">
                            Preview not supported for this format.
                          </Text>
                          {previewUrl && (
                            <Button
                              component="a"
                              href={previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              size="xs"
                              variant="light"
                            >
                              Open file
                            </Button>
                          )}
                        </Stack>
                      </Center>
                    )}
                  </>
                )}

                {isRightMetadataTab && (
                  <>
                    {!selectedDoc && (
                      <Center h="100%">
                        <Text size="sm" c="dimmed" ta="center">
                          Select a document to view parse results.
                        </Text>
                      </Center>
                    )}

                    {selectedDoc && isPdfDocument(selectedDoc) && !selectedDoc.conv_uid && (
                      <Center h="100%">
                        <Text size="sm" c="dimmed" ta="center">
                          No parsed result artifacts exist for this file yet (status: {selectedDoc.status}).
                        </Text>
                      </Center>
                    )}

                    {selectedDoc && !isPdfDocument(selectedDoc) && (
                      <Center h="100%">
                        <Text size="sm" c="dimmed" ta="center">
                          Parse results preview is currently enabled for PDFs.
                        </Text>
                      </Center>
                    )}

                    {selectedDoc && isPdfDocument(selectedDoc) && selectedDoc.conv_uid && (
                      <>
                        {(previewLoading || resultsDoclingLoading) && (
                          <Center h="100%">
                            <Stack align="center" gap="xs">
                              <Loader size="sm" />
                              <Text size="sm" c="dimmed">Loading parsed PDF results...</Text>
                            </Stack>
                          </Center>
                        )}

                        {!previewLoading && !resultsDoclingLoading && (!previewUrl || previewKind !== 'pdf') && (
                          <Center h="100%">
                            <Text size="sm" c="dimmed" ta="center">
                              PDF preview is unavailable for this parsed document.
                            </Text>
                          </Center>
                        )}

                        {!previewLoading && !resultsDoclingLoading && previewKind === 'pdf' && previewUrl && resultsDoclingError && (
                          <Center h="100%">
                            <Text size="sm" c="dimmed" ta="center">
                              {resultsDoclingError}
                            </Text>
                          </Center>
                        )}

                        {!previewLoading
                          && !resultsDoclingLoading
                          && previewKind === 'pdf'
                          && previewUrl
                          && resultsDoclingJsonUrl
                          && selectedDoc.conv_uid && (
                            <PdfResultsHighlighter
                              key={`${selectedDoc.source_uid}:${selectedDoc.conv_uid}:${resultsDoclingJsonUrl}`}
                              title={selectedDoc.doc_title}
                              pdfUrl={previewUrl}
                              doclingJsonUrl={resultsDoclingJsonUrl}
                              convUid={selectedDoc.conv_uid}
                              showAllBoundingBoxes={showAllBboxes}
                              onShowAllBoundingBoxesChange={setShowAllBboxes}
                              showBlocksPanel={showMetadataBlocksPanel}
                              onShowBlocksPanelChange={setShowMetadataBlocksPanel}
                              onBlocksChange={setResultsBlocks}
                            />
                        )}
                      </>
                    )}
                  </>
                )}

                {isRightBlocksTab && (
                  isTransformMode ? (
                    <Box style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
                      {!selectedDoc ? (
                        <Center h="100%">
                          <Text size="sm" c="dimmed" ta="center">
                            Select a document to view parsed blocks.
                          </Text>
                        </Center>
                      ) : !selectedDoc.conv_uid ? (
                        <Center h="100%">
                          <Text size="sm" c="dimmed" ta="center">
                            No parsed blocks are available for this document yet.
                          </Text>
                        </Center>
                      ) : (
                        <BlockViewerGrid
                          convUid={selectedDoc.conv_uid}
                          selectedRunId={selectedRunId}
                          selectedRun={selectedRun}
                          toolbarPortalTarget={testBlocksToolbarHost}
                        />
                      )}
                    </Box>
                  ) : (
                    <Box className="parse-docling-results-list">
                      {!selectedDoc ? (
                        <Center h="100%">
                          <Text size="sm" c="dimmed" ta="center">
                            Select a document to view parsed blocks.
                          </Text>
                        </Center>
                      ) : !selectedDoc.conv_uid ? (
                        <Center h="100%">
                          <Text size="sm" c="dimmed" ta="center">
                            No parsed blocks are available for this document yet.
                          </Text>
                        </Center>
                      ) : testBlocksLoading ? (
                        <Center h="100%">
                          <Loader size="sm" />
                        </Center>
                      ) : testBlocksError ? (
                        <Center h="100%">
                          <Text size="sm" c="red" ta="center">
                            {testBlocksError}
                          </Text>
                        </Center>
                      ) : testBlocks.length === 0 ? (
                        <Center h="100%">
                          <Text size="sm" c="dimmed" ta="center">
                            Parsed blocks returned empty for this document.
                          </Text>
                        </Center>
                      ) : (
                        testBlocks.map((block) => (
                          <Box key={block.blockUid} className="parse-docling-results-item">
                            <Text size="xs" fw={700}>
                              {block.blockType} | #{block.blockIndex}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={3}>
                              {block.snippet || '[no text]'}
                            </Text>
                          </Box>
                        ))
                      )}
                    </Box>
                  )
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className={`parse-playground-right${isExtractMode ? ' is-extract' : ''}${isTestSurfacePage && isConfigCollapsed ? ' is-collapsed' : ''}`}>
          <Box
            className={`parse-playground-resizer parse-playground-resizer-config${activeResizer === 'config' ? ' is-active' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize config pane"
            onPointerDown={handleConfigResizeStart}
          />
          {isTestSurfacePage && (
            <ActionIcon
              size="sm"
              variant="subtle"
              className="parse-config-collapse-toggle"
              aria-label={configToggleLabel}
              title={configToggleLabel}
              onClick={handleConfigToggle}
            >
              {isConfigCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
            </ActionIcon>
          )}
          {isTestSurfacePage && isConfigCollapsed ? null : (isExtractMode ? (
            <Stack gap="sm" className="extract-config-root">
              <Group justify="space-between" wrap="nowrap" className="extract-config-top-tabs">
                <Text size="sm" fw={700}>Build</Text>
                <Group gap={6} wrap="nowrap" className="extract-config-run-btn">
                  <ActionIcon
                    size="sm"
                    variant="transparent"
                    aria-label="Run extract"
                    title="Run extract"
                  >
                    <IconPlayerPlay size={17} />
                  </ActionIcon>
                </Group>
              </Group>

                <Group justify="space-between" wrap="nowrap">
                  <Group gap={6} wrap="nowrap">
                    <Text fw={700} size="sm">Configuration</Text>
                    <IconInfoCircle size={14} stroke={1.8} className="extract-config-info-icon" />
                  </Group>
                  <SegmentedControl
                    value={extractConfigView}
                    size="xs"
                    radius="md"
                    className="extract-config-view-switch"
                    data={[
                      { label: 'Basic', value: 'Basic' },
                      { label: 'Advanced', value: 'Advanced' },
                      { label: 'Schema', value: 'Schema' },
                    ]}
                    onChange={(value) => setExtractConfigView(value as ExtractConfigView)}
                  />
                </Group>

              {extractConfigView === 'Basic' && (
                <>
                  <Box className="extract-config-section">
                    <Stack gap={8}>
                      <Text fw={600} size="sm">Mode</Text>
                      <Box className="extract-config-mode-track">
                        <span className="extract-config-mode-segment" />
                        <span className="extract-config-mode-segment" />
                        <span className="extract-config-mode-segment" />
                        <span className="extract-config-mode-segment is-active" />
                      </Box>
                      <Group justify="space-between" className="extract-config-mode-labels" wrap="nowrap">
                        <Text size="xs" c="dimmed">Fast</Text>
                        <Text size="xs" c="dimmed">Balanced</Text>
                        <Text size="xs" c="dimmed">Multimodal</Text>
                        <Text size="xs" fw={700}>Premium</Text>
                      </Group>
                      <Box className="extract-config-tier-card">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                          <Box>
                            <Text size="sm" fw={700}>Premium</Text>
                            <Text size="xs" c="dimmed">
                              Highest accuracy on complex information-dense documents
                            </Text>
                          </Box>
                          <Text size="sm" fw={700}>60 credits</Text>
                        </Group>
                      </Box>
                    </Stack>
                  </Box>

                  <Box className="extract-config-section">
                    <Stack gap={8}>
                      <Group justify="space-between" wrap="nowrap">
                        <Text fw={700} size="sm">Extraction Target</Text>
                        <Text size="xs" c="blue">Learn More</Text>
                      </Group>
                      <Radio.Group defaultValue="document">
                        <Stack gap={10}>
                          <Box>
                            <Radio value="document" label="Document" />
                            <Text size="xs" c="dimmed" pl={28}>Extract from the entire document at once (single result)</Text>
                          </Box>
                          <Box>
                            <Radio value="page" label="Page" />
                            <Text size="xs" c="dimmed" pl={28}>Extract from each page separately (list of results)</Text>
                          </Box>
                          <Box>
                            <Radio value="row" label="Table Row" />
                            <Text size="xs" c="dimmed" pl={28}>Extract from each row of a table structure (list of results)</Text>
                          </Box>
                        </Stack>
                      </Radio.Group>
                    </Stack>
                  </Box>
                </>
              )}

              {extractConfigView === 'Advanced' && (
                <>
                  <Text fw={700} size="sm" className="extract-config-subheading">Advanced Settings</Text>

                  <Box className="extract-config-section">
                    <Stack gap="xs">
                      <Text fw={700} size="sm">Model Settings</Text>
                      <Select
                        label="Parse Model"
                        data={['Claude 4.5 Haiku']}
                        defaultValue="Claude 4.5 Haiku"
                        comboboxProps={{ withinPortal: false }}
                      />
                      <Select
                        label="Extract Model"
                        data={['GPT 4.1']}
                        defaultValue="GPT 4.1"
                        comboboxProps={{ withinPortal: false }}
                      />
                    </Stack>
                  </Box>

                  <Box className="extract-config-section">
                    <Stack gap="xs">
                      <Text fw={700} size="sm">Extraction Settings</Text>
                      <TextInput label="System prompt" placeholder="e.g. Extract only financial data" />
                      <TextInput label="Page Range" placeholder="e.g. 1,5-10" />
                      <TextInput label="Context window size" placeholder="e.g. 5" />
                    </Stack>
                  </Box>

                  <Box className="extract-config-section">
                    <Stack gap={8}>
                      <Text fw={700} size="sm">Extensions</Text>
                      <Switch label="Use Reasoning" />
                      <Switch label="Cite Sources" defaultChecked />
                      <Switch label="Confidence Score" defaultChecked />
                    </Stack>
                  </Box>

                  <Box className="extract-config-section">
                    <Stack gap={8}>
                      <Text fw={700} size="sm">Other</Text>
                      <Text size="xs" fw={600}>Chunk Mode</Text>
                      <Radio.Group defaultValue="page">
                        <Stack gap={8}>
                          <Radio value="page" label="Page" />
                          <Radio value="section" label="Section" />
                        </Stack>
                      </Radio.Group>
                      <Switch label="High resolution mode" />
                      <Switch label="Invalidate Cache" />
                    </Stack>
                  </Box>
                </>
              )}

              {extractConfigView === 'Schema' && (
                <>
                  <Text fw={700} size="sm" className="extract-config-subheading">Schema</Text>

                  <Box className="extract-schema-shell">
                    <Group justify="space-between" wrap="nowrap" className="extract-schema-toolbar">
                      <Group gap={4} wrap="nowrap" className="extract-schema-mode-toggle">
                        <ActionIcon
                          size="sm"
                          variant={extractSchemaMode === 'table' ? 'light' : 'subtle'}
                          aria-label="Table schema mode"
                          onClick={() => setExtractSchemaMode('table')}
                        >
                          <IconTable size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant={extractSchemaMode === 'code' ? 'light' : 'subtle'}
                          aria-label="Code schema mode"
                          onClick={() => setExtractSchemaMode('code')}
                        >
                          <IconCode size={14} />
                        </ActionIcon>
                      </Group>

                      <Group gap={6} wrap="nowrap">
                        <ActionIcon size="sm" variant="subtle" aria-label="Expand schema">
                          <IconArrowsMaximize size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          aria-label="Reset schema"
                          onClick={clearExtractSchema}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    {!extractSchemaReady && (
                      <Center className="extract-schema-create-wrap">
                        <Stack align="center" gap="sm" className="extract-schema-create-card">
                          <Text fw={700} size="xl">Create Schema</Text>
                          <Text size="sm" c="dimmed" ta="center" maw={460}>
                            Upload a file or provide a natural language description to automatically generate a schema.
                            Or use the Schema Builder to manually create a schema.
                          </Text>
                          <Group gap="sm">
                            <Button variant="filled" onClick={initializeAutoSchema}>Auto-Generate</Button>
                            <Button variant="default" onClick={initializeManualSchema}>Create Manually</Button>
                          </Group>
                        </Stack>
                      </Center>
                    )}

                    {extractSchemaReady && extractSchemaMode === 'table' && (
                      <Stack gap="sm">
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap={6} wrap="nowrap">
                            <Text fw={600}>Apply to all fields</Text>
                            <IconDotsVertical size={14} />
                            <Badge variant="light" radius="xl">{extractSchemaFields.length}</Badge>
                          </Group>
                          <Button
                            variant="default"
                            size="xs"
                            leftSection={<IconPencil size={14} />}
                          >
                            Edit
                          </Button>
                        </Group>

                        <Box className="extract-schema-table-head">
                          <Box />
                          <Text fw={700} size="sm">Field Name</Text>
                          <Text fw={700} size="sm">Field Type</Text>
                          <Text fw={700} size="sm">Field Description</Text>
                          <Box />
                        </Box>

                        <Stack gap={8}>
                          {extractSchemaFields.map((field) => {
                            const hasName = field.name.trim().length > 0;
                            return (
                              <Box key={field.id} className="extract-schema-row">
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  aria-label="Add schema field"
                                  onClick={() => addExtractSchemaField(field.id)}
                                >
                                  <IconCirclePlus size={16} />
                                </ActionIcon>

                                <TextInput
                                  placeholder="e.g. invoice"
                                  value={field.name}
                                  onChange={(event) => updateExtractSchemaField(field.id, { name: event.currentTarget.value })}
                                />

                                <Select
                                  data={EXTRACT_SCHEMA_TYPE_OPTIONS}
                                  value={field.type}
                                  comboboxProps={{ withinPortal: false }}
                                  onChange={(value) => {
                                    if (!value) return;
                                    updateExtractSchemaField(field.id, { type: value as ExtractSchemaFieldType });
                                  }}
                                />

                                <TextInput
                                  placeholder="(optional)"
                                  value={field.description}
                                  onChange={(event) => updateExtractSchemaField(field.id, { description: event.currentTarget.value })}
                                />

                                <Group gap={4} wrap="nowrap" className="extract-schema-row-actions">
                                  <ActionIcon
                                    size="sm"
                                    variant={field.required ? 'light' : 'subtle'}
                                    aria-label="Toggle required field"
                                    onClick={() => updateExtractSchemaField(field.id, { required: !field.required })}
                                  >
                                    <Text fw={700}>*</Text>
                                  </ActionIcon>

                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="red"
                                    aria-label="Delete schema field"
                                    onClick={() => removeExtractSchemaField(field.id)}
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>

                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color={hasName ? 'gray' : 'red'}
                                    aria-label="Schema field validation state"
                                  >
                                    <IconAlertTriangle size={14} />
                                  </ActionIcon>
                                </Group>
                              </Box>
                            );
                          })}
                        </Stack>

                        <Group>
                          <Button
                            variant="subtle"
                            size="compact-sm"
                            leftSection={<IconCirclePlus size={14} />}
                            onClick={() => addExtractSchemaField()}
                          >
                            Add field
                          </Button>
                        </Group>
                      </Stack>
                    )}

                    {extractSchemaReady && extractSchemaMode === 'code' && (
                      <Stack gap="sm">
                        <Textarea
                          label="Schema JSON"
                          minRows={14}
                          value={extractSchemaDraft || extractSchemaPreviewJson}
                          onChange={(event) => setExtractSchemaDraft(event.currentTarget.value)}
                        />
                        <Text size="xs" c="dimmed">
                          Switch back to table mode to edit fields visually.
                        </Text>
                      </Stack>
                    )}
                  </Box>
                </>
              )}

            </Stack>
          ) : isTransformMode ? (
            <Stack gap={0} className="parse-config-root">
              <Group justify="space-between" wrap="nowrap" className="parse-config-top-tabs">
                <Text size="sm" fw={700}>Configuration</Text>
              </Group>
            </Stack>
          ) : (
            <Stack gap={0} className={`parse-config-root${showCenterResultsList ? ' parse-results-side-root' : ''}`}>
              <Group justify="space-between" wrap="nowrap" className="parse-config-top-tabs">
                {isTestSurface ? (
                  <Text size="sm" fw={700}>Build</Text>
                ) : (
                  <Group gap={12} wrap="nowrap">
                    <Text
                      size="sm"
                      fw={middlePreviewTab !== 'results' ? 700 : 600}
                      c={middlePreviewTab !== 'results' ? undefined : 'dimmed'}
                      className={`parse-middle-tab${middlePreviewTab !== 'results' ? ' is-active' : ''}`}
                      onClick={() => setMiddlePreviewTab('preview')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      Build
                    </Text>
                    <Text
                      size="sm"
                      fw={middlePreviewTab === 'results' ? 700 : 600}
                      c={middlePreviewTab === 'results' ? undefined : 'dimmed'}
                      className={`parse-middle-tab${middlePreviewTab === 'results' ? ' is-active' : ''}`}
                      onClick={() => setMiddlePreviewTab('results')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      Results
                    </Text>
                  </Group>
                )}
                {showCenterConfig && (
                  <Group gap={6} wrap="nowrap" className="parse-config-run-btn">
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      aria-label="Save config"
                      title="Save config"
                    >
                      <IconDeviceFloppy size={17} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      aria-label="Run parse"
                      title="Run parse"
                      loading={parseLoading}
                      onClick={() => void handleRunParse()}
                    >
                      <IconPlayerPlay size={17} />
                    </ActionIcon>
                  </Group>
                )}
                {showCenterResultsList && (
                  <Text size="xs" c="dimmed">
                    {resultsBlocks.length} blocks
                  </Text>
                )}
              </Group>

              {showCenterResultsList && (
                <Box className="parse-results-side-list">
                  {resultsBlocks.length === 0 ? (
                    <Center className="parse-results-side-empty">
                      <Text size="sm" c="dimmed" ta="center">
                        No parsed blocks are available for this document yet.
                      </Text>
                    </Center>
                  ) : (
                    resultsBlocks.map((block) => (
                      <Box key={block.id} className="parse-docling-results-item">
                        <Text size="xs" fw={700}>
                          {block.blockType} | #{block.blockIndex} | p.{block.pageNo}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={3}>
                          {block.snippet || '[no text]'}
                        </Text>
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {showCenterConfig && (
                <Stack gap="sm" className="parse-config-scroll">

              {parseError && (
                <Alert color="red" variant="light" withCloseButton onClose={() => setParseError(null)}>
                  <Text size="xs">{parseError}</Text>
                </Alert>
              )}

              <Group justify="space-between" wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Text fw={700} size="sm">Configuration</Text>
                  <IconInfoCircle size={14} stroke={1.8} className="extract-config-info-icon" />
                </Group>
                <SegmentedControl
                  value={parseConfigView}
                  size="xs"
                  radius="md"
                  className="parse-config-view-switch"
                  data={[
                    { label: 'Basic', value: 'Basic' },
                    { label: 'Advanced', value: 'Advanced' },
                  ]}
                  onChange={(value) => setParseConfigView(value as ParseConfigView)}
                />
              </Group>

              {parseConfigView === 'Basic' && (
                <Box className="parse-config-section">
                  <Stack gap={8}>
                    <Text fw={600} size="sm">Tiers</Text>
                    <Box className="parse-config-mode-track">
                      <span className="parse-config-mode-segment" />
                      <span className="parse-config-mode-segment" />
                      <span className="parse-config-mode-segment is-active" />
                      <span className="parse-config-mode-segment" />
                    </Box>
                    <Group justify="space-between" className="parse-config-mode-labels" wrap="nowrap">
                      <Text size="xs" c="dimmed">Fast</Text>
                      <Text size="xs" c="dimmed">Cost Effective</Text>
                      <Text size="xs" fw={700}>Agentic</Text>
                      <Text size="xs" c="dimmed">Agentic Plus</Text>
                    </Group>
                    <Box className="parse-config-tier-card">
                      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                        <Box>
                          <Text size="sm" fw={700}>Agentic</Text>
                          <Text size="xs" c="dimmed">
                            Works well for most documents with diagrams and images. May struggle with complex layouts
                          </Text>
                        </Box>
                        <Text size="sm" fw={700}>10 credits</Text>
                      </Group>
                    </Box>
                  </Stack>
                </Box>
              )}

              {parseConfigView === 'Advanced' && (
                <>
                  <Box className="parse-config-section">
                    <Stack gap={8}>
                      <Text fw={700} size="sm">Cost Optimizer</Text>
                      <Switch label="Enable Cost Optimizer" />
                      <Text size="xs" c="dimmed">
                        Automatically route to credits on most simple pages (no tables, charts, or scans)
                      </Text>
                    </Stack>
                  </Box>

                  <Box className="parse-config-section">
                    <Stack gap="xs">
                      <Text fw={700} size="sm">Page Ranges</Text>
                      <TextInput label="Target pages" placeholder="e.g. 1-9, 14, 15-13" />
                      <TextInput label="Max pages" placeholder="e.g. 100" />
                    </Stack>
                  </Box>

                  <Box className="parse-config-section">
                    <Stack gap={8}>
                      <Text fw={700} size="sm">Job Options</Text>
                      <Text size="xs" c="dimmed">
                        LlamaCloud keeps results cached for 48 hours after upload
                      </Text>
                      <Switch label="Disable cache" />
                    </Stack>
                  </Box>

                  <Box className="parse-config-section">
                    <Stack gap={8}>
                      <Text fw={700} size="sm">Processing Options</Text>
                      <Text size="xs" fw={600}>Images</Text>
                      <Switch label="Remove watermark" />
                      <Switch label="Preserve text in image" />
                      <Switch label="Preserve hidden text" />

                      <Text size="xs" fw={600}>OCR Parameters</Text>
                      <TextInput label="Languages" placeholder="en" />

                      <Text size="xs" fw={600}>Experimental (deprecated than parser)</Text>
                      <Radio.Group defaultValue="none">
                        <Stack gap={8}>
                          <Radio value="ppc_50" label="Agentic Plus (50 credits per chart)" />
                          <Radio value="ppc_65" label="Agentic (65 credits per chart)" />
                          <Radio value="none" label="None" />
                        </Stack>
                      </Radio.Group>
                    </Stack>
                  </Box>

                  <Box className="parse-config-section">
                    <Stack gap="xs">
                      <Text fw={700} size="sm">Agentic Options</Text>
                      <TextInput label="Custom prompt" placeholder="e.g. Do not output heading as title, instead prefix them with the text TITLE" />
                    </Stack>
                  </Box>

                  <Box className="parse-config-section">
                    <Stack gap={8}>
                      <Text fw={700} size="sm">Output Options</Text>
                      <Text size="xs" fw={600}>Markdown</Text>
                      <Switch label="Annotate links" />
                      <Switch label="Inline images in markdown" />

                      <Text size="xs" fw={600}>Tables</Text>
                      <Switch label="Output tables as Markdown" />
                      <Switch label="Compact markdown tables" />
                      <TextInput label="Multiline Table Separator" placeholder="<br />" />
                      <Switch label="Merge continued tables" />

                      <Text size="xs" fw={600}>Images to Save</Text>
                      <Switch label="Embedded images" />
                      <Switch label="Page screenshots" />
                      <Switch label="Layout images" />

                      <Text size="xs" fw={600}>Spatial Text</Text>
                      <Switch label="Preserve layout alignment across pages" />
                      <Switch label="Preserve very small text" />
                    </Stack>
                  </Box>
                </>
              )}

                </Stack>
              )}
            </Stack>
          ))}
        </Box>
      </Box>

      <Modal opened={deleteTargetDoc !== null} onClose={closeDeleteDialog} title="Delete document" centered>
        <Stack gap="md">
          <Text size="sm">
            This will permanently delete{' '}
            <Text span fw={700}>{deleteTargetDoc?.doc_title ?? 'this document'}</Text>
            {' '}and its related data. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteDialog} disabled={deletingDoc}>Cancel</Button>
            <Button color="red" onClick={() => void handleConfirmDeleteDocument()} loading={deletingDoc}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
