import { useCallback, useEffect, useState } from 'react';
import { FileUpload } from '@ark-ui/react/file-upload';
import {
  IconLoader2,
  IconTrash,
  IconDownload,
  IconEye,
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import {
  type ProjectDocumentRow,
  getDocumentFormat,
  formatBytes,
} from '@/lib/projectDetailHelpers';
import { useDirectUpload, type StagedFile } from '@/hooks/useDirectUpload';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: ProjectDocumentRow['status'] }) {
  const variant =
    status === 'ingested'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
      : status === 'conversion_failed' || status === 'ingest_failed'
        ? 'bg-destructive/10 text-destructive'
        : status === 'converting'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/60 text-muted-foreground';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${variant}`}>
      {status}
    </span>
  );
}

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectAssetsPage() {
  useShellHeaderTitle({ title: 'Project Assets' });

  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();

  // --- Table state ---
  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // Refresh table after upload completes
  useEffect(() => {
    if (uploadStatus === 'done' && resolvedProjectId) {
      void loadDocs(resolvedProjectId);
    }
  }, [uploadStatus, resolvedProjectId, loadDocs]);

  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === docs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map((d) => d.source_uid)));
    }
  };

  const allSelected = docs.length > 0 && selected.size === docs.length;
  const someSelected = selected.size > 0 && selected.size < docs.length;

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

        {/* Upload button */}
        {pendingCount > 0 && uploadStatus !== 'uploading' && (
          <button
            type="button"
            onClick={() => void startUpload()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upload {pendingCount} file{pendingCount === 1 ? '' : 's'}
          </button>
        )}

        {/* Clear done button */}
        {uploadStatus === 'done' && stagedFiles.some((f) => f.status === 'done') && (
          <button
            type="button"
            onClick={clearDone}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Clear completed
          </button>
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
                    {formatSize(sf.file.size)}
                  </span>
                  <FileStatusIcon status={sf.status} />
                  {sf.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => removeFile(sf.id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${sf.file.name}`}
                    >
                      <IconX size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Center: file table */}
      <section className="flex min-h-0 w-1/2 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <h2 className="text-sm font-medium text-foreground">
            {resolvedProjectName ?? 'Project Assets'}
          </h2>
          <span className="text-xs text-muted-foreground">
            {docs.length} file{docs.length === 1 ? '' : 's'}
          </span>
          {selected.size > 0 && (
            <span className="ml-auto text-xs text-primary font-medium">
              {selected.size} selected
            </span>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/30 text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Format</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Parsed</th>
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

              {!loading && !error && docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    No files in this project yet. Drag files to the left to upload.
                  </td>
                </tr>
              )}

              {!loading && !error && docs.map((doc) => (
                <tr
                  key={doc.source_uid}
                  className={cn(
                    'border-b border-border/60 transition-colors hover:bg-accent/30',
                    selected.has(doc.source_uid) && 'bg-accent/20',
                  )}
                >
                  <td className="w-10 px-3 py-2.5">
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
                    <span className="inline-flex rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {getDocumentFormat(doc)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatBytes(doc.source_filesize)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    {doc.status === 'ingested' ? (
                      <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">Yes</span>
                    ) : doc.status === 'converting' ? (
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">In progress</span>
                    ) : doc.status === 'conversion_failed' || doc.status === 'ingest_failed' ? (
                      <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Failed</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        {docs.length > 0 && (
          <div className="flex items-center border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{docs.length} file{docs.length === 1 ? '' : 's'}</span>
          </div>
        )}
      </section>

      {/* Right: actions panel */}
      {selected.size > 0 && (
        <div className="flex w-[200px] shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Actions
          </h3>
          <span className="text-xs text-muted-foreground">
            {selected.size} file{selected.size === 1 ? '' : 's'} selected
          </span>
          <div className="mt-1 flex flex-col gap-1">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <IconEye size={14} stroke={1.75} />
              Preview
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <IconDownload size={14} stroke={1.75} />
              Download
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <IconTrash size={14} stroke={1.75} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}