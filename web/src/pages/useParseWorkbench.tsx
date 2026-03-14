import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconFileCode, IconEye, IconLoader2, IconFileText, IconLayoutList } from '@tabler/icons-react';
import { platformApiFetch } from '@/lib/platformApi';
import type { WorkbenchTab, WorkbenchHandle } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import { ParseTabPanel, useParseTab, ParseRowActions } from '@/components/documents/ParseTabPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';

const DOCUMENTS_BUCKET =
  (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function getArtifactLocator(
  sourceUid: string,
  reprType: 'doclingdocument_json',
): Promise<string | null> {
  const { data } = await supabase
    .from('conversion_representations')
    .select('artifact_locator')
    .eq('source_uid', sourceUid)
    .eq('representation_type', reprType)
    .maybeSingle();
  return data?.artifact_locator ?? null;
}

type ReconstructBlock = {
  block_type: string;
  block_content: string;
  pointer: string;
  page_no: number | null;
  page_nos: number[];
  parser_block_type: string;
  parser_path: string;
};

// ─── Tab components ──────────────────────────────────────────────────────────

function DoclingMdTab({ sourceUid }: { sourceUid: string | null }) {
  const [state, setState] = useState<{ html: string; loading: boolean } | null>(null);

  useEffect(() => {
    if (!sourceUid) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ html: '', loading: true });

    (async () => {
      // 1. Get the doclingdocument_json artifact locator
      const locator = await getArtifactLocator(sourceUid, 'doclingdocument_json');
      if (cancelled) return;
      if (!locator) {
        setState({ html: '<p>No DoclingDocument JSON available. Reset and re-parse with Docling.</p>', loading: false });
        return;
      }

      // 2. Create signed URL for the JSON artifact
      const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
      if (cancelled) return;
      if (!data?.signedUrl) {
        setState({ html: '<p>Could not generate download URL.</p>', loading: false });
        return;
      }

      // 3. Call reconstruct endpoint
      try {
        const resp = await platformApiFetch('/reconstruct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docling_json_url: data.signedUrl }),
        });
        if (cancelled) return;
        if (!resp.ok) {
          setState({ html: `<p>Reconstruct failed (${resp.status}).</p>`, loading: false });
          return;
        }
        const result = await resp.json();
        setState({ html: result.html ?? '<p>No HTML returned.</p>', loading: false });
      } catch {
        if (cancelled) return;
        setState({ html: '<p>Failed to reconstruct document.</p>', loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [sourceUid]);

  if (!sourceUid) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a parsed file to preview its Docling markdown.
      </div>
    );
  }

  if (!state || state.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" viewportClass="h-full overflow-auto">
      <div className="parse-markdown-preview px-6 py-4" dangerouslySetInnerHTML={{ __html: state.html }} />
    </ScrollArea>
  );
}

function BlocksTab({ sourceUid }: { sourceUid: string | null }) {
  const [state, setState] = useState<{ blocks: ReconstructBlock[]; loading: boolean } | null>(null);

  useEffect(() => {
    if (!sourceUid) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ blocks: [], loading: true });

    (async () => {
      // 1. Get the doclingdocument_json artifact locator
      const locator = await getArtifactLocator(sourceUid, 'doclingdocument_json');
      if (cancelled) return;
      if (!locator) {
        setState({ blocks: [], loading: false });
        return;
      }

      // 2. Create signed URL for the JSON artifact
      const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
      if (cancelled) return;
      if (!data?.signedUrl) {
        setState({ blocks: [], loading: false });
        return;
      }

      // 3. Call reconstruct endpoint
      try {
        const resp = await platformApiFetch('/reconstruct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docling_json_url: data.signedUrl }),
        });
        if (cancelled) return;
        if (!resp.ok) {
          setState({ blocks: [], loading: false });
          return;
        }
        const result = await resp.json();
        setState({ blocks: result.blocks ?? [], loading: false });
      } catch {
        if (cancelled) return;
        setState({ blocks: [], loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [sourceUid]);

  if (!sourceUid) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a parsed file to preview its blocks.
      </div>
    );
  }

  if (!state || state.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No blocks found. Reset and re-parse with Docling.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" viewportClass="h-full overflow-auto">
      <div className="divide-y divide-border">
        {state.blocks.map((b, i) => (
          <div key={`${b.pointer}-${i}`} className="px-4 py-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex rounded bg-muted/60 px-1.5 py-0 text-[9px] font-semibold uppercase leading-4 text-muted-foreground">
                {b.block_type}
              </span>
              {b.page_no != null && (
                <span className="text-[10px] text-muted-foreground">p.{b.page_no}</span>
              )}
            </div>
            <div className="whitespace-pre-wrap text-xs text-foreground">{b.block_content}</div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ─── Tabs & panes ────────────────────────────────────────────────────────────

export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse', label: 'Parse', icon: IconFileCode },
  { id: 'docling-md', label: 'Docling MD', icon: IconFileText },
  { id: 'preview', label: 'Preview', icon: IconEye },
  { id: 'blocks', label: 'Blocks', icon: IconLayoutList },
];

export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse'], activeTab: 'parse', width: 44 },
  { id: 'pane-preview', tabs: ['docling-md', 'preview', 'blocks'], activeTab: 'preview', width: 56 },
]);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useParseWorkbench() {
  useShellHeaderTitle({ title: 'Parse Documents' });
  const { resolvedProjectId } = useProjectFocus();
  const workbenchRef = useRef<WorkbenchHandle>(null);

  const docState = useProjectDocuments(resolvedProjectId);
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, refreshDocs } = docState;

  const parseTab = useParseTab();

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => docs.find((d) => d.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  const handleDoclingMdPreview = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
    workbenchRef.current?.addTab('docling-md', 'pane-preview');
  }, []);

  const handleBlocksPreview = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
    workbenchRef.current?.addTab('blocks', 'pane-preview');
  }, []);

  const handleReset = useCallback(async (uid: string) => {
    const { error: rpcErr } = await supabase.rpc('reset_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Reset failed:', rpcErr.message);
      return;
    }
    refreshDocs();
  }, [refreshDocs]);

  const handleDelete = useCallback(async (uid: string) => {
    const { error: rpcErr } = await supabase.rpc('delete_source_document', { p_source_uid: uid });
    if (rpcErr) {
      console.error('Delete failed:', rpcErr.message);
      return;
    }
    if (activeDocUid === uid) setActiveDocUid(null);
    refreshDocs();
  }, [activeDocUid, refreshDocs]);

  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <ParseRowActions
      doc={doc}
      parseTab={parseTab}
      onDoclingMdPreview={handleDoclingMdPreview}
      onBlocksPreview={handleBlocksPreview}
      onReset={handleReset}
      onDelete={handleDelete}
    />
  ), [parseTab, handleDoclingMdPreview, handleBlocksPreview, handleReset, handleDelete]);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'parse') {
      return (
        <div className="flex h-full flex-col">
          <ParseTabPanel
            docs={docs}
            selected={selected}
            parseTab={parseTab}
            onReset={(uids) => { for (const uid of uids) void handleReset(uid); }}
            onDelete={(uids) => { for (const uid of uids) void handleDelete(uid); }}
          />
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

    if (tabId === 'docling-md') {
      return <DoclingMdTab sourceUid={activeDocUid} />;
    }

    if (tabId === 'preview') {
      return <PreviewTabPanel doc={activeDoc} />;
    }

    if (tabId === 'blocks') {
      return <BlocksTab sourceUid={activeDocUid} />;
    }

    return null;
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, renderRowActions, parseTab, handleReset, handleDelete]);

  return { renderContent, workbenchRef };
}
