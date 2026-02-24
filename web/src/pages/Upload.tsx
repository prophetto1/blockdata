import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PptxPreview } from '@/components/documents/PptxPreview';
import { ProjectParseUppyUploader, type UploadBatchResult } from '@/components/documents/ProjectParseUppyUploader';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';

type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'docx' | 'pptx' | 'file';
type UploadDocumentRow = DocumentRow & {
  source_locator?: string | null;
  conv_locator?: string | null;
};

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
const DOCX_SOURCE_TYPES = new Set(['docx', 'docm', 'dotx', 'dotm']);
const DOCX_EXTENSIONS = new Set(['docx', 'docm', 'dotx', 'dotm']);
const PPTX_SOURCE_TYPES = new Set(['pptx', 'pptm', 'ppsx']);
const PPTX_EXTENSIONS = new Set(['pptx', 'pptm', 'ppsx']);

function getExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index < 0 || index === name.length - 1) return '';
  return name.slice(index + 1).toLowerCase();
}

function getSourceLocatorExtension(doc: UploadDocumentRow): string {
  return getExtension(doc.source_locator ?? '');
}

function isPdfDocument(doc: UploadDocumentRow): boolean {
  if (doc.source_type.toLowerCase() === 'pdf') return true;
  return getSourceLocatorExtension(doc) === 'pdf';
}

function isImageDocument(doc: UploadDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (IMAGE_SOURCE_TYPES.has(sourceType)) return true;
  return IMAGE_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function isTextDocument(doc: UploadDocumentRow): boolean {
  return TEXT_SOURCE_TYPES.has(doc.source_type.toLowerCase());
}

function isDocxDocument(doc: UploadDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (DOCX_SOURCE_TYPES.has(sourceType)) return true;
  return DOCX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function isPptxDocument(doc: UploadDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (PPTX_SOURCE_TYPES.has(sourceType)) return true;
  return PPTX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

function getStatusColor(status: UploadDocumentRow['status']): 'green' | 'yellow' | 'red' {
  if (status === 'conversion_failed' || status === 'ingest_failed') return 'red';
  if (status === 'converting') return 'yellow';
  return 'green';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

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

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState<string>('');
  const [docs, setDocs] = useState<UploadDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);

  const [previewKind, setPreviewKind] = useState<PreviewKind>('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const splitRootRef = useRef<HTMLDivElement | null>(null);
  const splitResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 560;
    const raw = window.localStorage.getItem('upload.workspace.left_width');
    const parsed = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(parsed)) return 560;
    return Math.max(380, Math.min(860, parsed));
  });
  const [isSplitResizing, setIsSplitResizing] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!projectId) return;
    setDocsLoading(true);
    setDocsError(null);
    const { data, error } = await supabase
      .from(TABLES.documents)
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });
    if (error) {
      setDocsError(error.message);
      setDocsLoading(false);
      return;
    }
    setDocs((data ?? []) as UploadDocumentRow[]);
    setDocsLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from(TABLES.projects)
      .select('project_name')
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProjectName((data as { project_name: string }).project_name);
      });
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocs();
  }, [loadDocs]);

  const successfulDocs = useMemo(
    () => docs.filter((doc) => doc.status !== 'conversion_failed' && doc.status !== 'ingest_failed'),
    [docs],
  );

  const resolvedSelectedSourceUid = useMemo(() => {
    if (selectedSourceUid && successfulDocs.some((doc) => doc.source_uid === selectedSourceUid)) {
      return selectedSourceUid;
    }
    return successfulDocs[0]?.source_uid ?? null;
  }, [selectedSourceUid, successfulDocs]);

  const selectedDoc = useMemo(
    () => successfulDocs.find((doc) => doc.source_uid === resolvedSelectedSourceUid) ?? null,
    [resolvedSelectedSourceUid, successfulDocs],
  );

  const handleBatchUploaded = useCallback(async (result: UploadBatchResult) => {
    await loadDocs();
    if (result.uploadedSourceUids.length > 0) {
      setSelectedSourceUid(result.uploadedSourceUids[0]);
    }
  }, [loadDocs]);

  const handleSplitResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    splitResizeRef.current = {
      startX: event.clientX,
      startWidth: leftPaneWidth,
    };
    setIsSplitResizing(true);
  }, [leftPaneWidth]);

  useEffect(() => {
    if (!isSplitResizing) return;

    const onPointerMove = (event: PointerEvent) => {
      const state = splitResizeRef.current;
      const root = splitRootRef.current;
      if (!state || !root) return;

      const totalWidth = root.clientWidth;
      if (!Number.isFinite(totalWidth) || totalWidth <= 0) return;

      const LEFT_MIN = 380;
      const RIGHT_MIN = 460;
      const maxLeft = Math.max(LEFT_MIN, totalWidth - RIGHT_MIN - 8);
      const delta = event.clientX - state.startX;
      const nextWidth = Math.max(LEFT_MIN, Math.min(maxLeft, state.startWidth + delta));
      setLeftPaneWidth(nextWidth);
    };

    const stopResize = () => {
      splitResizeRef.current = null;
      setIsSplitResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, [isSplitResizing]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('upload.workspace.left_width', String(Math.round(leftPaneWidth)));
  }, [leftPaneWidth]);

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

      const { url: signedUrl, error: signedUrlError } = await resolveSignedUrlForLocators([
        selectedDoc.source_locator,
        selectedDoc.conv_locator,
      ]);

      if (cancelled) return;

      if (!signedUrl) {
        setPreviewKind('none');
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
          const text = await response.text();
          if (cancelled) return;
          const truncated = text.length > 200000 ? `${text.slice(0, 200000)}\n\n[Preview truncated]` : text;
          setPreviewKind('text');
          setPreviewText(truncated);
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        } catch {
          if (cancelled) return;
          setPreviewKind('file');
          setPreviewUrl(signedUrl);
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

  useShellHeaderTitle({
    title: 'Upload',
    subtitle: projectName ? `Project: ${projectName}` : 'Upload documents and preview only',
  });

  if (!projectId) return null;

  return (
    <>
      <Box
        ref={splitRootRef}
        className="upload-workspace"
        style={{ ['--upload-left-width' as string]: `${leftPaneWidth}px` }}
      >
        <Box className="upload-workspace-pane upload-workspace-pane-left">
          <Stack gap="md" className="upload-left-stack">
            <Paper p="md" radius="md" className="upload-left-upload-card">
              <Stack gap="xs">
                <ProjectParseUppyUploader
                  projectId={projectId}
                  ingestMode="upload_only"
                  onBatchUploaded={handleBatchUploaded}
                  enableRemoteSources
                  hideHeader
                  companionUrl={import.meta.env.VITE_UPPY_COMPANION_URL as string | undefined}
                  height={220}
                />
              </Stack>
            </Paper>

            <Paper p="md" radius="md" className="upload-left-table-card">
              <Stack gap="xs" className="upload-left-table-content">
                <Text size="sm" fw={700}>Upload Success List</Text>
                {docsError && (
                  <Alert color="red" variant="light">
                    {docsError}
                  </Alert>
                )}
                {docsLoading ? (
                  <Center style={{ flex: 1 }}>
                    <Loader size="sm" />
                  </Center>
                ) : successfulDocs.length === 0 ? (
                  <Center style={{ flex: 1 }}>
                    <Text size="sm" c="dimmed">No successful uploads yet.</Text>
                  </Center>
                ) : (
                  <ScrollArea type="auto" className="upload-left-table-scroll">
                    <Table stickyHeader highlightOnHover horizontalSpacing="sm" verticalSpacing={6}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Document</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th>Uploaded</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {successfulDocs.map((doc) => {
                          const active = doc.source_uid === resolvedSelectedSourceUid;
                          return (
                            <Table.Tr
                              key={doc.source_uid}
                              onClick={() => setSelectedSourceUid(doc.source_uid)}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: active ? 'var(--mantine-color-blue-light)' : undefined,
                              }}
                            >
                              <Table.Td>
                                <Text size="xs" fw={active ? 700 : 600} lineClamp={1}>
                                  {doc.doc_title}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs">{doc.source_type.toUpperCase()}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge size="xs" color={getStatusColor(doc.status)} variant="light">
                                  {doc.status}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs" c="dimmed">{formatDateTime(doc.uploaded_at)}</Text>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Box>

        <Box
          className={`upload-workspace-resizer${isSplitResizing ? ' is-active' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize upload and preview panes"
          onPointerDown={handleSplitResizeStart}
        />

        <Box className="upload-workspace-pane upload-workspace-pane-right">
          <Paper p="md" radius="md" className="upload-preview-paper">
            <Stack gap="xs" className="upload-preview-stack">
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw={700}>Preview</Text>
                {selectedDoc && (
                  <Text size="xs" c="dimmed" lineClamp={1}>{selectedDoc.doc_title}</Text>
                )}
              </Group>

              <Box className="upload-preview-body">
                {!selectedDoc && (
                  <Center h="100%">
                    <Text size="sm" c="dimmed">Select a document from Upload Success List.</Text>
                  </Center>
                )}

                {selectedDoc && previewLoading && (
                  <Center h="100%">
                    <Loader size="sm" />
                  </Center>
                )}

                {selectedDoc && !previewLoading && previewError && (
                  <Alert color="red" variant="light">
                    {previewError}
                  </Alert>
                )}

                {selectedDoc && !previewLoading && previewKind === 'pdf' && previewUrl && (
                  <PdfPreview
                    key={`${selectedDoc.source_uid}:${previewUrl}`}
                    title={selectedDoc.doc_title}
                    url={previewUrl}
                    hideToolbar
                  />
                )}

                {selectedDoc && !previewLoading && previewKind === 'image' && previewUrl && (
                  <Center h="100%">
                    <img src={previewUrl} alt={selectedDoc.doc_title} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  </Center>
                )}

                {selectedDoc && !previewLoading && previewKind === 'text' && (
                  <ScrollArea h="100%">
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{previewText ?? ''}</pre>
                  </ScrollArea>
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
                    <Button component="a" href={previewUrl ?? undefined} target="_blank" rel="noreferrer" size="xs" variant="light">
                      Open file
                    </Button>
                  </Center>
                )}
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </>
  );
}
