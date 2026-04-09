/* eslint-disable react-refresh/only-export-components */

import { type ReactNode, useCallback, useState } from 'react';
import { IconChecklist, IconListDetails, IconNotes } from '@tabler/icons-react';

import { LocalFilePreview } from '@/components/documents/LocalFilePreview';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import type { FsNode } from '@/lib/fs-access';

import { WorkspaceFileTree } from './WorkspaceFileTree';

export const PLAN_TRACKER_TABS = [
  { id: 'files', label: 'Files', icon: IconChecklist },
  { id: 'preview', label: 'Preview', icon: IconNotes },
  { id: 'placeholder', label: 'Placeholder', icon: IconListDetails },
];

export const PLAN_TRACKER_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['files'], activeTab: 'files', width: 26 },
  { id: 'pane-2', tabs: ['preview'], activeTab: 'preview', width: 52 },
  { id: 'pane-3', tabs: ['placeholder'], activeTab: 'placeholder', width: 22 },
]);

type UsePlanTrackerResult = {
  renderContent: (tabId: string) => ReactNode;
};

export function usePlanTracker(storeKey = 'plan-tracker-dir'): UsePlanTrackerResult {
  const [selectedNode, setSelectedNode] = useState<FsNode | null>(null);

  const handleSelectFile = useCallback((node: FsNode) => {
    setSelectedNode(node);
  }, []);

  const handleRootHandle = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'files') {
      return (
        <WorkspaceFileTree
          onSelectFile={handleSelectFile}
          onRootHandle={handleRootHandle}
          storeKey={storeKey}
          readOnly
        />
      );
    }

    if (tabId === 'preview') {
      return <LocalFilePreview node={selectedNode} />;
    }

    if (tabId === 'placeholder') {
      return <div className="h-full w-full" data-testid="plan-tracker-placeholder-pane" />;
    }

    return null;
  }, [handleRootHandle, handleSelectFile, selectedNode, storeKey]);

  return { renderContent };
}
