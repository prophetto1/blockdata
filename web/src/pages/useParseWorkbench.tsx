import { useCallback, useMemo, useState } from 'react';
import { IconFileCode, IconEye } from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import { ParseTabPanel, useParseTab, ParseRowActions } from '@/components/documents/ParseTabPanel';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse', label: 'Parse', icon: IconFileCode },
  { id: 'preview', label: 'Preview', icon: IconEye },
];

export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse'], activeTab: 'parse', width: 44 },
  { id: 'pane-preview', tabs: ['preview'], activeTab: 'preview', width: 56 },
]);

export function useParseWorkbench() {
  useShellHeaderTitle({ title: 'Parse Documents' });
  const { resolvedProjectId } = useProjectFocus();

  const docState = useProjectDocuments(resolvedProjectId);
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected } = docState;

  const parseTab = useParseTab();

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <ParseRowActions doc={doc} parseTab={parseTab} />
  ), [parseTab]);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'parse') {
      return (
        <div className="flex h-full flex-col">
          <ParseTabPanel docs={docs} selected={selected} parseTab={parseTab} />
          <div className="min-h-0 flex-1">
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
              renderRowActions={renderRowActions}
            />
          </div>
        </div>
      );
    }

    if (tabId === 'preview') {
      return <PreviewTabPanel doc={activeDoc} />;
    }

    return null;
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, parseTab]);

  return { renderContent };
}
