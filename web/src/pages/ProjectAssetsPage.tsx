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
import { Button } from '@/components/ui/button';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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

type SortField = 'name' | 'format' | 'size';
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteDocuments = async (uids: string[]) => {
    if (uids.length === 0 || !resolvedProjectId) return;
    setDeleting(true);
    setError(null);
    try {
      for (const uid of uids) {
        const doc = docs.find((d) => d.source_uid === uid);
        const { error: rpcErr } = await supabase.rpc('delete_source_document', { p_source_uid: uid });
        if (rpcErr) throw new Error(rpcErr.message);
        const locator = doc?.source_locator?.replace(/^\/+/, '');
        if (locator) {
          await supabase.storage.from(DOCUMENTS_BUCKET).remove([locator]);
        }
      }
      setSelected((prev) => {
        const next = new Set(prev);
        uids.forEach((uid) => next.delete(uid));
        return next;
      });
      void loadDocs(resolvedProjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteConfirmOpen(false);
    await deleteDocuments(Array.from(selected));
  };

  const handleSingleDownload = async (doc: ProjectDocumentRow) => {
    const result = await resolveSignedUrlForLocators([doc.source_locator, doc.conv_locator]);
    if (result.url) {
      await downloadFromSignedUrl(result.url, doc.doc_title ?? 'download');
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
  ];

  if (!resolvedProjectId) {
    return (
      <div className="flex h-[calc(100vh-var(--app-shell-header-height))] items-center justify-center text-sm text-muted-foreground">
        Select a project to view assets.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] gap-4 overflow-hidden px-4 pt-3 pb-3">
        {/* Left: upload sidebar */}
        <aside className="flex w-[260px] shrink-0 flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upload</span>

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
                  'flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border/80 p-3 text-center',
                  'cursor-pointer transition-colors duration-150',
                  'hover:border-primary/40 hover:bg-muted/40',
                  'data-dragging:border-primary data-dragging:border-solid data-dragging:bg-primary/5',
                )}
              >
                <IconUpload size={24} className="text-muted-foreground/70" />
                <span className="text-xs font-medium text-foreground">
                  Drop files or browse
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  PDF, DOCX, MD, TXT, HTML, XLSX, PPTX, CSV, EPUB, RTF, TEX
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
                className="h-8 gap-2 text-xs"
              >
                {importing ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconBrandGoogleDrive size={14} />
                )}
                {importing ? 'Importing\u2026' : 'Google Drive'}
              </Button>
            )}

            {importError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                {importError}
              </div>
            )}
          </div>

          {/* Staged files */}
          {stagedFiles.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Staged ({stagedFiles.length})
                </span>
                {uploadStatus === 'done' && stagedFiles.some((f) => f.status === 'done') && (
                  <button onClick={clearDone} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    Clear done
                  </button>
                )}
              </div>

              <ul className="flex flex-col gap-0.5">
                {stagedFiles.map((sf) => (
                  <li
                    key={sf.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5',
                      sf.status === 'error' ? 'bg-destructive/5' : 'hover:bg-muted/40',
                    )}
                  >
                    <FileStatusIcon status={sf.status} />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-foreground">{sf.file.name}</span>
                      {sf.status === 'error' && sf.error && (
                        <span className="block truncate text-[10px] text-destructive">{sf.error}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {formatBytes(sf.file.size)}
                    </span>
                    {sf.status !== 'uploading' && (
                      <button
                        onClick={() => removeFile(sf.id)}
                        aria-label={`Remove ${sf.file.name}`}
                        className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <IconX size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {/* Upload action */}
              {pendingCount > 0 && uploadStatus !== 'uploading' && (
                <Button size="sm" className="h-8 text-xs" onClick={() => void startUpload()}>
                  <IconUpload size={13} className="mr-1.5" />
                  Upload {pendingCount} file{pendingCount === 1 ? '' : 's'}
                </Button>
              )}
            </div>
          )}
        </aside>

        {/* File table */}
        <section className="flex min-h-0 min-w-0 flex-1 max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-card">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <div className="relative max-w-xs flex-1">
              <IconSearch size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Search files..."
                className="h-8 pl-8 text-xs"
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
              containerClassName="w-[150px]"
            />

            <span className="text-xs tabular-nums text-muted-foreground">
              {filteredRows.length} file{filteredRows.length === 1 ? '' : 's'}
            </span>

            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-1">
                <span className="mr-1 text-xs font-medium text-primary tabular-nums">
                  {selected.size} selected
                </span>
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
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  {deleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-24" />
                <col className="w-16" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pl-3 pr-1">
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
                  <th className="px-3 py-2 font-medium text-right">Size</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <IconLoader2 size={16} className="animate-spin" />
                        Loading files...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-destructive">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-16 text-center">
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <IconFile size={28} className="opacity-40" />
                        <span className="text-sm">
                          {docs.length === 0
                            ? 'No files yet. Drop files in the upload panel to get started.'
                            : 'No files match your search.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && pagedRows.map((doc) => (
                  <tr
                    key={doc.source_uid}
                    className={cn(
                      'border-b border-border/40 transition-colors hover:bg-accent/30',
                      selected.has(doc.source_uid) && 'bg-accent/20',
                    )}
                  >
                    <td className="py-1.5 pl-3 pr-1">
                      <input
                        type="checkbox"
                        checked={selected.has(doc.source_uid)}
                        onChange={() => toggleSelect(doc.source_uid)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                    </td>
                    <td className="truncate px-3 py-1.5 text-foreground">
                      {doc.doc_title}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex rounded bg-muted/60 px-1.5 py-0 text-[9px] font-semibold uppercase leading-4 text-muted-foreground">
                        {getDocumentFormat(doc)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {formatBytes(doc.source_filesize)}
                    </td>
                    <td className="px-3 py-1.5">
                      {doc.status?.includes('failed') ? (
                        <span className="text-xs text-destructive" title={doc.error ?? undefined}>failed</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">uploaded</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleSingleDownload(doc)}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                          title="Download"
                        >
                          <IconDownload size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDocuments([doc.source_uid])}
                          disabled={deleting}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          title="Delete"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          {/* Pagination footer */}
          {filteredRows.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="tabular-nums">
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
                <span className="tabular-nums">
                  {safePageIndex + 1} / {totalPages}
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

      {/* Delete confirmation dialog */}
      <DialogRoot open={deleteConfirmOpen} onOpenChange={(e) => setDeleteConfirmOpen(e.open)}>
        <DialogContent>
          <DialogTitle>Delete {selected.size} file{selected.size === 1 ? '' : 's'}?</DialogTitle>
          <DialogDescription>
            This cannot be undone. The selected files and any parsed artifacts will be permanently removed.
          </DialogDescription>
          <DialogCloseTrigger />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
