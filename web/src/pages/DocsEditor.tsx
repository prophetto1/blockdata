import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OnlyOfficeEditorPanel } from '@/components/documents/OnlyOfficeEditorPanel';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import {
  type ProjectDocumentRow,
  isOnlyOfficeEditable,
  getDocumentFormat,
  formatBytes,
} from '@/lib/projectDetailHelpers';

export default function DocsEditor() {
  useShellHeaderTitle({ title: 'Docs' });

  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();

  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);

  const loadDocs = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId,
        select: '*',
      });
      setDocs(all);
      setSelectedSourceUid((prev) => {
        if (prev && all.some((d) => d.source_uid === prev)) return prev;
        const firstEditable = all.find(isOnlyOfficeEditable);
        return firstEditable?.source_uid ?? null;
      });
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
      setSelectedSourceUid(null);
      return;
    }
    void loadDocs(resolvedProjectId);
  }, [resolvedProjectId, loadDocs]);

  const selectedDoc = useMemo(
    () => docs.find((d) => d.source_uid === selectedSourceUid) ?? null,
    [docs, selectedSourceUid],
  );

  if (!resolvedProjectId) {
    return (
      <div className="flex h-[calc(100vh-var(--app-shell-header-height))] items-center justify-center text-sm text-muted-foreground">
        Select a project to view documents.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden">
      {/* ── Left sidebar: file list ── */}
      <div className="flex w-[320px] shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-10 items-center border-b border-border px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {resolvedProjectName ?? 'Documents'}
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
              <IconLoader2 size={14} className="animate-spin" />
              Loading…
            </div>
          )}

          {!loading && error && (
            <div className="p-4 text-xs text-destructive">{error}</div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground">
              No files in this project.
            </div>
          )}

          {!loading && !error && docs.map((doc) => {
            const editable = isOnlyOfficeEditable(doc);
            return (
              <button
                key={doc.source_uid}
                type="button"
                onClick={() => editable && setSelectedSourceUid(doc.source_uid)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                  !editable
                    ? 'opacity-50 cursor-default'
                    : doc.source_uid === selectedSourceUid
                      ? 'bg-accent/70 text-foreground'
                      : 'text-foreground/80 hover:bg-accent/60'
                }`}
              >
                <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${
                  editable
                    ? 'bg-muted/60 text-muted-foreground'
                    : 'bg-muted/40 text-muted-foreground/60'
                }`}>
                  {getDocumentFormat(doc)}
                </span>
                <span className="min-w-0 flex-1 truncate">{doc.doc_title}</span>
                {!editable && (
                  <span className="shrink-0 text-[9px] text-muted-foreground/60">view only</span>
                )}
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatBytes(doc.source_filesize)}
                </span>
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* ── Right area: editor ── */}
      <div className="flex-1 min-w-0">
        {selectedDoc && isOnlyOfficeEditable(selectedDoc) ? (
          <OnlyOfficeEditorPanel doc={selectedDoc} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {docs.length > 0 ? 'Select an editable document (DOCX, XLSX, PPTX).' : 'No documents available.'}
          </div>
        )}
      </div>
    </div>
  );
}