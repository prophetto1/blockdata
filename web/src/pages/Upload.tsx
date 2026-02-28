import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PptxPreview } from '@/components/documents/PptxPreview';
import { ProjectParseUppyUploader, type UploadBatchResult } from '@/components/documents/ProjectParseUppyUploader';
import { NativeSelect } from '@/components/ui/native-select';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import './Upload.css';

type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'docx' | 'pptx' | 'file';
type UploadDocumentRow = DocumentRow & {
  source_locator?: string | null;
  conv_locator?: string | null;
};

const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
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

type ParserTrack = 'mdast' | 'docling' | 'pandoc';
type TrackInfo = { track: ParserTrack; rep: string; badgeClass: string };

const TRACK_MAP: Record<string, TrackInfo> = {
  md: { track: 'mdast', rep: 'markdown_bytes', badgeClass: 'bg-teal-500/15 text-teal-400' },
  txt: { track: 'mdast', rep: 'markdown_bytes', badgeClass: 'bg-teal-500/15 text-teal-400' },
  docx: { track: 'docling', rep: 'doclingdocument_json', badgeClass: 'bg-violet-500/15 text-violet-400' },
  pdf: { track: 'docling', rep: 'doclingdocument_json', badgeClass: 'bg-violet-500/15 text-violet-400' },
  pptx: { track: 'docling', rep: 'doclingdocument_json', badgeClass: 'bg-violet-500/15 text-violet-400' },
  xlsx: { track: 'docling', rep: 'doclingdocument_json', badgeClass: 'bg-violet-500/15 text-violet-400' },
  html: { track: 'docling', rep: 'doclingdocument_json', badgeClass: 'bg-violet-500/15 text-violet-400' },
  csv: { track: 'docling', rep: 'doclingdocument_json', badgeClass: 'bg-violet-500/15 text-violet-400' },
  rst: { track: 'pandoc', rep: 'pandoc_ast_json', badgeClass: 'bg-orange-500/15 text-orange-400' },
  latex: { track: 'pandoc', rep: 'pandoc_ast_json', badgeClass: 'bg-orange-500/15 text-orange-400' },
  odt: { track: 'pandoc', rep: 'pandoc_ast_json', badgeClass: 'bg-orange-500/15 text-orange-400' },
  epub: { track: 'pandoc', rep: 'pandoc_ast_json', badgeClass: 'bg-orange-500/15 text-orange-400' },
  rtf: { track: 'pandoc', rep: 'pandoc_ast_json', badgeClass: 'bg-orange-500/15 text-orange-400' },
  org: { track: 'pandoc', rep: 'pandoc_ast_json', badgeClass: 'bg-orange-500/15 text-orange-400' },
};

function getTrackInfo(sourceType: string): TrackInfo {
  return TRACK_MAP[sourceType.toLowerCase()] ?? {
    track: 'mdast' as ParserTrack,
    rep: 'markdown_bytes',
    badgeClass: 'bg-zinc-500/15 text-zinc-400',
  };
}

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

function isUploadFailed(status: UploadDocumentRow['status']): boolean {
  return status === 'ingest_failed';
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

/* ── Inline Pagination (Tailwind, zero Mantine) ── */

const PAGE_BTN = 'flex h-6 min-w-6 items-center justify-center rounded text-xs select-none';

function SimplePagination({
  value,
  total,
  onChange,
}: {
  value: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= value - 1 && i <= value + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className={cn(PAGE_BTN, 'text-muted-foreground hover:bg-accent disabled:opacity-30')}
      >
        &#8249;
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">&#8230;</span>
        ) : (
          <button
            type="button"
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              PAGE_BTN,
              p === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={value >= total}
        onClick={() => onChange(value + 1)}
        className={cn(PAGE_BTN, 'text-muted-foreground hover:bg-accent disabled:opacity-30')}
      >
        &#8250;
      </button>
    </div>
  );
}

/* ── Page Component ── */

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectName, setProjectName] = useState<string>('');
  const [docs, setDocs] = useState<UploadDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  const [previewKind, setPreviewKind] = useState<PreviewKind>('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  /* ── Draggable split resizer ── */
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

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(docs.length / rowsPerPage));
  const activePage = Math.min(page, totalPages);
  const pagedDocs = useMemo(() => {
    const offset = (activePage - 1) * rowsPerPage;
    return docs.slice(offset, offset + rowsPerPage);
  }, [activePage, rowsPerPage, docs]);
  const docRangeStart = docs.length > 0 ? (activePage - 1) * rowsPerPage + 1 : 0;
  const docRangeEnd = docs.length > 0 ? Math.min(docs.length, activePage * rowsPerPage) : 0;

  const resolvedSelectedSourceUid = useMemo(() => {
    if (selectedSourceUid && docs.some((doc) => doc.source_uid === selectedSourceUid)) {
      return selectedSourceUid;
    }
    return docs[0]?.source_uid ?? null;
  }, [selectedSourceUid, docs]);

  const selectedDoc = useMemo(
    () => docs.find((doc) => doc.source_uid === resolvedSelectedSourceUid) ?? null,
    [resolvedSelectedSourceUid, docs],
  );

  const handleBatchUploaded = useCallback(async (result: UploadBatchResult) => {
    await loadDocs();
    setPage(1);
    if (result.uploadedSourceUids.length > 0) {
      setSelectedSourceUid(result.uploadedSourceUids[0]);
    }
  }, [loadDocs]);

  /* ── Preview loading ── */
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
    <div className="upload-workspace">
      {/* ── Left pane ── */}
      <div className="upload-workspace-pane upload-workspace-pane-left">
        <div className="upload-left-stack flex flex-col gap-4">
          {/* Upload card */}
          <div className="upload-left-upload-card bg-card p-4">
            <ProjectParseUppyUploader
              projectId={projectId}
              ingestMode="upload_only"
              onBatchUploaded={handleBatchUploaded}
              enableRemoteSources
              hideHeader
              companionUrl={import.meta.env.VITE_UPPY_COMPANION_URL as string | undefined}
              height={220}
            />
          </div>

          {/* Table card */}
          <div className="upload-left-table-card bg-card p-4">
            <div className="upload-left-table-content flex flex-col gap-2">
              {/* Header */}
              <div className="flex min-h-[22px] items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">Uploads</span>
                {docs.length > 0 && (
                  <span className="text-xs text-muted-foreground">{docs.length} docs</span>
                )}
              </div>

              {docsError && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {docsError}
                </div>
              )}

              {docsLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : docs.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <span className="text-sm text-muted-foreground">No uploads yet.</span>
                </div>
              ) : (
                <div className="upload-left-table-scroll overflow-auto rounded-lg border border-border">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="px-3 py-1 font-medium">Document</th>
                        <th className="px-3 py-1 font-medium">Type</th>
                        <th className="px-3 py-1 font-medium">Track</th>
                        <th className="px-3 py-1 font-medium">Status</th>
                        <th className="px-3 py-1 font-medium">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDocs.map((doc) => {
                        const active = doc.source_uid === resolvedSelectedSourceUid;
                        const trackInfo = getTrackInfo(doc.source_type);
                        return (
                          <tr
                            key={doc.source_uid}
                            onClick={() => setSelectedSourceUid(doc.source_uid)}
                            className={cn(
                              'cursor-pointer border-b border-border/50 hover:bg-accent',
                              active && 'bg-blue-500/10',
                            )}
                          >
                            <td className="px-3 py-[3px]">
                              <span className={cn('text-xs line-clamp-1', active ? 'font-bold' : 'font-semibold')}>
                                {doc.doc_title}
                              </span>
                            </td>
                            <td className="px-3 py-[3px]">
                              <span className="text-xs">{doc.source_type.toUpperCase()}</span>
                            </td>
                            <td className="px-3 py-[3px]">
                              <span className={cn(
                                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
                                trackInfo.badgeClass,
                              )}>
                                {trackInfo.track}
                              </span>
                            </td>
                            <td className="px-3 py-[3px]">
                              <span className={cn(
                                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
                                isUploadFailed(doc.status)
                                  ? 'bg-red-500/15 text-red-400'
                                  : 'bg-green-500/15 text-green-400',
                              )}>
                                {isUploadFailed(doc.status) ? 'failed' : 'success'}
                              </span>
                            </td>
                            <td className="px-3 py-[3px]">
                              <span className="text-xs text-muted-foreground">{formatDateTime(doc.uploaded_at)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Left footer: pagination */}
              {!docsLoading && docs.length > 0 && (
                <div className="flex h-9 flex-none items-center justify-between border-t border-border px-1">
                  <span className="text-xs text-muted-foreground">
                    {docRangeStart}-{docRangeEnd} of {docs.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Rows</span>
                      <NativeSelect
                        className="h-[26px] min-w-[58px]"
                        aria-label="Rows per page"
                        value={String(rowsPerPage)}
                        onChange={(event) => {
                          setRowsPerPage(Number(event.target.value));
                          setPage(1);
                        }}
                        options={ROWS_PER_PAGE_OPTIONS.map((value) => ({
                          value: String(value),
                          label: String(value),
                        }))}
                      />
                    </div>
                    <SimplePagination
                      value={activePage}
                      onChange={setPage}
                      total={totalPages}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="upload-workspace-divider" aria-hidden />

      {/* ── Right pane: preview ── */}
      <div className="upload-workspace-pane upload-workspace-pane-right">
        <div className="upload-preview-paper bg-card p-4">
          <div className="upload-preview-stack flex flex-col gap-2">
            {/* Preview header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-foreground">Preview</span>
              {selectedDoc && (
                <span className="text-xs text-muted-foreground truncate">{selectedDoc.doc_title}</span>
              )}
            </div>

            {/* Preview content */}
            <div className="upload-preview-body">
              {!selectedDoc && (
                <div className="flex h-full items-center justify-center">
                  <span className="text-sm text-muted-foreground">Select a document to preview.</span>
                </div>
              )}

              {selectedDoc && previewLoading && (
                <div className="flex h-full items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}

              {selectedDoc && !previewLoading && previewError && (
                <div className="p-2">
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {previewError}
                  </div>
                </div>
              )}

              {selectedDoc && !previewLoading && previewKind === 'pdf' && previewUrl && (
                <PdfPreview
                  key={`${selectedDoc.source_uid}:${previewUrl}`}
                  url={previewUrl}
                />
              )}

              {selectedDoc && !previewLoading && previewKind === 'image' && previewUrl && (
                <div className="flex h-full items-center justify-center">
                  <img src={previewUrl} alt={selectedDoc.doc_title} className="max-h-full max-w-full" />
                </div>
              )}

              {selectedDoc && !previewLoading && previewKind === 'text' && (
                <div className="h-full overflow-auto">
                  <pre className="m-0 whitespace-pre-wrap">{previewText ?? ''}</pre>
                </div>
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
                <div className="flex h-full items-center justify-center">
                  <a
                    href={previewUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    Open file
                  </a>
                </div>
              )}
            </div>

            {/* Preview footer */}
            <div className="flex h-9 flex-none items-center justify-between border-t border-border px-2.5">
              <span className="text-xs text-muted-foreground">
                {selectedDoc ? selectedDoc.source_type.toUpperCase() : 'No document selected'}
              </span>
              {selectedDoc && (
                <span className="text-xs text-muted-foreground truncate">{selectedDoc.doc_title}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
