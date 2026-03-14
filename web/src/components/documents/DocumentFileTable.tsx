import type { ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/documents/StatusBadge';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { getDocumentFormat, formatBytes } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';

export interface ExtraColumn {
  header: string;
  render: (doc: ProjectDocumentRow) => ReactNode;
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
  const classTokens = className?.split(/\s+/) ?? [];
  const isParseTable = classTokens.includes('parse-documents-table');
  const isParseDense = classTokens.includes('parse-documents-table-compact');
  const tableClassName = cn(
    'w-full text-left',
    isParseDense
      ? 'text-[12px] leading-5'
      : isParseTable
      ? 'text-[length:var(--parse-json-font-size)] leading-[var(--parse-json-line-height)]'
      : 'text-sm',
  );
  const headerCellClassName = cn(
    'px-3 font-medium',
    isParseDense
      ? 'py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground'
      : isParseTable
      ? 'py-1.5 text-[11px]'
      : 'py-2',
  );
  const bodyCellClassName = isParseDense ? 'px-3 py-1.5' : isParseTable ? 'px-3 py-2' : 'px-3 py-2.5';

  const baseCols = 4 + (hideStatus ? 0 : 1) + extraColumns.length + (renderRowActions ? 1 : 0);
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
        <table className={tableClassName}>
          <thead className="sticky top-0 z-10 border-b border-border bg-card text-muted-foreground">
            <tr>
              <th className={cn('w-10 px-3', isParseDense ? 'py-1' : isParseTable ? 'py-1.5' : 'py-2')}>
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
              <th className={headerCellClassName}>Format</th>
              <th className={headerCellClassName}>Size</th>
              {!hideStatus && <th className={headerCellClassName}>Status</th>}
              {extraColumns.map((col) => (
                <th key={col.header} className={headerCellClassName}>{col.header}</th>
              ))}
              {renderRowActions && <th className={headerCellClassName}>Actions</th>}
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
                      'block truncate',
                      isParseDense ? 'max-w-[280px] font-medium text-foreground/95' : 'max-w-[300px] text-foreground',
                    )}>
                      {doc.doc_title}
                    </span>
                  </td>
                  <td className={bodyCellClassName}>
                    {isParseDense ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {getDocumentFormat(doc)}
                      </span>
                    ) : (
                      <Badge variant="gray" size="xs" className="uppercase">
                        {getDocumentFormat(doc)}
                      </Badge>
                    )}
                  </td>
                  <td className={cn(bodyCellClassName, 'text-muted-foreground')}>
                    {formatBytes(doc.source_filesize)}
                  </td>
                  {!hideStatus && (
                    <td className={bodyCellClassName}>
                      <StatusBadge status={doc.status} error={doc.error} />
                    </td>
                  )}
                  {extraColumns.map((col) => (
                    <td key={col.header} className={bodyCellClassName}>{col.render(doc)}</td>
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
