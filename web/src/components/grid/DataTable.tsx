import { useRef, useCallback } from 'react';
import {
  flexRender,
  type Table as TanStackTable,
  type Header,
  type Row,
  type ColumnSizingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

type DataTableProps<T> = {
  table: TanStackTable<T>;
  /** Estimated row height for virtualizer */
  estimateRowHeight?: number;
  /** Callback when a column is resized (debounced at the call-site) */
  onColumnSizingChange?: (sizing: ColumnSizingState) => void;
  /** Additional class name on the outermost wrapper */
  className?: string;
};

function ResizeHandle<T>({ header }: { header: Header<T, unknown> }) {
  if (!header.column.getCanResize()) return null;
  return (
    <div
      className={`dt-resize-handle ${header.column.getIsResizing() ? 'is-resizing' : ''}`}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => header.column.resetSize()}
    />
  );
}

export function DataTable<T>({
  table,
  estimateRowHeight = 36,
  className,
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const headerGroups = table.getHeaderGroups();
  const leafHeaderGroup = headerGroups[headerGroups.length - 1];

  const getTotalWidth = useCallback(() => {
    return leafHeaderGroup.headers.reduce(
      (sum, h) => sum + h.getSize(),
      0,
    );
  }, [leafHeaderGroup]);
  const totalWidth = getTotalWidth();

  return (
    <div ref={parentRef} className={`dt-scroll-container ${className ?? ''}`}>
      <div
        className="dt-inner"
        style={{ width: totalWidth, minWidth: '100%' }}
      >
        {/* Header */}
        <div className="dt-thead" role="rowgroup">
          {headerGroups.map((headerGroup) => (
            <div className="dt-tr dt-header-row" role="row" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div
                  className={`dt-th ${header.column.getIsSorted() ? 'is-sorted' : ''} ${header.isPlaceholder ? 'is-placeholder' : ''}`}
                  role="columnheader"
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    flexBasis: header.getSize(),
                    flexGrow: 0,
                    flexShrink: 0,
                    minWidth: header.column.columnDef.minSize,
                    position: 'relative',
                  }}
                  colSpan={header.colSpan}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  <ResizeHandle header={header} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Body */}
        <div
          className="dt-tbody"
          role="rowgroup"
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
        >
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index] as Row<T>;
            return (
              <div
                className="dt-tr dt-body-row"
                role="row"
                key={row.id}
                data-index={virtualRow.index}
                ref={(node) => virtualizer.measureElement(node)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: totalWidth,
                  minWidth: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    className={`dt-td${(cell.column.columnDef.meta as Record<string, unknown> | undefined)?.cellClassName ? ` ${(cell.column.columnDef.meta as Record<string, unknown>).cellClassName}` : ''}`}
                    role="gridcell"
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      flexBasis: cell.column.getSize(),
                      flexGrow: 0,
                      flexShrink: 0,
                      minWidth: cell.column.columnDef.minSize,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
