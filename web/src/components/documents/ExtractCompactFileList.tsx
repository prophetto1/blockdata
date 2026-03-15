import { useEffect, useRef, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/documents/StatusBadge';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { formatBytes, getDocumentDisplayName } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';

interface ExtractCompactFileListProps {
  docs: ProjectDocumentRow[];
  loading: boolean;
  error: string | null;
  selected: Set<string>;
  toggleSelect: (uid: string) => void;
  toggleSelectAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
  activeDoc?: string | null;
  onDocClick?: (doc: ProjectDocumentRow) => void;
  emptyMessage?: string;
}

type CompactLayout = 'inline' | 'stacked';

export function ExtractCompactFileList({
  docs,
  loading,
  error,
  selected,
  toggleSelect,
  toggleSelectAll,
  allSelected,
  someSelected,
  activeDoc,
  onDocClick,
  emptyMessage = 'No files in this project yet.',
}: ExtractCompactFileListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<CompactLayout>('inline');

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateLayout = (width: number) => {
      setLayout(width < 360 ? 'stacked' : 'inline');
    };

    updateLayout(node.clientWidth);

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateLayout(entry.contentRect.width);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="extract-compact-file-list"
      data-layout={layout}
      className="flex h-full flex-col"
    >
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleSelectAll}
          className="h-3.5 w-3.5 rounded border-border"
        />
        <div className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Compact
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
        {loading && (
          <div className="px-4 py-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 size={16} className="animate-spin" />
              Loading files...
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
            {emptyMessage}
          </div>
        )}

        {!loading && !error && docs.length > 0 && (
          <div className="space-y-1 p-1.5">
            {docs.map((doc) => {
              const isActive = activeDoc === doc.source_uid;
              const isSelected = selected.has(doc.source_uid);

              return (
                <div
                  key={doc.source_uid}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'overflow-hidden rounded-lg border transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-transparent hover:border-border/80 hover:bg-accent/20',
                    isSelected && !isActive && 'bg-accent/15',
                  )}
                >
                  <div className="flex items-start gap-2.5 px-2.5 py-2">
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
                      onClick={() => onDocClick?.(doc)}
                      className="w-full min-w-0 flex-1 text-left"
                    >
                      <div className={cn('min-w-0', layout === 'stacked' ? 'space-y-1.5' : 'space-y-1')}>
                        <div className="min-w-0 w-full">
                          <div
                            className={cn(
                              'w-full break-all text-[12px] leading-4',
                              isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/92',
                            )}
                          >
                            {getDocumentDisplayName(doc)}
                          </div>
                        </div>

                        <div
                          data-testid={`extract-compact-meta-${doc.source_uid}`}
                          className="flex flex-wrap items-center justify-between gap-2 text-[10px]"
                        >
                          <span className="text-muted-foreground">
                            {formatBytes(doc.source_filesize)}
                          </span>
                          <StatusBadge status={doc.status} error={doc.error} />
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
