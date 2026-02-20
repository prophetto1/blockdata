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
  IconCirclePlus,
  IconCode,
  IconDotsVertical,
  IconDownload,
  IconFileText,
  IconInfoCircle,
  IconPencil,
  IconTable,
  IconTrash,
} from '@tabler/icons-react';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PptxPreview } from '@/components/documents/PptxPreview';
import { ProjectParseUppyUploader, type UploadBatchResult } from '@/components/documents/ProjectParseUppyUploader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { styleTokens } from '@/lib/styleTokens';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow, ProjectRow } from '@/lib/types';

const PAGE_SIZE = 10;
const EXPLORER_WIDTH_DEFAULT = 500;
const EXPLORER_WIDTH_MIN = 500;
const EXPLORER_WIDTH_MAX = 500;
const CONFIG_WIDTH_DEFAULT = 450;
const CONFIG_WIDTH_MIN = 450;
const CONFIG_WIDTH_MAX = 450;
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
type ProjectDetailMode = 'parse' | 'extract';
type MiddlePreviewTab = 'preview' | 'results';
type ParseConfigView = 'Basic' | 'Advanced';
type ExtractConfigView = 'Basic' | 'Advanced' | 'Schema';
type ExtractSchemaMode = 'table' | 'code';
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

export default function ProjectDetail({ mode = 'parse' }: ProjectDetailProps) {
  const { projectId } = useParams<{ projectId: string }>();

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
  const [middlePreviewTab, setMiddlePreviewTab] = useState<MiddlePreviewTab>('preview');
  const [parseConfigView, setParseConfigView] = useState<ParseConfigView>('Basic');
  const [extractConfigView, setExtractConfigView] = useState<ExtractConfigView>('Advanced');
  const [extractSchemaMode, setExtractSchemaMode] = useState<ExtractSchemaMode>('table');
  const [extractSchemaReady, setExtractSchemaReady] = useState(false);
  const [extractSchemaFields, setExtractSchemaFields] = useState<ExtractSchemaField[]>([]);
  const [extractSchemaDraft, setExtractSchemaDraft] = useState('');

  const [explorerWidth, setExplorerWidth] = useState(EXPLORER_WIDTH_DEFAULT);
  const [configWidth, setConfigWidth] = useState(CONFIG_WIDTH_DEFAULT);
  const [activeResizer, setActiveResizer] = useState<'explorer' | 'config' | null>(null);
  const [desktopNavOpened] = useLocalStorage<boolean>({
    key: 'blockdata.shell.nav_open_desktop',
    defaultValue: true,
  });

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

    const createSignedUrl = async (locator: string | null | undefined): Promise<SignedUrlResult> => {
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
    };

    const resolveSignedUrl = async (locators: Array<string | null | undefined>): Promise<SignedUrlResult> => {
      const errors: string[] = [];
      for (const locator of locators) {
        if (!locator?.trim()) continue;
        const result = await createSignedUrl(locator);
        if (result.url) return result;
        if (result.error) errors.push(result.error);
      }
      return {
        url: null,
        error: errors[0] ?? 'No previewable file was available for this document.',
      };
    };

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
        const signedResult = await resolveSignedUrl([selectedDoc.source_locator, selectedDoc.conv_locator]);
        signedUrl = signedResult.url;
        signedUrlError = signedResult.error;
      } else if (isDocxDocument(selectedDoc) || isPptxDocument(selectedDoc)) {
        const signedResult = await resolveSignedUrl([selectedDoc.source_locator, selectedDoc.conv_locator]);
        signedUrl = signedResult.url;
        signedUrlError = signedResult.error;
      } else if (isTextDocument(selectedDoc)) {
        const signedResult = await resolveSignedUrl([selectedDoc.conv_locator, selectedDoc.source_locator]);
        signedUrl = signedResult.url;
        signedUrlError = signedResult.error;
      } else {
        const signedResult = await resolveSignedUrl([selectedDoc.source_locator, selectedDoc.conv_locator]);
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

  const handleExplorerResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStateRef.current = { startX: event.clientX, startWidth: explorerWidth };
    setActiveResizer('explorer');
  }, [explorerWidth]);

  const handleConfigResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStateRef.current = { startX: event.clientX, startWidth: configWidth };
    setActiveResizer('config');
  }, [configWidth]);

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
      const nextWidth = Math.max(
        CONFIG_WIDTH_MIN,
        Math.min(CONFIG_WIDTH_MAX, state.startWidth + delta),
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
  }, [activeResizer]);

  useShellHeaderTitle({
    title: project?.project_name ?? 'Project',
    subtitle: project?.description ?? undefined,
  });

  if (loading) return <Center mt="xl"><Loader /></Center>;
  if (!project) return <ErrorAlert message={error ?? 'Project not found'} />;

  const navCompactionWidthShare = desktopNavOpened
    ? 0
    : Math.round((styleTokens.shell.navbarWidth - styleTokens.shell.navbarCompactWidth) / 3);
  const layoutStyle = {
    '--parse-explorer-width': `${explorerWidth + navCompactionWidthShare}px`,
    '--parse-config-width': `${configWidth + navCompactionWidthShare}px`,
  } as CSSProperties;
  const isExtractMode = mode === 'extract';
  const isMarkdownTextPreview = (
    previewKind === 'text'
    && selectedDoc?.source_type?.toLowerCase() === 'md'
  );

  return (
    <>
      {error && <ErrorAlert message={error} />}

      <Box className="parse-playground-layout" style={layoutStyle}>
        <Box className="parse-playground-explorer">
          <Box
            className={`parse-playground-resizer parse-playground-resizer-explorer${activeResizer === 'explorer' ? ' is-active' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize documents pane"
            onPointerDown={handleExplorerResizeStart}
          />

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
                <Group gap={8} wrap="nowrap">
                  <Checkbox
                    checked={allPagedSelected}
                    indeterminate={somePagedSelected}
                    size="xs"
                    styles={docSelectorCheckboxStyles}
                    aria-label="Select all documents on this page"
                    onChange={(event) => toggleAllPagedDocSelection(event.currentTarget.checked)}
                  />
                  <Text fw={700} size="sm">Project Documents</Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {pagedDocs.length} of {docs.length}
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
                  </Box>

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
                </>
              )}
            </Stack>
          </Box>
        </Box>

        <Box className="parse-playground-work">
          <Box className="parse-playground-preview">
            <Box className="parse-preview-frame">
              <Group justify="space-between" align="center" className="parse-middle-view-tabs" wrap="nowrap">
                <SegmentedControl
                  value={middlePreviewTab}
                  size="xs"
                  radius="md"
                  data={[
                    { label: 'Preview', value: 'preview' },
                    { label: 'Results', value: 'results' },
                  ]}
                  onChange={(value) => setMiddlePreviewTab(value as MiddlePreviewTab)}
                />
              </Group>

              <Box className="parse-preview-content">
                {middlePreviewTab === 'preview' && (
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

                {middlePreviewTab === 'results' && (
                  <Center h="100%">
                    <Stack align="center" gap="xs" p="md">
                      {!selectedDoc && (
                        <Text size="sm" c="dimmed" ta="center">
                          Select a document to view parse results.
                        </Text>
                      )}
                      {selectedDoc && selectedDoc.status !== 'ingested' && (
                        <Text size="sm" c="dimmed" ta="center">
                          Results are available after you run parse for this document.
                        </Text>
                      )}
                      {selectedDoc && selectedDoc.status === 'ingested' && (
                        <Text size="sm" c="dimmed" ta="center">
                          Parse results panel will render here.
                        </Text>
                      )}
                    </Stack>
                  </Center>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className={`parse-playground-right${isExtractMode ? ' is-extract' : ''}`}>
          <Box
            className={`parse-playground-resizer parse-playground-resizer-config${activeResizer === 'config' ? ' is-active' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize config pane"
            onPointerDown={handleConfigResizeStart}
          />
          {isExtractMode ? (
            <Stack gap="sm" className="extract-config-root">
              <Group justify="space-between" wrap="nowrap" className="extract-config-top-tabs">
                <Group gap="md" wrap="nowrap">
                  <Text size="sm" fw={700} className="extract-config-top-tab is-active">Build</Text>
                  <Text size="sm" fw={600} c="dimmed" className="extract-config-top-tab">Results</Text>
                </Group>
                <Button size="compact-sm" className="extract-config-run-btn">Run Extract</Button>
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

              <Group justify="space-between" wrap="nowrap" className="extract-config-footer">
                <Text size="xs" c="dimmed">Est. ~1,680 credits</Text>
              </Group>
            </Stack>
          ) : (
            <Stack gap="sm" className="parse-config-root">
              <Group justify="space-between" wrap="nowrap" className="parse-config-top-tabs">
                <Group gap="md" wrap="nowrap">
                  <Text size="sm" fw={700} className="parse-config-top-tab is-active">Build</Text>
                  <Text size="sm" fw={600} c="dimmed" className="parse-config-top-tab">Results</Text>
                </Group>
                <Button size="compact-sm" className="parse-config-run-btn">Run Parse</Button>
              </Group>

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

              <Group justify="space-between" wrap="nowrap" className="parse-config-footer">
                <Text size="xs" c="dimmed">Save config</Text>
              </Group>
            </Stack>
          )}
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
