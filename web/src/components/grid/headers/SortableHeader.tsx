import type { HeaderContext } from '@tanstack/react-table';

export function SortableHeader<T>({ column, header }: HeaderContext<T, unknown>) {
  const label = typeof header.column.columnDef.header === 'string'
    ? header.column.columnDef.header
    : (header.column.columnDef.meta as Record<string, unknown> | undefined)?.headerLabel as string ?? column.id;

  const sorted = column.getIsSorted();

  if (!column.getCanSort()) {
    return <span className="dt-header-label">{label}</span>;
  }

  return (
    <span
      className="dt-header-label dt-header-sortable"
      onClick={column.getToggleSortingHandler()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        column.getToggleSortingHandler()?.(e);
      }}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {sorted && (
        <span className="dt-sort-indicator">
          {sorted === 'asc' ? ' \u25B2' : ' \u25BC'}
        </span>
      )}
    </span>
  );
}
