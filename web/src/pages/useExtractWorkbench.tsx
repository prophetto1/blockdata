import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconBraces,
  IconFileCode,
  IconFileText,
  IconLayoutList,
  IconSettings,
} from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useExtractionSchemas } from '@/hooks/useExtractionSchemas';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { DocumentFileTable, type ExtraColumn } from '@/components/documents/DocumentFileTable';
import { DocumentPreviewFrame, DocumentPreviewMessage } from '@/components/documents/DocumentPreviewShell';
import { formatBytes, getDocumentFormat, type ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Shared layout primitives
// ---------------------------------------------------------------------------

function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <DocumentPreviewFrame scroll padded={false}>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </DocumentPreviewFrame>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <DocumentPreviewFrame>
      <DocumentPreviewMessage message={message} />
    </DocumentPreviewFrame>
  );
}

function SectionCard({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'default' | 'accent';
}) {
  return (
    <section className={cn(
      'rounded-xl border px-4 py-4 shadow-sm',
      tone === 'accent' ? 'border-primary/25 bg-primary/5' : 'border-border bg-background/80',
    )}>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extract Config tab
// ---------------------------------------------------------------------------

function ExtractConfigTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to configure extraction." />;

  return (
    <PanelFrame>
      <SectionCard title="Document Context" tone="accent">
        <MetaRow label="File" value={doc.doc_title} />
        <MetaRow label="Format" value={getDocumentFormat(doc)} />
        <MetaRow label="Size" value={formatBytes(doc.source_filesize)} />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge size="sm" variant={doc.status === 'parsed' ? 'green' : doc.status.includes('failed') ? 'red' : 'gray'}>
            {doc.status.replaceAll('_', ' ')}
          </Badge>
        </div>
      </SectionCard>

      <SectionCard title="Extraction Target">
        <p className="text-sm leading-6 text-muted-foreground">
          Extract uses the same selected-document flow as Parse, but configures structured outputs instead of parser settings.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Schema builder tab (visual / code toggle)
// ---------------------------------------------------------------------------

function ExtractSchemaTab({ projectId }: { projectId: string | null }) {
  const { schemas, loading } = useExtractionSchemas(projectId);

  return (
    <div className="flex h-full min-h-0 flex-col p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Saved Schemas
          </div>
          <div className="text-xs text-foreground/75">User schema presets</div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {!projectId ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Select a project to view schemas.
            </div>
          ) : loading ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : schemas.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              No schemas saved yet. Create one in the Schemas page.
            </div>
          ) : (
            <table className="w-full table-fixed text-left text-[12px] leading-5">
              <thead className="sticky top-0 z-10 border-b border-border bg-card text-muted-foreground">
                <tr>
                  <th className="w-[45%] px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em]">Name</th>
                  <th className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em]">Fields</th>
                  <th className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em]">Updated</th>
                </tr>
              </thead>
              <tbody>
                {schemas.map((s) => {
                  const fieldCount = Object.keys(
                    (s.schema_body as Record<string, unknown>)?.properties ?? {},
                  ).length;
                  return (
                    <tr
                      key={s.schema_id}
                      className="cursor-pointer border-b border-border transition-colors hover:bg-accent/50"
                    >
                      <td className="truncate px-2.5 py-1.5 font-medium text-foreground">{s.schema_name}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">{fieldCount}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">
                        {new Date(s.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {schemas.length} saved schema{schemas.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results tab (placeholder until wired)
// ---------------------------------------------------------------------------

function ExtractResultsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to view extraction results." />;

  return (
    <PanelFrame>
      <SectionCard title="Extraction Results" tone="accent">
        <p className="text-sm leading-6 text-muted-foreground">
          Run an extraction to see structured results for {doc.doc_title}.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Downloads tab
// ---------------------------------------------------------------------------

function ExtractDownloadsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to view extract downloads." />;

  return (
    <PanelFrame>
      <SectionCard title="Downloads" tone="accent">
        <p className="text-sm leading-6 text-foreground">
          Downloadable extraction artifacts and raw result payloads for {doc.doc_title}.
        </p>
      </SectionCard>
      <SectionCard title="Selected File">
        <MetaRow label="File" value={doc.doc_title} />
        <MetaRow label="Format" value={getDocumentFormat(doc)} />
        <MetaRow label="Size" value={formatBytes(doc.source_filesize)} />
      </SectionCard>
    </PanelFrame>
  );
}

export function getExtractFileListExtraColumns(): ExtraColumn[] {
  return [
    {
      id: 'schema',
      header: 'Schema',
      className: 'w-[7rem]',
      render: () => <span className="text-muted-foreground">—</span>,
    },
  ];
}

// ---------------------------------------------------------------------------
// Tabs, panes, and hook
// ---------------------------------------------------------------------------

export const EXTRACT_TABS: WorkbenchTab[] = [
  { id: 'extract-files', label: 'File List', icon: IconFileCode },
  { id: 'extract-config', label: 'Extract Config', icon: IconSettings },
  { id: 'extract-schema', label: 'Schema', icon: IconBraces },
  { id: 'extract-results', label: 'Results', icon: IconLayoutList },
  { id: 'extract-downloads', label: 'Downloads', icon: IconFileText },
];

export const EXTRACT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-extract-files', tabs: ['extract-files'], activeTab: 'extract-files', width: 32 },
  { id: 'pane-extract-config', tabs: ['extract-config', 'extract-schema'], activeTab: 'extract-config', width: 24 },
  { id: 'pane-extract-preview', tabs: ['extract-results', 'extract-downloads'], activeTab: 'extract-results', width: 44 },
]);

export function useExtractWorkbench(options?: { title?: string }) {
  useShellHeaderTitle({ title: options?.title ?? 'Extract Documents' });
  const { resolvedProjectId } = useProjectFocus();
  const docState = useProjectDocuments(resolvedProjectId);
  const {
    docs,
    loading,
    error,
    selected,
    toggleSelect,
    toggleSelectAll,
    allSelected,
    someSelected,
  } = docState;

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  useEffect(() => {
    if (docs.length === 0) {
      setActiveDocUid(null);
      return;
    }
    const hasActive = activeDocUid != null && docs.some((doc) => doc.source_uid === activeDocUid);
    if (!hasActive) {
      setActiveDocUid(docs[0]?.source_uid ?? null);
    }
  }, [activeDocUid, docs]);

  const activeDoc = useMemo(
    () => docs.find((doc) => doc.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  const extractExtraColumns = useMemo(() => getExtractFileListExtraColumns(), []);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'extract-files') {
      return (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 p-1">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[58rem] flex-col overflow-hidden rounded-md border border-border bg-card">
              <DocumentFileTable
                docs={docs}
                loading={loading}
                error={error}
                selected={selected}
                toggleSelect={toggleSelect}
                toggleSelectAll={toggleSelectAll}
                allSelected={allSelected}
                someSelected={someSelected}
                activeDoc={activeDocUid}
                onDocClick={handleDocClick}
                extraColumns={extractExtraColumns}
                className={cn('parse-documents-table', 'parse-documents-table-compact')}
              />
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'extract-config') {
      return <ExtractConfigTab doc={activeDoc} />;
    }

    if (tabId === 'extract-schema') {
      return <ExtractSchemaTab projectId={resolvedProjectId} />;
    }

    if (tabId === 'extract-results') {
      return <ExtractResultsTab doc={activeDoc} />;
    }

    if (tabId === 'extract-downloads') {
      return <ExtractDownloadsTab doc={activeDoc} />;
    }

    return null;
  }, [activeDoc, activeDocUid, allSelected, docs, error, extractExtraColumns, handleDocClick, loading, selected, someSelected, toggleSelect, toggleSelectAll]);

  return { renderContent };
}
