import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconFileCode,
  IconFileText,
  IconLayoutList,
  IconSettings,
} from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
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
// Convert Config tab
// ---------------------------------------------------------------------------

function ConvertConfigTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to configure conversion." />;

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

      <SectionCard title="Conversion Target">
        <p className="text-sm leading-6 text-muted-foreground">
          Choose a target format and configure conversion options for this document.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Convert Options tab
// ---------------------------------------------------------------------------

function ConvertOptionsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to view conversion options." />;

  return (
    <PanelFrame>
      <SectionCard title="Output Format">
        <p className="text-sm leading-6 text-muted-foreground">
          Configure the target format and output settings for {doc.doc_title}.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Results tab
// ---------------------------------------------------------------------------

function ConvertResultsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to view conversion results." />;

  return (
    <PanelFrame>
      <SectionCard title="Conversion Results" tone="accent">
        <p className="text-sm leading-6 text-muted-foreground">
          Run a conversion to see results for {doc.doc_title}.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Downloads tab
// ---------------------------------------------------------------------------

function ConvertDownloadsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to view converted downloads." />;

  return (
    <PanelFrame>
      <SectionCard title="Downloads" tone="accent">
        <p className="text-sm leading-6 text-foreground">
          Downloadable converted artifacts for {doc.doc_title}.
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

// ---------------------------------------------------------------------------
// Tabs, panes, and hook
// ---------------------------------------------------------------------------

export const CONVERT_TABS: WorkbenchTab[] = [
  { id: 'convert-files', label: 'File List', icon: IconFileCode },
  { id: 'convert-config', label: 'Convert Config', icon: IconSettings },
  { id: 'convert-options', label: 'Options', icon: IconLayoutList },
  { id: 'convert-results', label: 'Results', icon: IconFileText },
  { id: 'convert-downloads', label: 'Downloads', icon: IconFileText },
];

export const CONVERT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-convert-files', tabs: ['convert-files'], activeTab: 'convert-files', width: 32 },
  { id: 'pane-convert-config', tabs: ['convert-config', 'convert-options'], activeTab: 'convert-config', width: 24 },
  { id: 'pane-convert-preview', tabs: ['convert-results', 'convert-downloads'], activeTab: 'convert-results', width: 44 },
]);

export function useConvertWorkbench() {
  useShellHeaderTitle({ title: 'Convert Documents' });
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

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'convert-files') {
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
                className={cn('parse-documents-table', 'parse-documents-table-compact')}
              />
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'convert-config') {
      return <ConvertConfigTab doc={activeDoc} />;
    }

    if (tabId === 'convert-options') {
      return <ConvertOptionsTab doc={activeDoc} />;
    }

    if (tabId === 'convert-results') {
      return <ConvertResultsTab doc={activeDoc} />;
    }

    if (tabId === 'convert-downloads') {
      return <ConvertDownloadsTab doc={activeDoc} />;
    }

    return null;
  }, [activeDoc, activeDocUid, allSelected, docs, error, handleDocClick, loading, selected, someSelected, toggleSelect, toggleSelectAll]);

  return { renderContent };
}
