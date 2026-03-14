import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconBraces, IconDownload, IconFileCode, IconLoader2, IconFileText, IconLayoutList, IconSettings } from '@tabler/icons-react';
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
import { Button } from '@/components/ui/button';
import { FieldErrorText, FieldHelperText, FieldLabel, FieldRoot } from '@/components/ui/field';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { downloadFromSignedUrl, formatBytes, getDocumentFormat, type ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';
import type { BlockRow } from '@/lib/types';
import { useBlockTypeRegistry } from '@/hooks/useBlockTypeRegistry';
import {
  createLoadingParseArtifactBundle,
  getParseArtifactCacheKey,
  primeParseArtifactsForDocument,
  type ParseArtifactBundle,
} from './parseArtifacts';

// ─── Data fetchers ───────────────────────────────────────────────────────────

type ParsedBlockMetadata = {
  pageNo: number | null;
};

export function getParsedBlockBadgeVariant(
  blockType: string,
  badgeColorMap: Record<string, string>,
): BadgeProps['variant'] {
  if (blockType.trim().toLowerCase() === 'paragraph') return 'green';
  return (badgeColorMap[blockType] ?? 'gray') as BadgeProps['variant'];
}

export type ParseDownloadItem = {
  id: 'docling-markdown' | 'document-json';
  label: string;
  description: string;
  formatLabel: string;
  downloadUrl: string | null;
  downloadFilename: string | null;
  error: string | null;
};

export function getParseDownloadItems(artifacts: ParseArtifactBundle | null): ParseDownloadItem[] {
  if (!artifacts) return [];

  return [
    {
      id: 'docling-markdown',
      label: 'Docling Markdown',
      description: 'The markdown artifact produced directly by the Docling parse.',
      formatLabel: 'MD',
      downloadUrl: artifacts.markdown.downloadUrl,
      downloadFilename: artifacts.markdown.downloadFilename,
      error: artifacts.markdown.error,
    },
    {
      id: 'document-json',
      label: 'Document Json',
      description: 'The full Docling document payload for downstream inspection or export.',
      formatLabel: 'JSON',
      downloadUrl: artifacts.json.downloadUrl,
      downloadFilename: artifacts.json.downloadFilename,
      error: artifacts.json.error,
    },
  ];
}

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

function DownloadsTab({ doc, artifacts }: { doc: ProjectDocumentRow | null; artifacts: ParseArtifactBundle | null }) {
  const [downloadingId, setDownloadingId] = useState<ParseDownloadItem['id'] | null>(null);

  if (!doc) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select a parsed file to access its downloadable parse artifacts." />
      </DocumentPreviewFrame>
    );
  }

  if (!artifacts || artifacts.markdown.loading || artifacts.json.loading) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={<IconLoader2 size={20} className="animate-spin text-muted-foreground" />} />
      </DocumentPreviewShell>
    );
  }

  const downloads = getParseDownloadItems(artifacts);

  return (
    <DocumentPreviewShell doc={doc}>
      <div className="space-y-4 px-4 py-4">
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div className="text-sm font-medium text-foreground">Download parse artifacts</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Each generated output is listed below, and new downloads can be added as another row.
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background/90">
          {downloads.map((item) => {
            const isDownloading = downloadingId === item.id;
            const isDisabled = !item.downloadUrl || isDownloading;

            return (
              <FieldRoot
                key={item.id}
                className="items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm" variant="outline">{item.formatLabel}</Badge>
                    <FieldLabel>{item.label}</FieldLabel>
                  </div>
                  <FieldHelperText className="mt-1">
                    {item.downloadFilename ?? item.description}
                  </FieldHelperText>
                  {item.error ? (
                    <FieldErrorText className="mt-1 block">{item.error}</FieldErrorText>
                  ) : null}
                </div>

                <Tooltip openDelay={150}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isDisabled}
                      aria-label={item.downloadUrl ? `Download ${item.label}` : `${item.label} unavailable`}
                      className="shrink-0"
                      onClick={async () => {
                        if (!item.downloadUrl) return;
                        setDownloadingId(item.id);
                        try {
                          await downloadFromSignedUrl(item.downloadUrl, item.downloadFilename ?? item.label);
                        } finally {
                          setDownloadingId((current) => (current === item.id ? null : current));
                        }
                      }}
                    >
                      {isDownloading ? (
                        <IconLoader2 size={16} className="animate-spin" />
                      ) : (
                        <IconDownload size={16} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="px-2 py-1 text-xs">
                    {item.downloadUrl ? `Download ${item.label}` : `${item.label} unavailable`}
                  </TooltipContent>
                </Tooltip>
              </FieldRoot>
            );
          })}
        </div>
      </div>
    </DocumentPreviewShell>
  );
}

// ─── Tab components ──────────────────────────────────────────────────────────

function DoclingMdTab({ doc, artifacts }: { doc: ProjectDocumentRow | null; artifacts: ParseArtifactBundle | null }) {
  if (!doc) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select a parsed file to preview its Docling markdown." />
      </DocumentPreviewFrame>
    );
  }

  if (!artifacts || artifacts.markdown.loading) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={<IconLoader2 size={20} className="animate-spin text-muted-foreground" />} />
      </DocumentPreviewShell>
    );
  }

  if (artifacts.markdown.error) {
    return (
      <DocumentPreviewShell
        doc={doc}
        downloadUrl={artifacts.markdown.downloadUrl}
        downloadFilename={artifacts.markdown.downloadFilename}
      >
        <DocumentPreviewMessage message={artifacts.markdown.error} />
      </DocumentPreviewShell>
    );
  }

  return (
    <DocumentPreviewShell
      doc={doc}
      downloadUrl={artifacts.markdown.downloadUrl}
      downloadFilename={artifacts.markdown.downloadFilename}
    >
      <div className="px-6 py-4">
        <div className="docling-md-preview">
          <ReactMarkdown
            remarkPlugins={[remarkFrontmatter, remarkGfm, remarkMath, remarkEmoji]}
            rehypePlugins={[rehypeKatex]}
          >
            {artifacts.markdown.markdown}
          </ReactMarkdown>
        </div>
      </div>
    </DocumentPreviewShell>
  );
}

function BlocksTab({ doc, artifacts }: { doc: ProjectDocumentRow | null; artifacts: ParseArtifactBundle | null }) {
  const { registry } = useBlockTypeRegistry();
  const badgeColorMap = useMemo(() => registry?.badgeColor ?? {}, [registry]);

  if (!doc) {
    return (
      <DocumentPreviewFrame>
        <DocumentPreviewMessage message="Select a parsed file to preview its blocks." />
      </DocumentPreviewFrame>
    );
  }

  if (!artifacts || artifacts.blocks.loading || artifacts.json.loading) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={<IconLoader2 size={20} className="animate-spin text-muted-foreground" />} />
      </DocumentPreviewShell>
    );
  }

  const isRawDocling = artifacts.mode === 'raw_docling';
  const state = artifacts.blocks;
  const effectiveError = isRawDocling ? artifacts.json.error ?? state.error : state.error;

  if (effectiveError) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message={effectiveError} />
      </DocumentPreviewShell>
    );
  }

  if (!isRawDocling && state.blocks.length === 0) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message="No stored blocks were found for this parsed document." />
      </DocumentPreviewShell>
    );
  }

  if (isRawDocling && state.rawItems.length === 0) {
    return (
      <DocumentPreviewShell doc={doc}>
        <DocumentPreviewMessage message="No raw Docling items were found for this parsed document." />
      </DocumentPreviewShell>
    );
  }

  return (
    <DocumentPreviewShell doc={doc}>
      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {isRawDocling
              ? state.rawItems.length + ' raw Docling item' + (state.rawItems.length === 1 ? '' : 's')
              : state.blocks.length + ' normalized block' + (state.blocks.length === 1 ? '' : 's')}
          </div>
          <Badge size="sm" variant={isRawDocling ? 'teal' : 'gray'}>
            {isRawDocling ? 'Raw Docling' : 'Normalized'}
          </Badge>
        </div>

        {isRawDocling ? state.rawItems.map((item, i) => (
          <div key={item.pointer} className="rounded-lg border border-border bg-background/70 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-2 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {i}
                </span>
                <Badge size="xs" variant="teal">
                  {item.kind}
                </Badge>
                <Badge size="xs" variant="outline">
                  {item.native_label}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.page_no != null && (
                  <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    p.{item.page_no}
                  </span>
                )}
              </div>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {item.content || <span className="italic text-muted-foreground">No text content.</span>}
            </div>

            <div className="mt-4 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Pointer
                </div>
                <div className="break-all font-mono text-xs text-foreground/90">
                  {item.pointer}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Pages
                </div>
                <div className="break-all font-mono text-xs text-foreground/90">
                  {item.page_nos.length > 0 ? item.page_nos.join(', ') : '?'}
                </div>
              </div>
            </div>
          </div>
        )) : state.blocks.map((b, i) => (
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
                        variant={getParsedBlockBadgeVariant(b.block_type, badgeColorMap)}
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
  { id: 'docling-json', label: 'Downloads', icon: IconBraces },
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
  const artifactsCacheRef = useRef(new Map<string, ParseArtifactBundle>());
  const artifactsRequestRef = useRef(new Map<string, Promise<ParseArtifactBundle>>());

  const docState = useProjectDocuments(resolvedProjectId);
  const { docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, refreshDocs } = docState;

  const parseTab = useParseTab();

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);
  const [activeArtifacts, setActiveArtifacts] = useState<ParseArtifactBundle | null>(null);
  const activeDoc = useMemo(
    () => docs.find((d) => d.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  useEffect(() => {
    if (!activeDoc) {
      setActiveArtifacts(null);
      return;
    }

    const cacheKey = getParseArtifactCacheKey(activeDoc);
    const cached = artifactsCacheRef.current.get(cacheKey);
    if (cached) {
      setActiveArtifacts(cached);
      return;
    }

    let cancelled = false;
    setActiveArtifacts(createLoadingParseArtifactBundle(activeDoc));

    const existingRequest = artifactsRequestRef.current.get(cacheKey);
    const request = existingRequest ?? primeParseArtifactsForDocument(activeDoc);
    if (!existingRequest) {
      artifactsRequestRef.current.set(cacheKey, request);
    }

    request
      .then((bundle) => {
        artifactsCacheRef.current.set(cacheKey, bundle);
        artifactsRequestRef.current.delete(cacheKey);
        if (!cancelled && getParseArtifactCacheKey(activeDoc) === cacheKey) {
          setActiveArtifacts(bundle);
        }
      })
      .catch(() => {
        artifactsRequestRef.current.delete(cacheKey);
      });

    return () => {
      cancelled = true;
    };
  }, [activeDoc]);

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
      id: 'profile',
      header: 'Profile',
      collapseBelow: 700,
      className: 'w-[8.5rem]',
      render: (doc) => {
        const name = getParseProfileName(doc);
        if (!name) return <span className="text-muted-foreground">—</span>;
        return <span className="block truncate text-foreground/85">{name}</span>;
      },
    },
    {
      id: 'blocks',
      header: 'Blocks',
      collapseBelow: 620,
      className: 'w-[4.5rem] whitespace-nowrap text-right',
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
      return <DoclingMdTab doc={activeDoc} artifacts={activeArtifacts} />;
    }

    if (tabId === 'blocks') {
      return <BlocksTab doc={activeDoc} artifacts={activeArtifacts} />;
    }

    if (tabId === 'docling-json') {
      return <DownloadsTab doc={activeDoc} artifacts={activeArtifacts} />;
    }

    return null;
  }, [docs, loading, error, selected, toggleSelect, toggleSelectAll, allSelected, someSelected, activeDocUid, activeDoc, activeArtifacts, handleDocClick, parseTab, parseExtraColumns, handleReset, handleDelete]);

  return { renderContent, workbenchRef };
}
