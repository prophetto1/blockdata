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
}: DocumentFileTableProps) {
  const baseCols = 4 + (hideStatus ? 0 : 1) + extraColumns.length + (renderRowActions ? 1 : 0);
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted/30 text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2">
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
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Size</th>
              {!hideStatus && <th className="px-3 py-2 font-medium">Status</th>}
              {extraColumns.map((col) => (
                <th key={col.header} className="px-3 py-2 font-medium">{col.header}</th>
              ))}
              {renderRowActions && <th className="px-3 py-2 font-medium">Actions</th>}
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
                  onClick={() => onDocClick?.(doc)}
                  className={cn(
                    'border-b border-border/60 transition-colors hover:bg-accent/30',
                    selected.has(doc.source_uid) && 'bg-accent/20',
                    activeDoc === doc.source_uid && 'bg-accent/40',
                    onDocClick && 'cursor-pointer',
                  )}
                >
                  <td className="w-10 px-3 py-2.5">
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
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[300px] truncate text-foreground">
                      {doc.doc_title}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="gray" size="xs" className="uppercase">
                      {getDocumentFormat(doc)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatBytes(doc.source_filesize)}
                  </td>
                  {!hideStatus && (
                    <td className="px-3 py-2.5">
                      <StatusBadge status={doc.status} error={doc.error} />
                    </td>
                  )}
                  {extraColumns.map((col) => (
                    <td key={col.header} className="px-3 py-2.5">{col.render(doc)}</td>
                  ))}
                  {renderRowActions && (
                    <td className="px-3 py-2.5">{renderRowActions(doc)}</td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </ScrollArea>

      {docs.length > 0 && (
        <div className="flex items-center border-t border-border px-3 py-2 text-xs text-muted-foreground">
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
