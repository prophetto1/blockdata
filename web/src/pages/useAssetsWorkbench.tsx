import { useCallback, useMemo, useState } from 'react';
import { IconUpload, IconFiles, IconEye, IconDownload, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { UploadTabPanel } from '@/components/documents/UploadTabPanel';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { downloadFromSignedUrl, resolveSignedUrlForLocators } from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { manageDocument } from '@/lib/edge';

const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

export const ASSETS_TABS: WorkbenchTab[] = [
  { id: 'upload', label: 'Upload', icon: IconUpload },
  { id: 'files', label: 'Files', icon: IconFiles },
  { id: 'preview', label: 'Preview', icon: IconEye },
];

export const ASSETS_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-upload', tabs: ['upload'], activeTab: 'upload', width: 20, minWidth: 16, maxWidth: 24, maxTabs: 1 },
  { id: 'pane-files', tabs: ['files'], activeTab: 'files', width: 30, minWidth: 22 },
  { id: 'pane-preview', tabs: ['preview'], activeTab: 'preview', width: 50 },
]);

export function useAssetsWorkbench() {
  useShellHeaderTitle({ title: 'Project Assets' });
  const { resolvedProjectId } = useProjectFocus();

  const docState = useProjectDocuments(resolvedProjectId);
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, refreshDocs } = docState;

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  const handleDelete = useCallback(async (doc: ProjectDocumentRow) => {
    const result = await manageDocument('delete', doc.source_uid);
    if (!result.ok && !result.partial) return;
    const locator = doc.source_locator?.replace(/^\/+/, '');
    if (locator) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([locator]);
    }
    if (activeDocUid === doc.source_uid) setActiveDocUid(null);
    refreshDocs();
  }, [activeDocUid, refreshDocs]);

  const handleDownload = useCallback(async (doc: ProjectDocumentRow) => {
    const { url } = await resolveSignedUrlForLocators([doc.source_locator]);
    if (url) downloadFromSignedUrl(url, doc.doc_title);
  }, []);

  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground"
        onClick={(e) => { e.stopPropagation(); void handleDownload(doc); }}
        title="Download"
      >
        <IconDownload size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => { e.stopPropagation(); void handleDelete(doc); }}
        title="Delete"
      >
        <IconTrash size={14} />
      </Button>
    </div>
  ), [handleDownload, handleDelete]);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'upload') {
      if (!resolvedProjectId) {
        return (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a project first.
          </div>
        );
      }
      return <UploadTabPanel projectId={resolvedProjectId} onUploadComplete={refreshDocs} />;
    }

    if (tabId === 'files') {
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
                renderRowActions={renderRowActions}
                hideStatus
                className={cn('parse-documents-table', 'parse-documents-table-compact')}
              />
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'preview') {
      return (
        <PreviewTabPanel
          doc={activeDoc}
          allowParsedPdfView={false}
          showHeaderDownload={false}
        />
      );
    }

    return null;
  }, [resolvedProjectId, docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, refreshDocs]);

  return { renderContent };
}
