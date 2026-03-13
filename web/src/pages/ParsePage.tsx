import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconLoader2,
  IconPlayerPlay,
  IconDotsVertical,
  IconX,
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
import { useBatchParse, type FileDispatchStatus } from '@/hooks/useBatchParse';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DOCUMENTS_BUCKET =
  (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

type ParsingProfile = {
  id: string;
  parser: string;
  config: Record<string, unknown>;
};

function getPipeline(sourceType: string): string {
  const t = sourceType.toLowerCase();
  if (t === 'pdf' || t === 'image') return 'standard';
  if (['wav', 'mp3', 'm4a', 'flac', 'ogg', 'aac', 'wma'].includes(t)) return 'asr';
  return 'simple';
}

function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  const variant =
    status === 'ingested'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
      : status === 'conversion_failed' || status === 'ingest_failed'
        ? 'bg-destructive/10 text-destructive'
        : status === 'converting'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/60 text-muted-foreground';
  const label =
    status === 'ingested'
      ? 'success'
      : status === 'uploaded'
        ? 'unparsed'
        : status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${variant}`}
      title={error ?? undefined}
    >
      {label}
    </span>
  );
}

function DispatchBadge({ status }: { status: FileDispatchStatus }) {
  if (status === 'idle') return null;
  const variant =
    status === 'dispatched'
      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      : status === 'dispatch_error'
        ? 'bg-destructive/10 text-destructive'
        : status === 'dispatching'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/60 text-muted-foreground';
  return (
    <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${variant}`}>
      {status === 'dispatching' ? 'sending...' : status}
    </span>
  );
}

/** Look up the real storage key for a parsed artifact from conversion_representations. */
async function getArtifactLocator(
  sourceUid: string,
  reprType: 'markdown_bytes' | 'doclingdocument_json',
): Promise<string | null> {
  const { data } = await supabase
    .from('conversion_representations')
    .select('artifact_locator')
    .eq('source_uid', sourceUid)
    .eq('representation_type', reprType)
    .maybeSingle();
  return data?.artifact_locator ?? null;
}

/** Simple dropdown menu anchored to a trigger button. */
function ActionMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <IconDotsVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-30 min-w-[160px] rounded-md border border-border bg-popover py-1 shadow-md">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-xs hover:bg-accent',
                item.danger ? 'text-destructive' : 'text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParsePage() {
  useShellHeaderTitle({ title: 'Parse' });

  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();

  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [profiles, setProfiles] = useState<ParsingProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [configText, setConfigText] = useState('{}');
  const [configOpen, setConfigOpen] = useState(false);

  const [jsonModal, setJsonModal] = useState<{ title: string; content: string } | null>(null);
  const [preview, setPreview] = useState<{ title: string; markdown: string; loading: boolean } | null>(null);

  const parsedConfig = useMemo(() => {
    try {
      return JSON.parse(configText) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [configText]);

  const batch = useBatchParse({
    profileId: selectedProfileId,
    pipelineConfig: parsedConfig,
  });

  // Load profiles
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('parsing_profiles')
        .select('id, parser, config')
        .eq('parser', 'docling')
        .order('id');
      const rows = (data ?? []) as ParsingProfile[];
      setProfiles(rows);
      const defaultProfile = rows.find((p) => (p.config as any)?.is_default) ?? rows[0];
      if (defaultProfile) {
        setSelectedProfileId(defaultProfile.id);
        setConfigText(JSON.stringify(defaultProfile.config, null, 2));
      }
    })();
  }, []);

  // Update config text when profile changes
  const handleProfileChange = (id: string) => {
    setSelectedProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (profile) setConfigText(JSON.stringify(profile.config, null, 2));
  };

  // Load documents
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

  // Realtime subscription
  useEffect(() => {
    if (!resolvedProjectId) return;
    const channel = supabase
      .channel(`parse-status-${resolvedProjectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_documents',
          filter: `project_id=eq.${resolvedProjectId}`,
        },
        (payload) => {
          setDocs((prev) =>
            prev.map((d) =>
              d.source_uid === (payload.new as any).source_uid
                ? { ...d, ...(payload.new as any) }
                : d,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [resolvedProjectId]);

  const toggleSelect = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map((d) => d.source_uid)));
  };

  const allSelected = docs.length > 0 && selected.size === docs.length;
  const someSelected = selected.size > 0 && selected.size < docs.length;

  const unparsedUids = docs
    .filter((d) => d.status === 'uploaded' || d.status === 'conversion_failed' || d.status === 'ingest_failed')
    .map((d) => d.source_uid);

  const selectedParseableUids = docs
    .filter((d) => selected.has(d.source_uid) && (d.status === 'uploaded' || d.status === 'conversion_failed' || d.status === 'ingest_failed'))
    .map((d) => d.source_uid);

  const selectedResetableUids = docs
    .filter((d) => selected.has(d.source_uid) && (d.status === 'converting' || d.status === 'conversion_failed' || d.status === 'ingest_failed'))
    .map((d) => d.source_uid);

  const parsedCount = docs.filter((d) => d.status === 'ingested').length;
  const convertingCount = docs.filter((d) => d.status === 'converting').length;

  const handleSingleParse = (uid: string) => {
    batch.start([uid]);
  };

  const signedUrlForArtifact = async (
    sourceUid: string,
    reprType: 'markdown_bytes' | 'doclingdocument_json',
  ): Promise<string | null> => {
    const locator = await getArtifactLocator(sourceUid, reprType);
    if (!locator) return null;
    const { data } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(locator, 60 * 20);
    return data?.signedUrl ?? null;
  };

  const handlePreview = async (doc: ProjectDocumentRow) => {
    setPreview({ title: doc.doc_title, markdown: '', loading: true });
    const url = await signedUrlForArtifact(doc.source_uid, 'markdown_bytes');
    if (!url) {
      setPreview({ title: doc.doc_title, markdown: 'No markdown available. Reset and re-parse with Docling.', loading: false });
      return;
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error();
      const text = await resp.text();
      setPreview({ title: doc.doc_title, markdown: text, loading: false });
    } catch {
      setPreview({ title: doc.doc_title, markdown: 'No markdown available. Reset and re-parse with Docling.', loading: false });
    }
  };

  const handleDownloadMd = async (doc: ProjectDocumentRow) => {
    const url = await signedUrlForArtifact(doc.source_uid, 'markdown_bytes');
    if (url) window.open(url, '_blank');
  };

  const handleDownloadJson = async (doc: ProjectDocumentRow) => {
    const url = await signedUrlForArtifact(doc.source_uid, 'doclingdocument_json');
    if (url) window.open(url, '_blank');
  };

  const handleReset = async (uid: string): Promise<boolean> => {
    const { error: rpcErr } = await supabase.rpc('reset_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Reset failed:', rpcErr.message);
      return false;
    }
    setDocs((prev) => prev.map((d) => d.source_uid === uid ? { ...d, status: 'uploaded', error: null } : d));
    return true;
  };

  const handleDelete = async (uid: string) => {
    const { error: rpcErr } = await supabase.rpc('delete_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Delete failed:', rpcErr.message);
      return;
    }
    setDocs((prev) => prev.filter((d) => d.source_uid !== uid));
    setSelected((prev) => { const next = new Set(prev); next.delete(uid); return next; });
  };

  const handleBulkDelete = async () => {
    for (const uid of Array.from(selected)) await handleDelete(uid);
  };

  const handleBulkReset = async () => {
    for (const uid of selectedResetableUids) await handleReset(uid);
  };

  if (!resolvedProjectId) {
    return (
      <div className="flex h-[calc(100vh-var(--app-shell-header-height))] items-center justify-center text-sm text-muted-foreground">
        Select a project to parse documents.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden">
    <section className="flex min-h-0 w-1/2 shrink-0 flex-col overflow-hidden border-r border-border">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Profile</label>
          <select
            value={selectedProfileId}
            onChange={(e) => handleProfileChange(e.target.value)}
            className="h-7 rounded-md border border-border bg-background px-2 text-xs"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.config as any)?.name ?? p.id}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={unparsedUids.length === 0 || batch.isRunning || !selectedProfileId}
          onClick={() => batch.start(unparsedUids)}
          className="h-7 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Parse All ({unparsedUids.length})
        </button>

        {selectedParseableUids.length > 0 && (
          <button
            type="button"
            disabled={batch.isRunning || !selectedProfileId}
            onClick={() => batch.start(selectedParseableUids)}
            className="h-7 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            Parse Selected ({selectedParseableUids.length})
          </button>
        )}

        {selectedResetableUids.length > 0 && (
          <button
            type="button"
            onClick={() => void handleBulkReset()}
            className="h-7 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            title="Reset selected files to unparsed"
          >
            Reset ({selectedResetableUids.length})
          </button>
        )}

        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            className="h-7 rounded-md border border-destructive/50 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete selected files"
          >
            Delete ({selected.size})
          </button>
        )}

        {batch.isRunning && (
          <button
            type="button"
            onClick={batch.cancel}
            className="h-7 rounded-md border border-destructive/50 px-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Cancel
          </button>
        )}

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{parsedCount}/{docs.length} parsed</span>
          {convertingCount > 0 && (
            <span className="flex items-center gap-1">
              <IconLoader2 size={12} className="animate-spin" />
              {convertingCount}
            </span>
          )}
        </div>

        {docs.length > 0 && (
          <div className="basis-full">
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${(parsedCount / docs.length) * 100}%` }}
              />
            </div>
          </div>
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
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-border"
                />
              </th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Pipeline</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <IconLoader2 size={16} className="animate-spin" />
                    Loading files...
                  </div>
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-destructive">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && docs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  No files in this project. Upload files first on the Project Assets page.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              docs.map((doc) => {
                const dStatus = batch.dispatchStatus.get(doc.source_uid) ?? 'idle';
                const canParse =
                  doc.status === 'uploaded' ||
                  doc.status === 'conversion_failed' ||
                  doc.status === 'ingest_failed';
                const isConverting = doc.status === 'converting';
                const isIngested = doc.status === 'ingested';

                return (
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
                      <span className="inline-flex rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {getPipeline(doc.source_type)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={doc.status} error={doc.error} />
                      <DispatchBadge status={dStatus} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {canParse && (
                          <button
                            type="button"
                            onClick={() => handleSingleParse(doc.source_uid)}
                            disabled={batch.isRunning}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
                            title="Parse this file"
                          >
                            <IconPlayerPlay size={14} />
                          </button>
                        )}
                        {isConverting && (
                          <span className="flex h-6 w-6 items-center justify-center">
                            <IconLoader2 size={14} className="animate-spin text-primary" />
                          </span>
                        )}
                        <ActionMenu
                          items={[
                            ...(isIngested
                              ? [
                                  { label: 'Preview', onClick: () => void handlePreview(doc) },
                                  { label: 'Download MD', onClick: () => void handleDownloadMd(doc) },
                                  { label: 'Download DoclingJson', onClick: () => void handleDownloadJson(doc) },
                                ]
                              : []),
                            ...(!isConverting
                              ? [{ label: 'Reset', onClick: () => void handleReset(doc.source_uid) }]
                              : []),
                            { label: 'Delete', onClick: () => void handleDelete(doc.source_uid), danger: true },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </ScrollArea>

      {docs.length > 0 && (
        <div className="flex items-center border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>
            {docs.length} file{docs.length === 1 ? '' : 's'}
          </span>
          {selected.size > 0 && (
            <span className="ml-2 text-primary font-medium">
              {selected.size} selected
            </span>
          )}
        </div>
      )}

      {/* JSON view modal */}
      {jsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium text-foreground truncate">
                {jsonModal.title} — DoclingDocument
              </h3>
              <button
                type="button"
                onClick={() => setJsonModal(null)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <IconX size={16} />
              </button>
            </div>
            <ScrollArea className="min-h-0 flex-1 p-4" viewportClass="h-full overflow-auto">
              <pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground">
                {jsonModal.content}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </section>

      {/* Right: markdown preview */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!preview && (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <p>Click the eye icon on a parsed file to preview</p>
          </div>
        )}
        {preview?.loading && (
          <div className="flex flex-1 items-center justify-center">
            <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {preview && !preview.loading && (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <h3 className="truncate text-sm font-medium text-foreground">{preview.title}</h3>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <IconX size={14} />
              </button>
            </div>
            <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none px-6 py-4">
                <Markdown remarkPlugins={[remarkGfm]}>{preview.markdown}</Markdown>
              </div>
            </ScrollArea>
          </>
        )}
      </section>
    </div>
  );
}
