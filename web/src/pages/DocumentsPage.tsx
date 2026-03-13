import { useCallback, useMemo, useState } from 'react';
import {
  IconUpload,
  IconScan,
  IconFileText,
} from '@tabler/icons-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { UploadTabPanel } from '@/components/documents/UploadTabPanel';
import { ParseTabPanel, ParseRowActions, useParseTab } from '@/components/documents/ParseTabPanel';
import { EditTabPanel } from '@/components/documents/EditTabPanel';

import { cn } from '@/lib/utils';

type Tab = 'upload' | 'parse' | 'edit';

const TABS: { id: Tab; label: string; icon: typeof IconUpload }[] = [
  { id: 'upload', label: 'Upload', icon: IconUpload },
  { id: 'parse', label: 'Parse', icon: IconScan },
  { id: 'edit', label: 'Edit', icon: IconFileText },
];

export default function DocumentsPage() {
  useShellHeaderTitle({ title: 'Documents' });

  const { resolvedProjectId, resolvedProjectName } = useProjectFocus();
  const docState = useProjectDocuments(resolvedProjectId ?? null);
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [editDocUid, setEditDocUid] = useState<string | null>(null);

  const parseTab = useParseTab();

  const editDoc = useMemo(
    () => docState.docs.find((d) => d.source_uid === editDocUid) ?? null,
    [docState.docs, editDocUid],
  );

  const handleDocClick = useCallback(
    (doc: { source_uid: string }) => {
      if (activeTab === 'edit') {
        setEditDocUid(doc.source_uid);
      }
    },
    [activeTab],
  );

  const renderRowActions = useMemo(() => {
    if (activeTab === 'parse') {
      return (doc: Parameters<typeof ParseRowActions>[0]['doc']) => (
        <ParseRowActions doc={doc} parseTab={parseTab} />
      );
    }
    return undefined;
  }, [activeTab, parseTab]);

  if (!resolvedProjectId) {
    return (
      <div className="flex h-[calc(100vh-var(--app-shell-header-height))] items-center justify-center text-sm text-muted-foreground">
        Select a project to manage documents.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden">
      {/* Left: shared file table */}
      <section className="flex min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-r border-border">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <h2 className="text-sm font-medium text-foreground">
            {resolvedProjectName ?? 'Documents'}
          </h2>
          <span className="text-xs text-muted-foreground">
            {docState.docs.length} file{docState.docs.length === 1 ? '' : 's'}
          </span>
        </div>
        <DocumentFileTable
          docs={docState.docs}
          loading={docState.loading}
          error={docState.error}
          selected={docState.selected}
          toggleSelect={docState.toggleSelect}
          toggleSelectAll={docState.toggleSelectAll}
          allSelected={docState.allSelected}
          someSelected={docState.someSelected}
          activeDoc={activeTab === 'edit' ? editDocUid : undefined}
          onDocClick={activeTab === 'edit' ? handleDocClick : undefined}
          renderRowActions={renderRowActions}
          emptyMessage="No files yet. Use the Upload tab to add documents."
        />
      </section>

      {/* Right: tabbed panel */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30',
                )}
              >
                <Icon size={14} stroke={1.75} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-0 flex-1 overflow-auto">
          {activeTab === 'upload' && (
            <UploadTabPanel
              projectId={resolvedProjectId}
              onUploadComplete={docState.refreshDocs}
            />
          )}
          {activeTab === 'parse' && (
            <ParseTabPanel
              docs={docState.docs}
              selected={docState.selected}
              parseTab={parseTab}
            />
          )}
          {activeTab === 'edit' && (
            <EditTabPanel selectedDoc={editDoc} />
          )}
        </div>
      </section>
    </div>
  );
}
