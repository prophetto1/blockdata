import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconBraces, IconFileCode, IconLoader2, IconFileText, IconLayoutList, IconSettings } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { WorkbenchTab, WorkbenchHandle } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JsonViewer, parseJsonViewerContent, type ParsedJsonViewerContent } from '@/components/json/JsonViewer';
import { DocumentFileTable, type ExtraColumn } from '@/components/documents/DocumentFileTable';
import {
  DocumentPreviewFrame,
  DocumentPreviewMessage,
  DocumentPreviewShell,
} from '@/components/documents/DocumentPreviewShell';
import { ParseConfigColumn } from '@/components/documents/ParseConfigColumn';
import { ParseSettingsColumn } from '@/components/documents/ParseSettingsColumn';
import { ParseTabPanel, useParseTab } from '@/components/documents/ParseTabPanel';
import { cn } from '@/lib/utils';
import { formatBytes, getDocumentFormat, getFilenameFromLocator, resolveSignedUrlForLocators, type ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { BlockRow } from '@/lib/types';
import { useBlockTypeRegistry } from '@/hooks/useBlockTypeRegistry';

const DOCUMENTS_BUCKET =
  (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

// ─── Data fetchers ───────────────────────────────────────────────────────────

async function getArtifactLocator(
  sourceUid: string,
  reprType: 'doclingdocument_json' | 'markdown_bytes',
): Promise<string | null> {
  const { data } = await supabase
    .from('conversion_representations')
    .select('artifact_locator')
    .eq('source_uid', sourceUid)
    .eq('representation_type', reprType)
    .maybeSingle();
  return data?.artifact_locator ?? null;
}

type DoclingMarkdownState = {
  markdown: string;
  loading: boolean;
  error: string | null;
  downloadUrl: string | null;
  downloadFilename: string | null;
};

type ParsedBlocksState = {
  blocks: BlockRow[];
  loading: boolean;
  error: string | null;
};

type DoclingJsonState = {
  content: ParsedJsonViewerContent | null;
  loading: boolean;
  error: string | null;
  downloadUrl: string | null;
};

type ParsedBlockMetadata = {
  pageNo: number | null;
};

function getParsedBlockMetadata(block: BlockRow): ParsedBlockMetadata {
  const locator = (block.block_locator ?? null) as Record<string, unknown> | null;
  const explicitPageNo = typeof locator?.page_no === 'number' ? locator.page_no : null;
  const pageNos = Array.isArray(locator?.page_nos)
    ? locator.page_nos.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    : [];

  return {
    pageNo: explicitPageNo ?? pageNos[0] ?? null,
  };
}

function DoclingJsonTab({ doc }: { doc: ProjectDocumentRow | null }) {
  const [state, setState] = useState<DoclingJsonState | null>(null);

  useEffect(() => {
    if (!doc) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ content: null, loading: true, error: null, downloadUrl: null });

    (async () => {
      const locator = await getArtifactLocator(doc.source_uid, 'doclingdocument_json');
      if (cancelled) return;
      if (!locator) {
        setState({ content: null, loading: false, error: 'No DoclingDocument JSON available. Reset and re-parse with Docling.', downloadUrl: null });
        return;
      }

      const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(locator, 60 * 20);
      if (cancelled) return;
      if (!data?.signedUrl) {
        setState({ content: null, loading: false, error: 'Could not generate download URL for the Docling JSON artifact.', downloadUrl: null });
        return;
      }

      try {
        const resp = await fetch(data.signedUrl);
        if (cancelled) return;
        if (!resp.ok) {
          setState({ content: null, loading: false, error: `Failed to load Docling JSON (${resp.status}).`, downloadUrl: data.signedUrl });
          return;
        }
        const raw = await resp.text();
        if (cancelled) return;
        setState({ content: parseJsonViewerContent(raw), loading: false, error: null, downloadUrl: data.signedUrl });
      } catch {
        if (cancelled) return;
        setState({ content: null, loading: false, error: 'Failed to load the Docling JSON artifact.', downloadUrl: data.signedUrl });
      }
    })();

    return () => { cancelled = true; };
  }, [doc]);

  if (!doc) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select a parsed file to preview its DoclingDocument JSON." />
      </DocumentPreviewFrame>
    );
  }

  if (!state || state.loading) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={<IconLoader2 size={20} className="animate-spin text-muted-foreground" />} />
      </DocumentPreviewShell>
    );
  }

  if (state.error) {
    return (
      <DocumentPreviewShell doc={doc} downloadUrl={state.downloadUrl}>
        <DocumentPreviewMessage message={state.error} />
      </DocumentPreviewShell>
    );
  }

  return (
    <DocumentPreviewShell doc={doc} downloadUrl={state.downloadUrl}>
      <div className="h-full min-h-0 px-4 py-4">
        <JsonViewer value={state.content?.data ?? ''} mode={state.content?.mode ?? 'raw'} />
      </div>
    </DocumentPreviewShell>
  );
}

// ─── Tab components ──────────────────────────────────────────────────────────

function DoclingMdTab({ doc }: { doc: ProjectDocumentRow | null }) {
  const [state, setState] = useState<DoclingMarkdownState | null>(null);

  useEffect(() => {
    if (!doc) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ markdown: '', loading: true, error: null, downloadUrl: null, downloadFilename: null });

    (async () => {
      const locator = await getArtifactLocator(doc.source_uid, 'markdown_bytes');
      if (cancelled) return;
      if (!locator) {
        setState({ markdown: '', loading: false, error: 'No Docling markdown artifact is available for this document.', downloadUrl: null, downloadFilename: null });
        return;
      }
      const downloadFilename = getFilenameFromLocator(locator) ?? `${doc.doc_title || 'document'}.md`;

      const { url: signedUrl, error: signedUrlError } = await resolveSignedUrlForLocators([locator]);
      if (cancelled) return;
      if (!signedUrl) {
        setState({
          markdown: '',
          loading: false,
          error: signedUrlError ?? 'Could not generate download URL for the Docling markdown artifact.',
          downloadUrl: null,
          downloadFilename,
        });
        return;
      }

      try {
        const resp = await fetch(signedUrl);
        if (cancelled) return;
        if (!resp.ok) {
          setState({ markdown: '', loading: false, error: `Failed to load Docling markdown (${resp.status}).`, downloadUrl: signedUrl, downloadFilename });
          return;
        }
        const markdown = await resp.text();
        if (cancelled) return;
        setState({ markdown: markdown || '[Empty markdown file]', loading: false, error: null, downloadUrl: signedUrl, downloadFilename });
      } catch {
        if (cancelled) return;
        setState({ markdown: '', loading: false, error: 'Failed to load the Docling markdown artifact.', downloadUrl: signedUrl, downloadFilename });
      }
    })();

    return () => { cancelled = true; };
  }, [doc]);

  if (!doc) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select a parsed file to preview its Docling markdown." />
      </DocumentPreviewFrame>
    );
  }

  if (!state || state.loading) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={<IconLoader2 size={20} className="animate-spin text-muted-foreground" />} />
      </DocumentPreviewShell>
    );
  }

  if (state.error) {
    return (
      <DocumentPreviewShell doc={doc} downloadUrl={state.downloadUrl} downloadFilename={state.downloadFilename}>
        <DocumentPreviewMessage message={state.error} />
      </DocumentPreviewShell>
    );
  }

  return (
    <DocumentPreviewShell doc={doc} downloadUrl={state.downloadUrl} downloadFilename={state.downloadFilename}>
      <div className="px-6 py-4">
        <div className="docling-md-preview">
          <ReactMarkdown
            remarkPlugins={[remarkFrontmatter, remarkGfm, remarkMath, remarkEmoji]}
            rehypePlugins={[rehypeKatex]}
          >
            {state.markdown}
          </ReactMarkdown>
        </div>
      </div>
    </DocumentPreviewShell>
  );
}

function BlocksTab({ doc }: { doc: ProjectDocumentRow | null }) {
  const [state, setState] = useState<ParsedBlocksState | null>(null);
  const { registry } = useBlockTypeRegistry();
  const badgeColorMap = useMemo(() => registry?.badgeColor ?? {}, [registry]);

  useEffect(() => {
    if (!doc) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ blocks: [], loading: true, error: null });

    (async () => {
      try {
        const convUid = doc.conv_uid ?? (
          await supabase
            .from(TABLES.conversionParsing)
            .select('conv_uid')
            .eq('source_uid', doc.source_uid)
            .maybeSingle()
        ).data?.conv_uid ?? null;

        if (cancelled) return;
        if (!convUid) {
          setState({ blocks: [], loading: false, error: 'No parsed conversion record was found for this document.' });
          return;
        }

        const { data, error } = await supabase
          .from(TABLES.blocks)
          .select('block_uid, conv_uid, block_index, block_type, block_locator, block_content')
          .eq('conv_uid', convUid)
          .order('block_index', { ascending: true });

        if (cancelled) return;
        if (error) {
          setState({ blocks: [], loading: false, error: error.message });
          return;
        }

        setState({ blocks: (data ?? []) as BlockRow[], loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState({ blocks: [], loading: false, error: error instanceof Error ? error.message : 'Failed to load stored blocks.' });
      }
    })();

    return () => { cancelled = true; };
  }, [doc, doc?.source_uid]);

  if (!doc) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select a parsed file to preview its blocks." />
      </DocumentPreviewFrame>
    );
  }

  if (!state || state.loading) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={<IconLoader2 size={20} className="animate-spin text-muted-foreground" />} />
      </DocumentPreviewShell>
    );
  }

  if (state.error) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={state.error} />
      </DocumentPreviewShell>
    );
  }

  if (state.blocks.length === 0) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message="No stored blocks were found for this parsed document." />
      </DocumentPreviewShell>
    );
  }

  return (
    <DocumentPreviewShell doc={doc}>
      <div className="space-y-3 px-4 py-4">
        {state.blocks.map((b, i) => (
          <div key={b.block_uid} className="rounded-lg border border-border bg-background/70 p-4 shadow-sm">
            {(() => {
              const metadata = getParsedBlockMetadata(b);

              return (
                <>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-2 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {i}
                      </span>
                      <Badge
                        size="xs"
                        variant={(badgeColorMap[b.block_type] ?? 'gray') as BadgeProps['variant']}
                      >
                        {b.block_type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {metadata.pageNo != null && (
                        <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground">
                          p.{metadata.pageNo}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {b.block_content}
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Document UID
                      </div>
                      <div className="break-all font-mono text-xs text-foreground/90">
                        {doc.source_uid}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Block UID
                      </div>
                      <div className="break-all font-mono text-xs text-foreground/90">
                        {b.block_uid}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </DocumentPreviewShell>
  );
}

type ParseFileListPaneProps = {
  docs: ProjectDocumentRow[];
  loading: boolean;
  error: string | null;
  selected: Set<string>;
  toggleSelect: (uid: string) => void;
  toggleSelectAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
  activeDocUid: string | null;
  onDocClick: (doc: ProjectDocumentRow) => void;
};

function getParseProfileName(doc: ProjectDocumentRow): string | null {
  const name = (doc.pipeline_config as Record<string, unknown> | null)?.name;
  return typeof name === 'string' && name.trim().length > 0 ? name : null;
}

function formatParseStatus(status: ProjectDocumentRow['status']): string {
  return status.replaceAll('_', ' ');
}

function ParseFileNavigator({
  docs,
  loading,
  error,
  selected,
  toggleSelect,
  toggleSelectAll,
  allSelected,
  someSelected,
  activeDocUid,
  onDocClick,
}: ParseFileListPaneProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-border px-3 py-2.5">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleSelectAll}
          className="mt-0.5 h-3.5 w-3.5 rounded border-border"
        />
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            File Navigator
          </div>
          <div className="text-xs leading-5 text-foreground/80">
            Preview-first list for switching quickly between parsed files.
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
        {loading && (
          <div className="px-4 py-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 size={16} className="animate-spin" />
              Loading files…
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-8 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && docs.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No files in this project yet.
          </div>
        )}

        {!loading && !error && docs.length > 0 && (
          <div className="space-y-1.5 p-2">
            {docs.map((doc) => {
              const isActive = activeDocUid === doc.source_uid;
              const isSelected = selected.has(doc.source_uid);
              const profileName = getParseProfileName(doc);

              return (
                <div
                  key={doc.source_uid}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'rounded-xl border transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary/10 ring-1 ring-inset ring-primary/20'
                      : 'border-transparent hover:border-border/80 hover:bg-accent/20',
                    isSelected && !isActive && 'bg-accent/15',
                  )}
                >
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(doc.source_uid);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-border"
                    />
                    <button
                      type="button"
                      onClick={() => onDocClick(doc)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className={cn(
                              'truncate text-[13px] leading-5',
                              isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/92',
                            )}
                          >
                            {doc.doc_title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground">
                            <span className="font-semibold uppercase tracking-[0.08em] text-foreground/60">
                              {getDocumentFormat(doc)}
                            </span>
                            <span>{formatBytes(doc.source_filesize)}</span>
                            {profileName && <span>{profileName}</span>}
                            {doc.conv_total_blocks != null && (
                              <span className="tabular-nums">{doc.conv_total_blocks} blocks</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            {formatParseStatus(doc.status)}
                          </div>
                          {isActive && (
                            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                              In preview
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {docs.length > 0 && (
        <div className="flex items-center border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>{docs.length} file{docs.length === 1 ? '' : 's'}</span>
          {selected.size > 0 && (
            <span className="ml-2 font-medium text-primary">
              {selected.size} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tabs & panes ────────────────────────────────────────────────────────────

export const PARSE_TABS: WorkbenchTab[] = [
  { id: 'parse-compact', label: 'File List', icon: IconFileCode },
  { id: 'config', label: 'Parse Config', icon: IconSettings },
  { id: 'parse-settings', label: 'Parse Settings', icon: IconSettings },
  { id: 'docling-md', label: 'Docling Markdown', icon: IconFileText },
  { id: 'blocks', label: 'Parsed Blocks', icon: IconLayoutList },
  { id: 'docling-json', label: 'DoclingDocument Json', icon: IconBraces },
];

export const PARSE_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-parse', tabs: ['parse-compact'], activeTab: 'parse-compact', width: 32 },
  { id: 'pane-config', tabs: ['config', 'parse-settings'], activeTab: 'config', width: 24 },
  { id: 'pane-preview', tabs: ['docling-md', 'blocks', 'docling-json'], activeTab: 'docling-md', width: 44 },
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

  const parseExtraColumns: ExtraColumn[] = useMemo(() => [
    {
      header: 'Profile',
      render: (doc) => {
        const name = getParseProfileName(doc);
        if (!name) return <span className="text-muted-foreground">—</span>;
        return <span className="text-foreground/85">{name}</span>;
      },
    },
    {
      header: 'Blocks',
      render: (doc) => {
        if (doc.conv_total_blocks == null) return <span className="text-muted-foreground">—</span>;
        return <span className="tabular-nums text-foreground/90">{doc.conv_total_blocks}</span>;
      },
    },
  ], []);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'parse' || tabId === 'parse-navigator' || tabId === 'parse-compact') {
      return (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 p-1">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[58rem] flex-col overflow-hidden rounded-md border border-border bg-card">
              {tabId === 'parse-navigator' ? (
                <ParseFileNavigator
                  docs={docs}
                  loading={loading}
                  error={error}
                  selected={selected}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  allSelected={allSelected}
                  someSelected={someSelected}
                  activeDocUid={activeDocUid}
                  onDocClick={handleDocClick}
                />
              ) : (
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
                  extraColumns={parseExtraColumns}
                  className={cn(
                    'parse-documents-table',
                    tabId === 'parse-compact' && 'parse-documents-table-compact',
                  )}
                />
              )}
            </div>
          </div>
          <ParseTabPanel parseTab={parseTab} />
        </div>
      );
    }

    if (tabId === 'config') {
      return (
        <ParseConfigColumn
          docs={docs}
          selected={selected}
          selectedDoc={activeDoc}
          parseTab={parseTab}
          onReset={(uids) => { for (const uid of uids) void handleReset(uid); }}
          onDelete={(uids) => { for (const uid of uids) void handleDelete(uid); }}
        />
      );
    }

    if (tabId === 'parse-settings') {
      return (
        <ParseSettingsColumn
          selectedDoc={activeDoc}
          parseTab={parseTab}
        />
      );
    }

    if (tabId === 'docling-md') {
      return <DoclingMdTab doc={activeDoc} />;
    }

    if (tabId === 'blocks') {
      return <BlocksTab doc={activeDoc} />;
    }

    if (tabId === 'docling-json') {
      return <DoclingJsonTab doc={activeDoc} />;
    }

    return null;
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, handleDocClick, parseTab, parseExtraColumns, handleReset, handleDelete]);

  return { renderContent, workbenchRef };
}
