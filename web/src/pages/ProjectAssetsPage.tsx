import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileUpload } from '@ark-ui/react/file-upload';
import {
  IconLoader2,
  IconTrash,
  IconDownload,
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconBrandGoogleDrive,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import {
  type ProjectDocumentRow,
  getDocumentFormat,
  formatBytes,
  downloadFromSignedUrl,
  resolveSignedUrlForLocators,
} from '@/lib/projectDetailHelpers';
import { useDirectUpload, type StagedFile } from '@/hooks/useDirectUpload';
import { useGoogleDrivePicker } from '@/hooks/useGoogleDrivePicker';
import { edgeJson } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// ── Sort ────────────────────────────────────────────────────────────────────

type SortField = 'name' | 'format' | 'size' | 'status';
type SortDirection = 'asc' | 'desc';

function compareRows(a: ProjectDocumentRow, b: ProjectDocumentRow, field: SortField, dir: SortDirection): number {
  let cmp = 0;
  switch (field) {
    case 'name':
      cmp = (a.doc_title ?? '').localeCompare(b.doc_title ?? '', undefined, { sensitivity: 'base' });
      break;
    case 'format':
      cmp = getDocumentFormat(a).localeCompare(getDocumentFormat(b));
      break;
    case 'size':
      cmp = (a.source_filesize ?? 0) - (b.source_filesize ?? 0);
      break;
    case 'status':
      cmp = (a.status ?? '').localeCompare(b.status ?? '');
      break;
  }
  return dir === 'asc' ? cmp : -cmp;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function FileStatusIcon({ status }: { status: StagedFile['status'] }) {
  switch (status) {
    case 'uploading':
      return <IconLoader2 size={14} className="animate-spin text-primary" />;
    case 'done':
      return <IconCheck size={14} className="text-green-500" />;
    case 'error':
      return <IconAlertCircle size={14} className="text-destructive" />;
    default:
      return null;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ProjectAssetsPage() {
  useShellHeaderTitle({ title: 'Project Assets' });

  const { resolvedProjectId } = useProjectFocus();

  // --- Table state ---
  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // --- Search, sort, pagination ---
  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(50);

  // --- Upload state ---
  const {
    files: stagedFiles,
    uploadStatus,
    pendingCount,
    addFiles,
    removeFile,
    clearDone,
    startUpload,
  } = useDirectUpload(resolvedProjectId ?? '');

  // --- Google Drive import state ---
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const { openPicker, isReady: pickerReady } = useGoogleDrivePicker({
    onFilesSelected: async (files, accessToken) => {
      if (!resolvedProjectId) return;
      setImporting(true);
      setImportError(null);
      try {
        const result = await edgeJson<{
          results: Array<{ file_id: string; status: string; error?: string }>;
        }>('google-drive-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: resolvedProjectId,
            google_access_token: accessToken,
            files,
            ingest_mode: 'upload_only',
          }),
        });
        const failures = result.results.filter((r) => r.status === 'error');
        if (failures.length > 0) {
          setImportError(`${failures.length} file(s) failed to import`);
        }
        void loadDocs(resolvedProjectId);
      } catch (e) {
        setImportError(e instanceof Error ? e.message : 'Import failed');
      } finally {
        setImporting(false);
      }
    },
  });

  // --- Actions ---
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDelete = async () => {
    if (selected.size === 0 || !resolvedProjectId) return;
    const confirmed = window.confirm(`Delete ${selected.size} file${selected.size === 1 ? '' : 's'}? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      for (const uid of selected) {
        const doc = docs.find((d) => d.source_uid === uid);
        const { error: rpcErr } = await supabase.rpc('delete_document', { p_source_uid: uid });
        if (rpcErr) throw new Error(rpcErr.message);
        const locator = doc?.source_locator?.replace(/^\/+/, '');
        if (locator) {
          await supabase.storage.from(DOCUMENTS_BUCKET).remove([locator]);
        }
      }
      setSelected(new Set());
      void loadDocs(resolvedProjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      for (const uid of selected) {
        const doc = docs.find((d) => d.source_uid === uid);
        if (!doc) continue;
        const result = await resolveSignedUrlForLocators([doc.source_locator, doc.conv_locator]);
        if (result.url) {
          await downloadFromSignedUrl(result.url, doc.doc_title ?? 'download');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  // --- Data loading ---
  const loadDocs = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId,
        select: '*',
      });
      setDocs(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resolvedProjectId) {
      setDocs([]);
      setSelected(new Set());
      return;
    }
    void loadDocs(resolvedProjectId);
  }, [resolvedProjectId, loadDocs]);

  useEffect(() => {
    if (uploadStatus === 'done' && resolvedProjectId) {
      void loadDocs(resolvedProjectId);
    }
  }, [uploadStatus, resolvedProjectId, loadDocs]);

  // --- Derived: filter + sort + paginate ---
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle.length === 0
      ? docs
      : docs.filter((doc) =>
        (doc.doc_title ?? '').toLowerCase().includes(needle)
        || getDocumentFormat(doc).toLowerCase().includes(needle)
        || (doc.status ?? '').toLowerCase().includes(needle),
      );
    return [...filtered].sort((a, b) => compareRows(a, b, sortField, sortDirection));
  }, [docs, query, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRows = filteredRows.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);

  // Reset page when filter changes
  useEffect(() => { setPageIndex(0); }, [query, sortField, sortDirection, pageSize]);

  // --- Selection ---
  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const allPageSelected = pagedRows.length > 0 && pagedRows.every((d) => selected.has(d.source_uid));
  const somePageSelected = pagedRows.some((d) => selected.has(d.source_uid)) && !allPageSelected;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pagedRows.forEach((d) => next.delete(d.source_uid));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pagedRows.forEach((d) => next.add(d.source_uid));
        return next;
      });
    }
  };

  // --- Sort options ---
  const sortValue = `${sortField}:${sortDirection}`;
  const sortOptions = [
    { value: 'name:asc', label: 'Name (A-Z)' },
    { value: 'name:desc', label: 'Name (Z-A)' },
    { value: 'format:asc', label: 'Format (A-Z)' },
    { value: 'format:desc', label: 'Format (Z-A)' },
    { value: 'size:asc', label: 'Size (smallest)' },
    { value: 'size:desc', label: 'Size (largest)' },
    { value: 'status:asc', label: 'Status (A-Z)' },
    { value: 'status:desc', label: 'Status (Z-A)' },
  ];

  if (!resolvedProjectId) {
    return (
      <div className="flex h-[calc(100vh-var(--app-shell-header-height))] items-center justify-center text-sm text-muted-foreground">
        Select a project to view assets.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden p-6 gap-4">
      {/* Left: dropzone + staged files */}
      <div className="flex w-[280px] shrink-0 flex-col gap-2">
        <div className="text-sm font-bold text-foreground px-1">Add Documents</div>

        <FileUpload.Root
          maxFiles={25}
          accept={{
            'text/*': ['.md', '.markdown', '.txt', '.csv', '.html', '.htm', '.rst', '.org'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'application/vnd.oasis.opendocument.text': ['.odt'],
            'application/epub+zip': ['.epub'],
            'application/rtf': ['.rtf'],
            'application/x-tex': ['.tex', '.latex'],
          }}
          onFileChange={(details) => addFiles(details.acceptedFiles)}
          className="flex flex-col gap-0"
        >
          <FileUpload.Dropzone
            className={cn(
              'flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-center',
              'cursor-pointer transition-colors duration-150',
              'hover:bg-muted/50',
              'data-dragging:border-primary data-dragging:border-solid data-dragging:bg-primary/5',
            )}
          >
            <IconUpload size={32} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Drag files here or click to browse
            </span>
            <span className="text-xs text-muted-foreground">
              MD, TXT, CSV, HTML, RST, PDF, DOCX, XLSX, PPTX, ODT, EPUB, RTF, TEX, ORG
            </span>
          </FileUpload.Dropzone>
          <FileUpload.HiddenInput />
        </FileUpload.Root>

        {/* Google Drive import */}
        {pickerReady && (
          <Button
            variant="outline"
            size="sm"
            onClick={openPicker}
            disabled={importing}
            className="gap-2"
          >
            {importing ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconBrandGoogleDrive size={14} />
            )}
            {importing ? 'Importing\u2026' : 'Import from Google Drive'}
          </Button>
        )}

        {importError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {importError}
          </div>
        )}

        {/* Upload button */}
        {pendingCount > 0 && uploadStatus !== 'uploading' && (
          <Button size="sm" onClick={() => void startUpload()}>
            Upload {pendingCount} file{pendingCount === 1 ? '' : 's'}
          </Button>
        )}

        {/* Clear done button */}
        {uploadStatus === 'done' && stagedFiles.some((f) => f.status === 'done') && (
          <Button variant="outline" size="sm" onClick={clearDone}>
            Clear completed
          </Button>
        )}

        {/* Staged file list */}
        {stagedFiles.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            <ul className="flex flex-col">
              {stagedFiles.map((sf) => (
                <li
                  key={sf.id}
                  className={cn(
                    'grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-border px-1 py-1.5',
                    sf.status === 'error' && 'bg-destructive/5',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconFile size={14} className="flex-none text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="block truncate text-xs text-foreground">{sf.file.name}</span>
                      {sf.status === 'error' && sf.error && (
                        <span className="block truncate text-[10px] text-destructive">{sf.error}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatBytes(sf.file.size)}
                  </span>
                  <FileStatusIcon status={sf.status} />
                  {sf.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => removeFile(sf.id)}
                      aria-label={`Remove ${sf.file.name}`}
                    >
                      <IconX size={12} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* File table */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        {/* Toolbar: search + sort + actions */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <div className="relative min-w-[180px] flex-1">
            <IconSearch size={14} className="pointer-events-none absolute left-2 top-2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search files"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <NativeSelect
            value={sortValue}
            onChange={(e) => {
              const [f, d] = e.currentTarget.value.split(':') as [SortField, SortDirection];
              setSortField(f);
              setSortDirection(d);
            }}
            options={sortOptions}
            containerClassName="w-[160px]"
          />

          <span className="text-xs text-muted-foreground">
            {filteredRows.length} file{filteredRows.length === 1 ? '' : 's'}
          </span>

          {selected.size > 0 && (
            <>
              <span className="text-xs text-primary font-medium">
                {selected.size} selected
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={downloading}
                  onClick={() => void handleDownload()}
                >
                  {downloading ? <IconLoader2 size={13} className="animate-spin" /> : <IconDownload size={13} />}
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Table */}
        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/25 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Format</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Parse Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <IconLoader2 size={16} className="animate-spin" />
                      Loading files…
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-destructive">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    {docs.length === 0
                      ? 'No files in this project yet. Drag files to the left to upload.'
                      : 'No files match your search.'}
                  </td>
                </tr>
              )}

              {!loading && !error && pagedRows.map((doc) => {
                const isFailed = doc.status === 'conversion_failed' || doc.status === 'ingest_failed';
                return (
                  <tr
                    key={doc.source_uid}
                    className={cn(
                      'border-b border-border/60 transition-colors hover:bg-muted/20',
                      selected.has(doc.source_uid) && 'bg-accent/20',
                    )}
                  >
                    <td className="w-8 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(doc.source_uid)}
                        onChange={() => toggleSelect(doc.source_uid)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="block max-w-[300px] truncate text-foreground">
                        {doc.doc_title}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="gray" size="xs" className="uppercase">
                        {getDocumentFormat(doc)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatBytes(doc.source_filesize)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={isFailed ? 'red' : 'green'} size="xs">
                        {isFailed ? 'failed' : 'uploaded'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {doc.status === 'ingested' && (
                        <Badge variant="green" size="xs">parsed</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>

        {/* Pagination footer */}
        {filteredRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                {safePageIndex * pageSize + 1}–{Math.min((safePageIndex + 1) * pageSize, filteredRows.length)} of {filteredRows.length}
              </span>
              <NativeSelect
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.currentTarget.value))}
                options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} / page` }))}
                containerClassName="w-[100px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                aria-label="Previous page"
              >
                <IconChevronLeft size={14} />
              </Button>
              <span>
                Page {safePageIndex + 1} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
                aria-label="Next page"
              >
                <IconChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
