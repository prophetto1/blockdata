import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { BlockTypeCell } from './cells/BlockTypeCell';
import { BlockContentCell } from './cells/BlockContentCell';
import { StatusCell } from './cells/StatusCell';
import { ReviewActionCell } from './cells/ReviewActionCell';
import { SchemaFieldCell } from './cells/SchemaFieldCell';
import { TypeFilterHeader } from './headers/TypeFilterHeader';
import { SortableHeader } from './headers/SortableHeader';
import type { SchemaFieldMeta } from '@/lib/schema-fields';

export type BlockRow = Record<string, unknown>;

const col = createColumnHelper<BlockRow>();

function normalizeBlockContentForDisplay(value: unknown): string {
  if (typeof value !== 'string') return '';
  const DEWRAP_PREFIX_STOP_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'he',
    'if', 'in', 'is', 'it', 'of', 'on', 'or', 'so', 'the', 'to', 'we',
  ]);
  let text = value.replace(/\r\n?/g, '\n');
  text = text.replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, '$1-$2');
  text = text.replace(/\b([A-Za-z]{2})\s*\n\s*([A-Za-z]{2,})\b/g, (_m, left: string, right: string) =>
    DEWRAP_PREFIX_STOP_WORDS.has(left.toLowerCase()) ? `${left} ${right}` : `${left}${right}`,
  );
  text = text.replace(/\b([A-Za-z]{3,})\s*\n\s*([A-Za-z]{1,2})(?=\s+[A-Z])/g, '$1$2');
  text = text.replace(/\s*\n\s*/g, ' ');
  text = text.replace(/\s{2,}/g, ' ').trim();
  return text;
}

export function buildImmutableColumns(opts: {
  hiddenCols: Set<string>;
  blockTypeView: string;
  hasParserTypeData: boolean;
}): ColumnDef<BlockRow, unknown>[] {
  const { hiddenCols, blockTypeView, hasParserTypeData } = opts;

  return [
    col.accessor('block_index', {
      header: SortableHeader,
      size: 60,
      enableResizing: true,
      enableSorting: true,
      meta: { headerLabel: 'ID', cellClassName: 'dt-cell-center' },
    }),
    col.accessor('block_pages', {
      header: SortableHeader,
      size: 92,
      enableResizing: true,
      enableSorting: true,
      cell: (info) => {
        const v = info.getValue();
        return typeof v === 'string' && v.trim().length > 0 ? v : '--';
      },
      meta: { headerLabel: 'Pages', cellClassName: 'dt-cell-center' },
    }),
    col.accessor('block_type_view', {
      header: TypeFilterHeader,
      cell: BlockTypeCell,
      size: 136,
      enableResizing: true,
      enableSorting: true,
      meta: { headerLabel: 'Type', cellClassName: 'dt-cell-center' },
    }),
    col.accessor('block_content', {
      header: SortableHeader,
      size: 460,
      enableResizing: true,
      enableSorting: false,
      cell: BlockContentCell,
      meta: { headerLabel: 'Block', cellClassName: 'dt-cell-block', normalizeContent: normalizeBlockContentForDisplay },
    }),
    col.accessor('block_uid', {
      header: SortableHeader,
      size: 220,
      enableResizing: true,
      enableSorting: false,
      meta: { headerLabel: 'Block UID', cellClassName: 'dt-cell-break' },
    }),
    col.accessor('block_locator_view', {
      header: SortableHeader,
      size: 280,
      enableResizing: true,
      enableSorting: false,
      meta: { headerLabel: 'Locator' },
    }),
    col.accessor('parser_block_type', {
      header: SortableHeader,
      size: 160,
      enableResizing: true,
      enableSorting: true,
      meta: { headerLabel: 'Parser Type' },
    }),
    col.accessor('parser_path', {
      header: SortableHeader,
      size: 280,
      enableResizing: true,
      enableSorting: false,
      meta: { headerLabel: 'Parser Path' },
    }),
  ].filter((colDef) => {
    const id = colDef.accessorKey ?? (colDef as { id?: string }).id;
    if (typeof id !== 'string') return true;
    if (hiddenCols.has(id)) return false;
    if (id === 'parser_block_type' && (blockTypeView !== 'parser_native' || !hasParserTypeData)) return false;
    if (id === 'parser_path' && blockTypeView !== 'parser_native') return false;
    return true;
  }) as ColumnDef<BlockRow, unknown>[];
}

export function buildUserDefinedColumns(opts: {
  schemaFields: SchemaFieldMeta[];
  hiddenCols: Set<string>;
  firstBoundaryColId: string | null;
}): ColumnDef<BlockRow, unknown>[] {
  const { schemaFields, hiddenCols, firstBoundaryColId } = opts;

  const cols: ColumnDef<BlockRow, unknown>[] = [
    col.accessor('_overlay_status', {
      header: SortableHeader,
      cell: StatusCell,
      size: 100,
      enableResizing: true,
      enableSorting: true,
      meta: {
        headerLabel: 'Status',
        cellClassName: firstBoundaryColId === '_overlay_status' ? 'dt-schema-boundary' : undefined,
      },
    }) as ColumnDef<BlockRow, unknown>,
    col.display({
      id: '_review_actions',
      header: 'Review',
      cell: ReviewActionCell,
      size: 100,
      enableResizing: false,
      enableSorting: false,
      meta: {
        cellClassName: firstBoundaryColId === '_review_actions' ? 'dt-schema-boundary' : undefined,
      },
    }),
    ...schemaFields.map((field): ColumnDef<BlockRow, unknown> =>
      col.accessor(`field_${field.key}`, {
        header: SortableHeader,
        cell: SchemaFieldCell,
        size: 180,
        enableResizing: true,
        enableSorting: false,
        meta: {
          headerLabel: field.key,
          fieldMeta: field,
          editable: true,
          cellClassName: [
            firstBoundaryColId === `field_${field.key}` ? 'dt-schema-boundary' : '',
          ].filter(Boolean).join(' ') || undefined,
        },
      }) as ColumnDef<BlockRow, unknown>,
    ),
  ];

  return cols.filter((c) => {
    const id = (c as { accessorKey?: string }).accessorKey ?? c.id;
    return typeof id !== 'string' || !hiddenCols.has(id);
  });
}

export function buildOverlayMetaColumns(opts: {
  hiddenCols: Set<string>;
  firstBoundaryColId: string | null;
}): ColumnDef<BlockRow, unknown>[] {
  const { hiddenCols, firstBoundaryColId } = opts;

  const cols: ColumnDef<BlockRow, unknown>[] = [
    col.accessor('_claimed_by', {
      header: SortableHeader,
      size: 140,
      meta: {
        headerLabel: 'Claimed By',
        cellClassName: firstBoundaryColId === '_claimed_by' ? 'dt-schema-boundary' : undefined,
      },
    }) as ColumnDef<BlockRow, unknown>,
    col.accessor('_claimed_at', {
      header: SortableHeader,
      size: 160,
      meta: {
        headerLabel: 'Claimed At',
        cellClassName: firstBoundaryColId === '_claimed_at' ? 'dt-schema-boundary' : undefined,
      },
    }) as ColumnDef<BlockRow, unknown>,
    col.accessor('_attempt_count', {
      header: SortableHeader,
      size: 90,
      meta: {
        headerLabel: 'Attempts',
        cellClassName: firstBoundaryColId === '_attempt_count' ? 'dt-schema-boundary' : undefined,
      },
    }) as ColumnDef<BlockRow, unknown>,
    col.accessor('_last_error', {
      header: SortableHeader,
      size: 220,
      meta: {
        headerLabel: 'Last Error',
        cellClassName: firstBoundaryColId === '_last_error' ? 'dt-schema-boundary' : undefined,
      },
    }) as ColumnDef<BlockRow, unknown>,
    col.accessor('_confirmed_at', {
      header: SortableHeader,
      size: 160,
      meta: {
        headerLabel: 'Confirmed At',
        cellClassName: firstBoundaryColId === '_confirmed_at' ? 'dt-schema-boundary' : undefined,
      },
    }) as ColumnDef<BlockRow, unknown>,
    col.accessor('_confirmed_by', {
      header: SortableHeader,
      size: 140,
      meta: {
        headerLabel: 'Confirmed By',
        cellClassName: firstBoundaryColId === '_confirmed_by' ? 'dt-schema-boundary' : undefined,
      },
    }) as ColumnDef<BlockRow, unknown>,
  ];

  return cols.filter((c) => {
    const id = (c as { accessorKey?: string }).accessorKey ?? c.id;
    return typeof id !== 'string' || !hiddenCols.has(id);
  });
}
