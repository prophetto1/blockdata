import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/documents/StatusBadge';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { getDocumentDisplayName, formatBytes } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';

export interface ExtraColumn {
  id?: string;
  header: string;
  render: (doc: ProjectDocumentRow) => ReactNode;
  collapseBelow?: number;
  className?: string;
}

interface DocumentFileTableProps {
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
  renderRowActions?: (doc: ProjectDocumentRow) => ReactNode;
  emptyMessage?: string;
  hideStatus?: boolean;
  extraColumns?: ExtraColumn[];
  className?: string;
}

export function DocumentFileTable({
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
  renderRowActions,
  emptyMessage = 'No files in this project yet.',
  hideStatus = false,
  extraColumns = [],
  className,
}: DocumentFileTableProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const classTokens = className?.split(/\s+/) ?? [];
  const isParseTable = classTokens.includes('parse-documents-table');
  const isParseDense = classTokens.includes('parse-documents-table-compact');
  const showParseSize = !isParseTable || containerWidth == null || containerWidth >= 280;
  const showParseStatus = hideStatus ? false : (!isParseTable || containerWidth == null || containerWidth >= 240);
  const shouldWrapParseName = isParseTable && containerWidth != null && containerWidth < 260;
  const visibleExtraColumns = useMemo(
    () => extraColumns.filter((col) => !isParseTable || col.collapseBelow == null || containerWidth == null || containerWidth >= col.collapseBelow),
    [containerWidth, extraColumns, isParseTable],
  );

  useEffect(() => {
    if (!isParseTable) return;
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => setContainerWidth(node.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isParseTable]);

  const tableClassName = cn(
    'w-full text-left',
    isParseDense
      ? 'table-fixed text-[12px] leading-5'
      : isParseTable
      ? 'table-fixed text-[length:var(--parse-json-font-size)] leading-[var(--parse-json-line-height)]'
      : 'text-sm',
  );
  const headerCellClassName = cn(
    'font-medium',
    isParseDense
      ? 'px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground'
      : isParseTable
      ? 'px-2.5 py-1.5 text-[11px]'
      : 'px-3 py-2',
  );
  const bodyCellClassName = isParseDense ? 'px-2 py-1.5' : isParseTable ? 'px-2.5 py-2' : 'px-3 py-2.5';

  const baseCols =
    1 +
    1 +
    (showParseSize ? 1 : 0) +
    (showParseStatus ? 1 : 0) +
    visibleExtraColumns.length +
    (renderRowActions ? 1 : 0);
  return (
    <div ref={containerRef} className={cn('flex h-full flex-col', className)}>
      <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
        <table className={tableClassName}>
          <thead className="sticky top-0 z-10 border-b border-border bg-card text-muted-foreground">
            <tr>
              <th className={cn('w-9', isParseDense ? 'px-2 py-1' : isParseTable ? 'px-2.5 py-1.5' : 'px-3 py-2')}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-border"
                />
              </th>
              <th className={headerCellClassName}>Name</th>
              {showParseSize && <th className={cn(headerCellClassName, isParseTable && 'w-[4.5rem]')}>Size</th>}
              {showParseStatus && <th className={cn(headerCellClassName, isParseTable && 'w-[6.5rem]')}>Status</th>}
              {visibleExtraColumns.map((col) => (
                <th key={col.id ?? col.header} className={cn(headerCellClassName, col.className)}>{col.header}</th>
              ))}
              {renderRowActions && <th className={cn(headerCellClassName, isParseTable && 'w-[4.5rem]')}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={baseCols} className="px-3 py-8 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <IconLoader2 size={16} className="animate-spin" />
                    Loading files…
                  </div>
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={baseCols} className="px-3 py-8 text-center text-sm text-destructive">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && docs.length === 0 && (
              <tr>
                <td colSpan={baseCols} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              docs.map((doc) => (
                <tr
                  key={doc.source_uid}
                  aria-current={activeDoc === doc.source_uid ? 'true' : undefined}
                  onClick={() => onDocClick?.(doc)}
                  className={cn(
                    'border-b border-border/60 transition-colors hover:bg-accent/30',
                    selected.has(doc.source_uid) && 'bg-accent/20',
                    activeDoc === doc.source_uid && (
                      isParseTable
                        ? 'bg-primary/10 font-medium ring-1 ring-inset ring-primary/25'
                        : 'bg-accent/40'
                    ),
                    onDocClick && 'cursor-pointer',
                  )}
                >
                  <td className={cn('w-10', bodyCellClassName)}>
                    <input
                      type="checkbox"
                      checked={selected.has(doc.source_uid)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(doc.source_uid);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                  </td>
                  <td className={bodyCellClassName}>
                    <span className={cn(
                      'block min-w-0',
                      isParseDense
                        ? shouldWrapParseName
                          ? 'w-full break-words font-medium leading-4 text-foreground/95'
                          : 'w-full truncate font-medium text-foreground/95'
                        : isParseTable
                        ? shouldWrapParseName
                          ? 'w-full break-words leading-5 text-foreground'
                          : 'w-full truncate text-foreground'
                        : 'max-w-[300px] text-foreground',
                    )}>
                      {getDocumentDisplayName(doc)}
                    </span>
                  </td>
                  {showParseSize && (
                    <td className={cn(bodyCellClassName, 'whitespace-nowrap text-muted-foreground')}>
                      {formatBytes(doc.source_filesize)}
                    </td>
                  )}
                  {showParseStatus && (
                    <td className={cn(bodyCellClassName, 'whitespace-nowrap')}>
                      <StatusBadge status={doc.status} error={doc.error} />
                    </td>
                  )}
                  {visibleExtraColumns.map((col) => (
                    <td key={col.id ?? col.header} className={cn(bodyCellClassName, col.className)}>{col.render(doc)}</td>
                  ))}
                  {renderRowActions && (
                    <td className={bodyCellClassName}>{renderRowActions(doc)}</td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </ScrollArea>
      {docs.length > 0 && (
        <div className="flex-none flex items-center border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>{docs.length} file{docs.length === 1 ? '' : 's'}</span>
          {selected.size > 0 && (
            <span className="ml-2 text-primary font-medium">
              {selected.size} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}
