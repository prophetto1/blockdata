import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconFileText, IconLoader2 } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OnlyOfficeEditorPanel } from '@/components/documents/OnlyOfficeEditorPanel';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import {
  type ProjectDocumentRow,
  isDocxDocument,
  formatBytes,
} from '@/lib/projectDetailHelpers';

export default function DocsEditor() {
  useShellHeaderTitle({ title: 'Docs' });

  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();

  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);

  // Fetch DOCX documents for the active project
  const loadDocs = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId,
        select: '*',
      });
      const docxOnly = all.filter(isDocxDocument);
      setDocs(docxOnly);
      // Auto-select first doc if nothing selected
      setSelectedSourceUid((prev) => {
        if (prev && docxOnly.some((d) => d.source_uid === prev)) return prev;
        return docxOnly[0]?.source_uid ?? null;
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

  // ── No project selected ───────────────────────────────────────────
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
      <div className="flex w-[260px] shrink-0 flex-col border-r border-border bg-card">
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
              No DOCX files in this project.
            </div>
          )}

          {!loading && !error && docs.map((doc) => (
            <button
              key={doc.source_uid}
              type="button"
              onClick={() => setSelectedSourceUid(doc.source_uid)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60 ${
                doc.source_uid === selectedSourceUid
                  ? 'bg-accent/70 text-foreground'
                  : 'text-foreground/80'
              }`}
            >
              <IconFileText size={15} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{doc.doc_title}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatBytes(doc.source_filesize)}
              </span>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* ── Right area: editor ── */}
      <div className="flex-1 min-w-0">
        {selectedDoc ? (
          <OnlyOfficeEditorPanel doc={selectedDoc} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {docs.length > 0 ? 'Select a document to edit.' : 'No documents available.'}
          </div>
        )}
      </div>
    </div>
  );
}
