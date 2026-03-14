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
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { DocumentPreviewFrame, DocumentPreviewMessage } from '@/components/documents/DocumentPreviewShell';
import { formatBytes, getDocumentFormat, type ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';

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

      <SectionCard title="Extraction Targets">
        <div className="flex flex-wrap gap-2">
          <Badge size="sm" variant="blue">Badges</Badge>
          <Badge size="sm" variant="violet">Token</Badge>
          <Badge size="sm" variant="orange">Contracts</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Extract uses the same selected-document flow as Parse, but configures structured outputs instead of parser settings.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

function ExtractTargetsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to review extract targets." />;

  return (
    <PanelFrame>
      <SectionCard title="Output Shapes">
        <div className="space-y-3 text-sm text-foreground">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
            <div className="flex items-center gap-2">
              <Badge size="sm" variant="blue">Badges</Badge>
              <span className="font-medium">Short semantic labels and metadata chips</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
            <div className="flex items-center gap-2">
              <Badge size="sm" variant="violet">Token</Badge>
              <span className="font-medium">Compact extracted facts for downstream indexing</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
            <div className="flex items-center gap-2">
              <Badge size="sm" variant="orange">Contracts</Badge>
              <span className="font-medium">Long-form structured extraction for richer document logic</span>
            </div>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Current Scope">
        <p className="text-sm leading-6 text-muted-foreground">
          {doc.doc_title} is ready to be used as the active extract source once the extraction workflow is wired to backend actions.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

function PreviewSurface({
  doc,
  title,
  badge,
  description,
}: {
  doc: ProjectDocumentRow | null;
  title: string;
  badge: { label: string; variant: 'blue' | 'violet' | 'orange' };
  description: string;
}) {
  if (!doc) return <EmptyPanel message={`Select a file to preview ${title.toLowerCase()}.`} />;

  return (
    <PanelFrame>
      <SectionCard title={title} tone="accent">
        <div className="flex items-center gap-2">
          <Badge size="sm" variant={badge.variant}>{badge.label}</Badge>
          <span className="text-sm text-muted-foreground">Preview target for {doc.doc_title}</span>
        </div>
        <p className="text-sm leading-6 text-foreground">{description}</p>
      </SectionCard>
      <SectionCard title="Selected File Snapshot">
        <MetaRow label="File" value={doc.doc_title} />
        <MetaRow label="Format" value={getDocumentFormat(doc)} />
        <MetaRow label="Size" value={formatBytes(doc.source_filesize)} />
      </SectionCard>
    </PanelFrame>
  );
}

export const EXTRACT_TABS: WorkbenchTab[] = [
  { id: 'extract-files', label: 'File List', icon: IconFileCode },
  { id: 'extract-config', label: 'Extract Config', icon: IconSettings },
  { id: 'extract-targets', label: 'Extract Targets', icon: IconLayoutList },
  { id: 'extract-badges', label: 'Badges', icon: IconLayoutList },
  { id: 'extract-token', label: 'Token', icon: IconFileText },
  { id: 'extract-contracts', label: 'Contracts', icon: IconBraces },
];

export const EXTRACT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-extract-files', tabs: ['extract-files'], activeTab: 'extract-files', width: 32 },
  { id: 'pane-extract-config', tabs: ['extract-config', 'extract-targets'], activeTab: 'extract-config', width: 24 },
  { id: 'pane-extract-preview', tabs: ['extract-badges', 'extract-token', 'extract-contracts'], activeTab: 'extract-badges', width: 44 },
]);

export function useExtractWorkbench() {
  useShellHeaderTitle({ title: 'Extract Documents' });
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

    if (tabId === 'extract-targets') {
      return <ExtractTargetsTab doc={activeDoc} />;
    }

    if (tabId === 'extract-badges') {
      return (
        <PreviewSurface
          doc={activeDoc}
          title="Badges Preview"
          badge={{ label: 'Badges', variant: 'blue' }}
          description="Use this area to preview concise document badges, categories, and chips extracted from the selected file."
        />
      );
    }

    if (tabId === 'extract-token') {
      return (
        <PreviewSurface
          doc={activeDoc}
          title="Token Preview"
          badge={{ label: 'Token', variant: 'violet' }}
          description="Use this area to inspect compact extraction payloads designed for search, indexing, or downstream ranking."
        />
      );
    }

    if (tabId === 'extract-contracts') {
      return (
        <PreviewSurface
          doc={activeDoc}
          title="Contracts Preview"
          badge={{ label: 'Contracts', variant: 'orange' }}
          description="Use this area to review richer structured extraction outputs, relationship maps, and contract-like schemas."
        />
      );
    }

    return null;
  }, [activeDoc, activeDocUid, allSelected, docs, error, handleDocClick, loading, selected, someSelected, toggleSelect, toggleSelectAll]);

  return { renderContent };
}
