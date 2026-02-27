import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Radio,
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
  IconChevronDown,
  IconCheck,
  IconCirclePlus,
  IconCode,
  IconDeviceFloppy,
  IconDotsVertical,
  IconDownload,
  IconFileText,
  IconPencil,
  IconPlayerPlay,
  IconTable,
  IconTrash,
} from '@tabler/icons-react';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { type ParsedResultBlock } from '@/components/documents/PdfResultsHighlighter';
import { PptxPreview } from '@/components/documents/PptxPreview';
import { BlocksTab } from '@/components/project-detail/BlocksTab';
import { MetadataTab } from '@/components/project-detail/MetadataTab';
import { OutputsTab, type OutputFileRow } from '@/components/project-detail/OutputsTab';
import { GridTab } from '@/components/project-detail/GridTab';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { DoubleArrowIcon } from '@/components/icons/DoubleArrowIcon';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { useBlockTypeRegistry } from '@/hooks/useBlockTypeRegistry';
import { useRuns } from '@/hooks/useRuns';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { ICON_TOKENS } from '@/lib/iconTokens';
import { TABLES } from '@/lib/tables';
import type { ProjectRow } from '@/lib/types';
import {
  downloadFromSignedUrl,
  resolveSignedUrlForLocators,
  toDoclingJsonLocator,
  toArtifactLocator,
  getFilenameFromLocator,
  dedupeLocators,
  sortDocumentsByUploadedAt,
  isPdfDocument,
  isImageDocument,
  isTextDocument,
  isDocxDocument,
  isPptxDocument,
  type ProjectDocumentRow,
  type PreviewKind,
  type TestBlockCardRow,
} from '@/lib/projectDetailHelpers';
import { resolveProjectDetailHeaderTitle } from '@/pages/projectDetailHeader';
import './SchemaLayout.css';

const SHELL_EXPLORER_WIDTH_DEFAULT = 392;
const EXPLORER_WIDTH_COLLAPSED = 56;
const CONFIG_WIDTH_DEFAULT = 345;
const CONFIG_WIDTH_COLLAPSED = 56;
const SHELL_DOCS_PER_PAGE = 4;
const PANE_CHEVRON_ICON = ICON_TOKENS.shell.paneChevron;
const CONFIG_ACTION_ICON = ICON_TOKENS.shell.configAction;

type ProjectDetailMode = 'parse' | 'extract' | 'transform';
type TestRightTab = 'preview' | 'metadata' | 'blocks' | 'grid' | 'outputs';
type ParseConfigView = 'Basic' | 'Advanced';
type ExtractConfigView = 'Basic' | 'Advanced' | 'Schema';
type ExtractSchemaMode = 'table' | 'code';
type ConfigCollapseState = 'full' | 'collapsed';
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

export default function ProjectDetail({ mode = 'parse' }: ProjectDetailProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const isParseMode = mode === 'parse';
  const isExtractMode = mode === 'extract';
  const isTransformMode = mode === 'transform';
  const isTransformTestSurface = isTransformMode;
  const { setShellTopSlots } = useHeaderCenter();
  const { registry: blockTypeRegistry } = useBlockTypeRegistry();

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
  const [outputsLoading, setOutputsLoading] = useState(false);
  const [outputsError, setOutputsError] = useState<string | null>(null);
  const [outputsNotice, setOutputsNotice] = useState<string | null>(null);
  const [outputsReloadKey, setOutputsReloadKey] = useState(0);
  const [runCitationsBusy, setRunCitationsBusy] = useState(false);
  const [outputDoclingJsonUrl, setOutputDoclingJsonUrl] = useState<string | null>(null);
  const [outputMarkdownUrl, setOutputMarkdownUrl] = useState<string | null>(null);
  const [outputHtmlUrl, setOutputHtmlUrl] = useState<string | null>(null);
  const [outputDoctagsUrl, setOutputDoctagsUrl] = useState<string | null>(null);
  const [outputCitationsUrl, setOutputCitationsUrl] = useState<string | null>(null);
  const [outputDoclingJsonLocators, setOutputDoclingJsonLocators] = useState<string[]>([]);
  const [outputMarkdownLocators, setOutputMarkdownLocators] = useState<string[]>([]);
  const [outputHtmlLocators, setOutputHtmlLocators] = useState<string[]>([]);
  const [outputDoctagsLocators, setOutputDoctagsLocators] = useState<string[]>([]);
  const [outputCitationsLocators, setOutputCitationsLocators] = useState<string[]>([]);
  const [outputDoclingJsonName, setOutputDoclingJsonName] = useState<string | null>(null);
  const [outputMarkdownName, setOutputMarkdownName] = useState<string | null>(null);
  const [outputHtmlName, setOutputHtmlName] = useState<string | null>(null);
  const [outputDoctagsName, setOutputDoctagsName] = useState<string | null>(null);
  const [outputCitationsName, setOutputCitationsName] = useState<string | null>(null);
  const [outputDownloadBusy, setOutputDownloadBusy] = useState<'docling' | 'markdown' | 'html' | 'doctags' | 'citations' | null>(null);
  const [resultsBlocks, setResultsBlocks] = useState<ParsedResultBlock[]>([]);
  const [activeResultsBlockId, setActiveResultsBlockId] = useState<string | null>(null);
  const [showAllBboxes, setShowAllBboxes] = useState(true);
  const [showMetadataBlocksPanel, setShowMetadataBlocksPanel] = useState(true);
  const [testRightTab, setTestRightTab] = useState<TestRightTab>('preview');
  const [pdfToolbarHost, setPdfToolbarHost] = useState<HTMLDivElement | null>(null);
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

  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [configCollapseState, setConfigCollapseState] = useState<ConfigCollapseState>('full');
  const isConfigCollapsed = configCollapseState === 'collapsed';

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

  const effectiveDocsPerPage = SHELL_DOCS_PER_PAGE;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(docs.length / effectiveDocsPerPage));
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
  }, [docs, effectiveDocsPerPage, selectedSourceUid]);

  useEffect(() => {
    setSelectedSourceUids((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set(docs.map((doc) => doc.source_uid));
      const next = prev.filter((sourceUid) => valid.has(sourceUid));
      return next.length === prev.length ? prev : next;
    });
  }, [docs]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(docs.length / effectiveDocsPerPage)),
    [docs.length, effectiveDocsPerPage],
  );
  const pagedDocs = useMemo(() => {
    const offset = (page - 1) * effectiveDocsPerPage;
    return docs.slice(offset, offset + effectiveDocsPerPage);
  }, [docs, effectiveDocsPerPage, page]);
  const hasDocs = docs.length > 0;
  const docRangeStart = hasDocs ? (page - 1) * effectiveDocsPerPage + 1 : 0;
  const docRangeEnd = hasDocs ? Math.min(docs.length, page * effectiveDocsPerPage) : 0;
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

  const handleOutputDownload = useCallback(async (kind: 'docling' | 'markdown' | 'html' | 'doctags' | 'citations') => {
    const output =
      kind === 'docling'
        ? {
            url: outputDoclingJsonUrl,
            locators: outputDoclingJsonLocators,
            filename: outputDoclingJsonName ?? 'output.docling.json',
          }
        : kind === 'markdown'
          ? {
              url: outputMarkdownUrl,
              locators: outputMarkdownLocators,
              filename: outputMarkdownName ?? 'output.md',
            }
          : kind === 'html'
            ? {
                url: outputHtmlUrl,
                locators: outputHtmlLocators,
                filename: outputHtmlName ?? 'output.html',
              }
            : kind === 'doctags'
              ? {
                url: outputDoctagsUrl,
                locators: outputDoctagsLocators,
                filename: outputDoctagsName ?? 'output.doctags',
              }
              : {
                url: outputCitationsUrl,
                locators: outputCitationsLocators,
                filename: outputCitationsName ?? 'output.citations.json',
              };

    const setSignedUrlForKind = (signedUrl: string) => {
      if (kind === 'docling') {
        setOutputDoclingJsonUrl(signedUrl);
        return;
      }
      if (kind === 'markdown') {
        setOutputMarkdownUrl(signedUrl);
        return;
      }
      if (kind === 'html') {
        setOutputHtmlUrl(signedUrl);
        return;
      }
      if (kind === 'doctags') {
        setOutputDoctagsUrl(signedUrl);
        return;
      }
      setOutputCitationsUrl(signedUrl);
    };

    if (!output.url && output.locators.length === 0) {
      setOutputsError(`Output artifact unavailable: ${output.filename}`);
      return;
    }

    setOutputsError(null);
    setOutputDownloadBusy(kind);
    try {
      let signedUrl = output.url;
      if (!signedUrl) {
        const resolved = await resolveSignedUrlForLocators(output.locators);
        if (!resolved.url) {
          throw new Error(resolved.error ?? 'Storage signed URL unavailable.');
        }
        signedUrl = resolved.url;
        setSignedUrlForKind(signedUrl);
      }

      try {
        await downloadFromSignedUrl(signedUrl, output.filename);
      } catch (downloadErr) {
        if (output.locators.length === 0) throw downloadErr;
        const refreshed = await resolveSignedUrlForLocators(output.locators);
        if (!refreshed.url || refreshed.url === signedUrl) throw downloadErr;
        setSignedUrlForKind(refreshed.url);
        await downloadFromSignedUrl(refreshed.url, output.filename);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOutputsError(`Failed to download ${output.filename}: ${message}`);
    } finally {
      setOutputDownloadBusy((current) => (current === kind ? null : current));
    }
  }, [
    outputDoclingJsonName,
    outputDoclingJsonLocators,
    outputDoclingJsonUrl,
    outputCitationsName,
    outputCitationsLocators,
    outputCitationsUrl,
    outputDoctagsName,
    outputDoctagsLocators,
    outputDoctagsUrl,
    outputHtmlName,
    outputHtmlLocators,
    outputHtmlUrl,
    outputMarkdownName,
    outputMarkdownLocators,
    outputMarkdownUrl,
  ]);

  const handleRunCitations = useCallback(async () => {
    if (!selectedDoc?.source_uid || !selectedDoc?.conv_uid) return;
    setRunCitationsBusy(true);
    setOutputsError(null);
    setOutputsNotice(null);
    try {
      const resp = await edgeJson<{
        ok: boolean;
        skipped?: boolean;
        citation_total?: number;
        message?: string;
      }>('generate-citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_uid: selectedDoc.source_uid }),
      });

      if (!resp.ok) {
        throw new Error(resp.message ?? 'Citations generation failed');
      }
      if (resp.skipped) {
        setOutputsNotice(resp.message ?? 'No legal citations detected for this document.');
      } else {
        setOutputsNotice(`Citations output generated (${resp.citation_total ?? 0} matches).`);
      }
      setOutputsReloadKey((value) => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOutputsError(`Failed to run citations: ${message}`);
    } finally {
      setRunCitationsBusy(false);
    }
  }, [selectedDoc]);

  useEffect(() => {
    let cancelled = false;

    const loadOutputs = async () => {
      setOutputsError(null);
      setOutputsLoading(false);
      setOutputDoclingJsonUrl(null);
      setOutputMarkdownUrl(null);
      setOutputHtmlUrl(null);
      setOutputDoctagsUrl(null);
      setOutputCitationsUrl(null);
      setOutputDoclingJsonLocators([]);
      setOutputMarkdownLocators([]);
      setOutputHtmlLocators([]);
      setOutputDoctagsLocators([]);
      setOutputCitationsLocators([]);
      setOutputDoclingJsonName(null);
      setOutputMarkdownName(null);
      setOutputHtmlName(null);
      setOutputDoctagsName(null);
      setOutputCitationsName(null);
      setOutputDownloadBusy(null);

      if (!selectedDoc || !selectedDoc.conv_uid) {
        return;
      }

      setOutputsLoading(true);

      const { data: repRows, error: repError } = await supabase
        .from(TABLES.conversionRepresentations)
        .select('representation_type, artifact_locator')
        .eq('conv_uid', selectedDoc.conv_uid);

      if (cancelled) return;
      if (repError) {
        setOutputsError(`Failed to load output artifacts: ${repError.message}`);
        setOutputsLoading(false);
        return;
      }

      type RepresentationRow = {
        representation_type: string;
        artifact_locator: string | null;
      };

      const representationLocators = new Map<string, string>();
      for (const row of (repRows ?? []) as RepresentationRow[]) {
        if (!row.artifact_locator) continue;
        representationLocators.set(row.representation_type, row.artifact_locator);
      }

      const doclingLocators = dedupeLocators([
        representationLocators.get('doclingdocument_json') ?? null,
        toDoclingJsonLocator(selectedDoc.conv_locator),
        toDoclingJsonLocator(selectedDoc.source_locator),
      ]);
      const markdownLocators = dedupeLocators([
        representationLocators.get('markdown_bytes') ?? null,
        toArtifactLocator(selectedDoc.conv_locator, 'md'),
        toArtifactLocator(selectedDoc.source_locator, 'md'),
      ]);
      const htmlLocators = dedupeLocators([
        representationLocators.get('html_bytes') ?? null,
        toArtifactLocator(selectedDoc.conv_locator, 'html'),
        toArtifactLocator(selectedDoc.source_locator, 'html'),
      ]);
      const doctagsLocators = dedupeLocators([
        representationLocators.get('doctags_text') ?? null,
        toArtifactLocator(selectedDoc.conv_locator, 'doctags'),
        toArtifactLocator(selectedDoc.source_locator, 'doctags'),
      ]);
      const citationsLocators = dedupeLocators([
        representationLocators.get('citations_json') ?? null,
      ]);

      setOutputDoclingJsonLocators(doclingLocators);
      setOutputMarkdownLocators(markdownLocators);
      setOutputHtmlLocators(htmlLocators);
      setOutputDoctagsLocators(doctagsLocators);
      setOutputCitationsLocators(citationsLocators);

      setOutputDoclingJsonName(getFilenameFromLocator(representationLocators.get('doclingdocument_json') ?? doclingLocators[0] ?? null));
      setOutputMarkdownName(getFilenameFromLocator(representationLocators.get('markdown_bytes') ?? markdownLocators[0] ?? null));
      setOutputHtmlName(getFilenameFromLocator(representationLocators.get('html_bytes') ?? htmlLocators[0] ?? null));
      setOutputDoctagsName(getFilenameFromLocator(representationLocators.get('doctags_text') ?? doctagsLocators[0] ?? null));
      setOutputCitationsName(getFilenameFromLocator(representationLocators.get('citations_json') ?? null));

      const [doclingSigned, markdownSigned, htmlSigned, doctagsSigned, citationsSigned] = await Promise.all([
        resolveSignedUrlForLocators(doclingLocators),
        resolveSignedUrlForLocators(markdownLocators),
        resolveSignedUrlForLocators(htmlLocators),
        resolveSignedUrlForLocators(doctagsLocators),
        resolveSignedUrlForLocators(citationsLocators),
      ]);

      if (cancelled) return;

      setOutputDoclingJsonUrl(doclingSigned.url);
      setOutputMarkdownUrl(markdownSigned.url);
      setOutputHtmlUrl(htmlSigned.url);
      setOutputDoctagsUrl(doctagsSigned.url);
      setOutputCitationsUrl(citationsSigned.url);
      setOutputsLoading(false);
    };

    void loadOutputs();
    return () => {
      cancelled = true;
    };
  }, [selectedDoc, outputsReloadKey]);

  useEffect(() => {
    setOutputsNotice(null);
  }, [selectedDoc?.source_uid]);

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
    setActiveResultsBlockId(null);
  }, [selectedDoc?.source_uid]);

  const handleResultsBlocksChange = useCallback((blocks: ParsedResultBlock[]) => {
    setResultsBlocks(blocks);
    setActiveResultsBlockId((current) => {
      if (current && blocks.some((block) => block.id === current)) {
        return current;
      }
      return blocks[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTestBlocks = async () => {
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
        .select('block_uid, block_index, block_type, block_content, block_locator')
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
          block_locator: { parser_block_type?: unknown } | null;
        };
        const snippet = typeof record.block_content === 'string'
          ? record.block_content.trim().replace(/\s+/g, ' ').slice(0, 280)
          : '';
        const parserBlockType = typeof record.block_locator?.parser_block_type === 'string'
          ? record.block_locator.parser_block_type
          : null;
        return {
          blockUid: record.block_uid,
          blockIndex: record.block_index,
          blockType: record.block_type,
          parserBlockType,
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
  }, [selectedDoc?.conv_uid]);

  useEffect(() => {
    if (isTransformTestSurface) return;
    if (testRightTab === 'grid') {
      setTestRightTab('preview');
    }
  }, [isTransformTestSurface, testRightTab]);

  const handleConfigToggle = useCallback(() => {
    setConfigCollapseState((current) => (current === 'collapsed' ? 'full' : 'collapsed'));
  }, []);

  const shellGuideLeftWidth = isExplorerCollapsed ? EXPLORER_WIDTH_COLLAPSED : SHELL_EXPLORER_WIDTH_DEFAULT;
  const shellGuideMiddleWidth = isConfigCollapsed ? CONFIG_WIDTH_COLLAPSED : CONFIG_WIDTH_DEFAULT;
  const topConfigToggleLabel = isConfigCollapsed ? 'Expand Configuration column' : 'Collapse Configuration column';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--shell-guide-left-width', `${shellGuideLeftWidth}px`);
    root.style.setProperty('--shell-guide-middle-width', `${shellGuideMiddleWidth}px`);

    return () => {
      root.style.removeProperty('--shell-guide-left-width');
      root.style.removeProperty('--shell-guide-middle-width');
    };
  }, [shellGuideLeftWidth, shellGuideMiddleWidth]);

  useLayoutEffect(() => {
    setShellTopSlots({
      hideLeftDivider: true,
      showRightInMinimal: isTransformTestSurface,
      left: (
        <Group
          gap={8}
          wrap="nowrap"
          justify={isExplorerCollapsed ? 'flex-end' : 'space-between'}
          className="top-command-bar-shell-slot"
        >
          <ActionIcon
            size="sm"
            variant="subtle"
            className="top-command-bar-shell-toggle"
            aria-label={isExplorerCollapsed ? 'Expand documents column' : 'Collapse documents column'}
            title={isExplorerCollapsed ? 'Expand documents column' : 'Collapse documents column'}
            onClick={() => setIsExplorerCollapsed((current) => !current)}
          >
            {isExplorerCollapsed ? (
              <DoubleArrowIcon size={PANE_CHEVRON_ICON.size} />
            ) : (
              <IconChevronLeft size={PANE_CHEVRON_ICON.size} stroke={PANE_CHEVRON_ICON.stroke} />
            )}
          </ActionIcon>
        </Group>
      ),
      middle: (
        <Group
          gap={8}
          wrap="nowrap"
          justify={isConfigCollapsed ? 'flex-end' : 'space-between'}
          className="top-command-bar-shell-slot"
        >
          {!isConfigCollapsed ? (
            <Text size="xs" fw={700} className="top-command-bar-shell-label">Configuration</Text>
          ) : null}
          <ActionIcon
            size="sm"
            variant="subtle"
            className="top-command-bar-shell-toggle"
            aria-label={topConfigToggleLabel}
            title={topConfigToggleLabel}
            onClick={handleConfigToggle}
          >
            {isConfigCollapsed ? (
              <DoubleArrowIcon size={PANE_CHEVRON_ICON.size} />
            ) : (
              <IconChevronLeft size={PANE_CHEVRON_ICON.size} stroke={PANE_CHEVRON_ICON.stroke} />
            )}
          </ActionIcon>
        </Group>
      ),
      right: isTransformTestSurface ? (
        <div className="top-bar-view-tabs" role="tablist" aria-label="View tabs">
          {([
            { value: 'preview', label: 'Preview' },
            { value: 'grid', label: 'Grid' },
            { value: 'blocks', label: 'Blocks' },
            { value: 'metadata', label: 'Metadata' },
            { value: 'outputs', label: 'Outputs' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={testRightTab === opt.value ? 'true' : 'false'}
              className={`top-bar-view-tab${testRightTab === opt.value ? ' is-active' : ''}`}
              onClick={() => setTestRightTab(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <Text size="xs" fw={700} className="top-command-bar-shell-label">Preview</Text>
      ),
    });
  }, [handleConfigToggle, isConfigCollapsed, isExplorerCollapsed, isTransformTestSurface, setShellTopSlots, testRightTab, setTestRightTab, topConfigToggleLabel]);

  useEffect(() => () => setShellTopSlots(null), [setShellTopSlots]);

  const headerTitle = resolveProjectDetailHeaderTitle(mode);
  useShellHeaderTitle({
    title: headerTitle,
    subtitle: project?.description ?? undefined,
  });

  if (loading) return <Center mt="xl"><Loader /></Center>;
  if (!project) return <ErrorAlert message={error ?? 'Project not found'} />;

  const effectiveExplorerWidth = isExplorerCollapsed ? EXPLORER_WIDTH_COLLAPSED : SHELL_EXPLORER_WIDTH_DEFAULT;
  const effectiveConfigWidth = isConfigCollapsed ? CONFIG_WIDTH_COLLAPSED : CONFIG_WIDTH_DEFAULT;
  const layoutStyle = {
    '--parse-explorer-width': `${effectiveExplorerWidth}px`,
    '--parse-config-width': `${effectiveConfigWidth}px`,
  } as CSSProperties;

  const isMarkdownTextPreview = (
    previewKind === 'text'
    && selectedDoc?.source_type?.toLowerCase() === 'md'
  );
  const isRightPreviewTab = testRightTab === 'preview';
  const isRightMetadataTab = testRightTab === 'metadata';
  const isRightBlocksTab = testRightTab === 'blocks';
  const isRightGridTab = isTransformTestSurface && testRightTab === 'grid';
  const isRightOutputsTab = testRightTab === 'outputs';
  const hasDoclingOutput = outputDoclingJsonLocators.length > 0 || !!outputDoclingJsonUrl;
  const hasMarkdownOutput = outputMarkdownLocators.length > 0 || !!outputMarkdownUrl;
  const hasHtmlOutput = outputHtmlLocators.length > 0 || !!outputHtmlUrl;
  const hasDoctagsOutput = outputDoctagsLocators.length > 0 || !!outputDoctagsUrl;
  const hasCitationsOutput = outputCitationsLocators.length > 0 || !!outputCitationsUrl;
  const outputFiles: OutputFileRow[] = useMemo(() => [
    { kind: 'docling', name: outputDoclingJsonName, available: hasDoclingOutput },
    { kind: 'markdown', name: outputMarkdownName, available: hasMarkdownOutput },
    { kind: 'html', name: outputHtmlName, available: hasHtmlOutput },
    { kind: 'doctags', name: outputDoctagsName, available: hasDoctagsOutput },
    { kind: 'citations', name: outputCitationsName, available: hasCitationsOutput },
  ], [
    outputDoclingJsonName, hasDoclingOutput,
    outputMarkdownName, hasMarkdownOutput,
    outputHtmlName, hasHtmlOutput,
    outputDoctagsName, hasDoctagsOutput,
    outputCitationsName, hasCitationsOutput,
  ]);
  const shouldShowPdfToolbarHost = isRightPreviewTab && previewKind === 'pdf';
  const showMetadataOverlayToggle = (
    isRightMetadataTab
    && !!selectedDoc
    && isPdfDocument(selectedDoc)
    && !!selectedDoc.conv_uid
  );
  const activePreviewOptions = isTransformTestSurface
    ? [
        { value: 'preview', label: 'Preview' },
        { value: 'metadata', label: 'Metadata' },
        { value: 'blocks', label: 'Blocks' },
        { value: 'grid', label: 'Grid' },
        { value: 'outputs', label: 'Outputs' },
      ]
    : [
        { value: 'preview', label: 'Preview' },
        { value: 'metadata', label: 'Metadata' },
        { value: 'blocks', label: 'Blocks' },
        { value: 'outputs', label: 'Outputs' },
      ];
  const activePreviewLabel = activePreviewOptions.find((option) => option.value === testRightTab)?.label ?? testRightTab;
  const middleTabsControl = (
    <MenuRoot positioning={{ placement: 'bottom-start' }}>
      <MenuTrigger asChild>
        <button
          type="button"
          className="parse-view-menu-button inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          {activePreviewLabel}
          <IconChevronDown size={12} />
        </button>
      </MenuTrigger>
      <MenuPortal>
        <MenuPositioner>
          <MenuContent className="parse-view-menu-dropdown min-w-[180px]">
            {activePreviewOptions.map((option) => {
              const isActive = option.value === testRightTab;
              return (
                <MenuItem
                  key={option.value}
                  value={`preview-${option.value}`}
                  leftSection={isActive ? <IconCheck size={14} /> : <span style={{ width: 14 }} />}
                  onClick={() => {
                    setTestRightTab(option.value as TestRightTab);
                  }}
                >
                  {option.label}
                </MenuItem>
              );
            })}
          </MenuContent>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
  const layoutClassName = `parse-playground-layout parse-playground-layout--test parse-playground-layout--no-explorer schema-layout-test-page${isExplorerCollapsed ? ' is-left-collapsed' : ''}`;
  const rightPaneClassName = `parse-playground-right${isConfigCollapsed ? ' is-collapsed' : ''} schema-layout-test-right`;
  const middleTabsClassName = 'parse-middle-view-tabs schema-layout-middle-header';
  const parseConfigRootClassName = 'parse-config-root schema-layout-test-config-root';
  const parseConfigScrollClassName = 'parse-config-scroll schema-layout-test-config-scroll';
  const extractConfigRootClassName = 'extract-config-root schema-layout-test-config-root';
  const extractConfigScrollClassName = 'extract-config-scroll schema-layout-test-config-scroll';
  const parseConfigViewTabs = (
    <Group gap={10} wrap="nowrap" className="schema-layout-right-tabs">
      <Text
        size="sm"
        fw={parseConfigView === 'Basic' ? 700 : 600}
        c={parseConfigView === 'Basic' ? undefined : 'dimmed'}
        className={`parse-middle-tab${parseConfigView === 'Basic' ? ' is-active' : ''}`}
        onClick={() => setParseConfigView('Basic')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Basic
      </Text>
      <Text
        size="sm"
        fw={parseConfigView === 'Advanced' ? 700 : 600}
        c={parseConfigView === 'Advanced' ? undefined : 'dimmed'}
        className={`parse-middle-tab${parseConfigView === 'Advanced' ? ' is-active' : ''}`}
        onClick={() => setParseConfigView('Advanced')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Advanced
      </Text>
    </Group>
  );
  const extractConfigViewTabs = (
    <Group gap={10} wrap="nowrap" className="schema-layout-right-tabs">
      <Text
        size="sm"
        fw={extractConfigView === 'Basic' ? 700 : 600}
        c={extractConfigView === 'Basic' ? undefined : 'dimmed'}
        className={`parse-middle-tab${extractConfigView === 'Basic' ? ' is-active' : ''}`}
        onClick={() => setExtractConfigView('Basic')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Basic
      </Text>
      <Text
        size="sm"
        fw={extractConfigView === 'Advanced' ? 700 : 600}
        c={extractConfigView === 'Advanced' ? undefined : 'dimmed'}
        className={`parse-middle-tab${extractConfigView === 'Advanced' ? ' is-active' : ''}`}
        onClick={() => setExtractConfigView('Advanced')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Advanced
      </Text>
      <Text
        size="sm"
        fw={extractConfigView === 'Schema' ? 700 : 600}
        c={extractConfigView === 'Schema' ? undefined : 'dimmed'}
        className={`parse-middle-tab${extractConfigView === 'Schema' ? ' is-active' : ''}`}
        onClick={() => setExtractConfigView('Schema')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        Schema
      </Text>
    </Group>
  );
  return (
    <>
      {error && <ErrorAlert message={error} />}

      <Box
        className={layoutClassName}
        data-surface="test"
        style={layoutStyle}
      >
        <Box className={`parse-playground-work${isTransformTestSurface ? ' is-transform-grid' : ''}`}>
          <Box className="parse-playground-preview">
            <Box className="parse-preview-frame">
              <Group
                justify={isRightGridTab ? 'flex-start' : 'space-between'}
                align="center"
                className={middleTabsClassName}
                wrap="nowrap"
              >
                <Group gap={12} align="center" wrap="nowrap">
                  {!isTransformTestSurface && middleTabsControl}
                </Group>
                {shouldShowPdfToolbarHost && (
                  <Box className="schema-layout-middle-toolbar-host parse-preview-toolbar-host" ref={setPdfToolbarHost} />
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
                        hideToolbar={!pdfToolbarHost}
                        toolbarPortalTarget={pdfToolbarHost}
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
                  <MetadataTab
                    selectedDoc={selectedDoc}
                    previewUrl={previewUrl}
                    previewKind={previewKind}
                    previewLoading={previewLoading}
                    resultsDoclingJsonUrl={resultsDoclingJsonUrl}
                    resultsDoclingLoading={resultsDoclingLoading}
                    resultsDoclingError={resultsDoclingError}
                    activeResultsBlockId={activeResultsBlockId}
                    showAllBboxes={showAllBboxes}
                    showMetadataBlocksPanel={showMetadataBlocksPanel}
                    onActiveResultsBlockIdChange={setActiveResultsBlockId}
                    onShowAllBboxesChange={setShowAllBboxes}
                    onShowMetadataBlocksPanelChange={setShowMetadataBlocksPanel}
                    onResultsBlocksChange={handleResultsBlocksChange}
                  />
                )}

                {isRightBlocksTab && (
                  <BlocksTab
                    selectedDoc={selectedDoc}
                    testBlocks={testBlocks}
                    testBlocksLoading={testBlocksLoading}
                    testBlocksError={testBlocksError}
                    blockTypeRegistry={blockTypeRegistry}
                  />
                )}

                {isRightOutputsTab && (
                  <OutputsTab
                    selectedDoc={selectedDoc}
                    loading={outputsLoading}
                    error={outputsError}
                    files={outputFiles}
                    downloadBusy={outputDownloadBusy}
                    onDownload={(kind) => void handleOutputDownload(kind)}
                  />
                )}

                {isRightGridTab && (
                  <GridTab
                    selectedDoc={selectedDoc}
                    selectedRunId={selectedRunId}
                    selectedRun={selectedRun}
                    outputsNotice={outputsNotice}
                    outputsError={outputsError}
                    runCitationsBusy={runCitationsBusy}
                    hasCitationsOutput={hasCitationsOutput}
                    onRunCitations={() => void handleRunCitations()}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className={rightPaneClassName}>
          {isConfigCollapsed
            ? <Box className="schema-layout-right-collapsed-body" />
            : (isExtractMode ? (
            <Stack gap={0} className={extractConfigRootClassName}>
                <Group justify="space-between" gap={10} wrap="nowrap" className="schema-layout-right-controls">
                  {extractConfigViewTabs}
                  <Group gap={6} wrap="nowrap" className="parse-config-run-btn">
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      aria-label="Run extract"
                      title="Run extract"
                    >
                      <IconPlayerPlay size={CONFIG_ACTION_ICON.size} stroke={CONFIG_ACTION_ICON.stroke} />
                    </ActionIcon>
                  </Group>
                </Group>

              <Stack gap="sm" className={extractConfigScrollClassName}>

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
            </Stack>
            ) : isTransformMode ? (
            <Stack gap={0} className="parse-config-root" />
            ) : (
            <Stack gap={0} className={parseConfigRootClassName}>
                <Group justify="space-between" gap={10} wrap="nowrap" className="schema-layout-right-controls">
                  {parseConfigViewTabs}
                  <Group gap={6} wrap="nowrap" className="parse-config-run-btn">
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      aria-label="Save config"
                      title="Save config"
                    >
                      <IconDeviceFloppy size={CONFIG_ACTION_ICON.size} stroke={CONFIG_ACTION_ICON.stroke} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      aria-label="Run parse"
                      title="Run parse"
                      loading={parseLoading}
                      onClick={() => void handleRunParse()}
                    >
                      <IconPlayerPlay size={CONFIG_ACTION_ICON.size} stroke={CONFIG_ACTION_ICON.stroke} />
                    </ActionIcon>
                  </Group>
                </Group>

                <Stack gap="sm" className={parseConfigScrollClassName}>

              {parseError && (
                <Alert color="red" variant="light" withCloseButton onClose={() => setParseError(null)}>
                  <Text size="xs">{parseError}</Text>
                </Alert>
              )}

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
            </Stack>
          ))}
        </Box>
      </Box>

      <DialogRoot open={deleteTargetDoc !== null} onOpenChange={(e) => { if (!e.open) closeDeleteDialog(); }}>
        <DialogContent>
          <DialogCloseTrigger />
          <DialogTitle>Delete document</DialogTitle>
          <DialogBody>
            <Text size="sm">
              This will permanently delete{' '}
              <Text span fw={700}>{deleteTargetDoc?.doc_title ?? 'this document'}</Text>
              {' '}and its related data. This cannot be undone.
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="default" onClick={closeDeleteDialog} disabled={deletingDoc}>Cancel</Button>
            <Button color="red" onClick={() => void handleConfirmDeleteDocument()} loading={deletingDoc}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
