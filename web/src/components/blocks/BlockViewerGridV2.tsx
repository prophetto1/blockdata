/**
 * BlockViewerGridV2 — TanStack Table version of BlockViewerGrid.
 *
 * Drop-in replacement with identical props.  Uses the same data hooks,
 * toolbar controls, localStorage keys, and RPC calls as the ag-Grid
 * original.  The only difference is the rendering layer.
 */
import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnSizingState,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconArrowsVertical,
  IconCheck,
  IconChevronDown,
  IconColumns,
  IconDownload,
  IconTrash,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useBlocks } from '@/hooks/useBlocks';
import { useBlockTypeRegistry } from '@/hooks/useBlockTypeRegistry';
import { useOverlays } from '@/hooks/useOverlays';
import { extractSchemaFields } from '@/lib/schema-fields';
import type { RunWithSchema } from '@/lib/types';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  buildImmutableColumns,
  buildUserDefinedColumns,
  buildOverlayMetaColumns,
  type BlockRow,
} from '@/components/grid/columns';

/* ------------------------------------------------------------------ */
/*  Constants — same localStorage keys as V1 so prefs are shared      */
/* ------------------------------------------------------------------ */

const PAGE_SIZES = ['50', '100', '250', '500', '1000'];
const VIEW_MODE_KEY = 'blockdata-view-mode';
const BLOCK_TYPE_VIEW_KEY = 'blockdata-type-view';
type BlockTypeView = 'normalized' | 'parser_native';
const HIDDEN_COLS_KEY = 'blockdata-hidden-cols';
const DEFAULT_HIDDEN_COLS = ['block_uid', 'parser_path'];
const VIEWER_FONT_SIZE_KEY = 'blockdata-viewer-font-size';
type ViewerFontSize = 'small' | 'medium' | 'large';
const VIEWER_FONT_FAMILY_KEY = 'blockdata-viewer-font-family';
type ViewerFontFamily = 'sans' | 'serif' | 'mono';
const VIEWER_VERTICAL_ALIGN_KEY = 'blockdata-viewer-vertical-align';
type ViewerVerticalAlign = 'top' | 'center' | 'bottom';
const COLUMN_WIDTHS_KEY_BASE = 'blockdata-column-widths';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function loadPersistedColumnWidths(storageKey: string): Record<string, number> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, number> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const width = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(width) && width > 0) next[key] = Math.round(width);
    });
    return next;
  } catch {
    return {};
  }
}

function parserNativeMetaFromLocator(locator: unknown): {
  parserBlockType: string | null;
  parserPath: string | null;
} {
  if (!locator || typeof locator !== 'object' || Array.isArray(locator))
    return { parserBlockType: null, parserPath: null };
  const obj = locator as Record<string, unknown>;
  const parserBlockType = typeof obj.parser_block_type === 'string' ? obj.parser_block_type : null;
  const parserPath =
    typeof obj.parser_path === 'string' ? obj.parser_path
    : typeof obj.path === 'string' ? obj.path
    : typeof obj.pointer === 'string' ? obj.pointer
    : null;
  return { parserBlockType, parserPath };
}

function extractPagesFromLocator(locator: unknown): number[] {
  if (!locator || typeof locator !== 'object' || Array.isArray(locator)) return [];
  const obj = locator as Record<string, unknown>;
  const pages = new Set<number>();
  const pageNosValue = obj.page_nos;
  if (Array.isArray(pageNosValue)) {
    for (const v of pageNosValue) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const page = Math.trunc(v);
      if (page > 0) pages.add(page);
    }
  }
  const singlePageValue = obj.page_no;
  if (pages.size === 0 && typeof singlePageValue === 'number' && Number.isFinite(singlePageValue)) {
    const page = Math.trunc(singlePageValue);
    if (page > 0) pages.add(page);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function formatPageLabels(pages: number[]): string | null {
  if (pages.length === 0) return null;
  return pages.map((p) => `p${p}`).join(', ');
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type BlockViewerGridV2Props = {
  convUid: string;
  selectedRunId: string | null;
  selectedRun: RunWithSchema | null;
  onExport?: () => void;
  onDelete?: () => void;
};

export function BlockViewerGridV2({
  convUid,
  selectedRunId,
  selectedRun,
  onExport,
  onDelete,
}: BlockViewerGridV2Props) {
  /* ---------- persisted UI state ---------- */
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<string>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_MODE_KEY) : null;
    if (stored === 'expanded') return 'comfortable';
    return stored === 'compact' || stored === 'comfortable' ? stored : 'compact';
  });
  const [viewerFontSize, setViewerFontSize] = useState<ViewerFontSize>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEWER_FONT_SIZE_KEY) : null;
    return stored === 'small' || stored === 'medium' || stored === 'large' ? stored : 'medium';
  });
  const [viewerFontFamily, setViewerFontFamily] = useState<ViewerFontFamily>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEWER_FONT_FAMILY_KEY) : null;
    return stored === 'serif' || stored === 'mono' ? stored : 'sans';
  });
  const [viewerVerticalAlign, setViewerVerticalAlign] = useState<ViewerVerticalAlign>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEWER_VERTICAL_ALIGN_KEY) : null;
    return stored === 'top' || stored === 'bottom' ? stored : 'center';
  });
  const [blockTypeView, setBlockTypeView] = useState<BlockTypeView>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(BLOCK_TYPE_VIEW_KEY) : null;
    return stored === 'normalized' ? 'normalized' : 'parser_native';
  });
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    if (typeof localStorage === 'undefined') return new Set(DEFAULT_HIDDEN_COLS);
    const stored = localStorage.getItem(HIDDEN_COLS_KEY);
    if (!stored) return new Set(DEFAULT_HIDDEN_COLS);
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === 'string'));
    } catch { /* fallback */ }
    return new Set(DEFAULT_HIDDEN_COLS);
  });
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [blockActionBusy, setBlockActionBusy] = useState<Record<string, boolean>>({});
  const [showGridConfigInspector, setShowGridConfigInspector] = useState(false);

  /* ---------- TanStack-specific state ---------- */
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [lastClickedRowId, setLastClickedRowId] = useState<string | null>(null);

  /* ---------- data hooks ---------- */
  const { registry } = useBlockTypeRegistry();
  const badgeColorMap = registry?.badgeColor ?? {};

  const { blocks, totalCount, loading: blocksLoading, error: blocksError } = useBlocks(convUid, pageIndex, pageSize);
  const {
    overlayMap,
    loading: overlaysLoading,
    error: overlaysError,
    refetch: refetchOverlays,
  } = useOverlays(selectedRunId);

  const schemaFields = useMemo(
    () => (selectedRun?.schemas?.schema_jsonb ? extractSchemaFields(selectedRun.schemas.schema_jsonb) : []),
    [selectedRun],
  );
  const columnWidthStorageKey = useMemo(() => {
    const schemaSignature = schemaFields.length > 0
      ? schemaFields.map((f) => f.key).join('|')
      : 'no-schema';
    const runSignature = selectedRunId ? 'with-run' : 'no-run';
    return `${COLUMN_WIDTHS_KEY_BASE}:v2:${runSignature}:${blockTypeView}:${schemaSignature}`;
  }, [blockTypeView, schemaFields, selectedRunId]);

  /* ---------- row data ---------- */
  const rowDataBase = useMemo(() => {
    return blocks.map((block) => {
      const overlay = overlayMap.get(block.block_uid) ?? null;
      const normalizedLocator = block.block_locator ?? null;
      const { parserBlockType, parserPath } = parserNativeMetaFromLocator(normalizedLocator);
      const pageLabels = formatPageLabels(extractPagesFromLocator(normalizedLocator));
      const normalizedLocatorJson = normalizedLocator ? JSON.stringify(normalizedLocator) : null;

      const row: BlockRow = {
        block_index: block.block_index,
        block_pages: pageLabels,
        block_type: block.block_type,
        block_type_view: block.block_type,
        block_type_parser_native: parserBlockType,
        block_content: block.block_content,
        block_uid: block.block_uid,
        block_locator: normalizedLocatorJson,
        block_locator_view: normalizedLocatorJson,
        parser_block_type: parserBlockType,
        parser_path: parserPath,
        _overlay_status: overlay?.status ?? null,
        _claimed_by: overlay?.claimed_by ?? null,
        _claimed_at: overlay?.claimed_at ?? null,
        _attempt_count: overlay?.attempt_count ?? null,
        _last_error: overlay?.last_error ?? null,
        _confirmed_at: overlay?.confirmed_at ?? null,
        _confirmed_by: overlay?.confirmed_by ?? null,
      };

      if (overlay) {
        const data =
          overlay.status === 'confirmed' ? overlay.overlay_jsonb_confirmed
          : overlay.status === 'ai_complete' ? overlay.overlay_jsonb_staging
          : null;
        if (data && Object.keys(data).length > 0) {
          for (const field of schemaFields) {
            row[`field_${field.key}`] = data[field.key] ?? null;
          }
        }
      }
      return row;
    });
  }, [blocks, overlayMap, schemaFields]);

  const blockTypes = useMemo(() => {
    const types = new Set<string>();
    rowDataBase.forEach((row) => {
      const t = row.block_type_view;
      if (typeof t === 'string' && t) types.add(t);
    });
    return Array.from(types).sort();
  }, [rowDataBase]);

  const rowData = useMemo(() => {
    if (typeFilter.length === 0) return rowDataBase;
    return rowDataBase.filter((row) => {
      const t = row.block_type_view;
      return typeof t === 'string' && typeFilter.includes(t);
    });
  }, [rowDataBase, typeFilter]);

  const hasParserTypeData = useMemo(
    () => rowDataBase.some((row) => {
      const v = row.parser_block_type;
      return typeof v === 'string' && v.trim().length > 0;
    }),
    [rowDataBase],
  );

  const stagedCount = useMemo(() => {
    let c = 0;
    for (const o of overlayMap.values()) if (o.status === 'ai_complete') c++;
    return c;
  }, [overlayMap]);

  const confirmedCount = useMemo(() => {
    let c = 0;
    for (const o of overlayMap.values()) if (o.status === 'confirmed') c++;
    return c;
  }, [overlayMap]);

  const hasRun = !!selectedRunId;

  const firstUserSchemaColId = useMemo(() => {
    if (!hasRun) return null;
    const orderedIds: string[] = [
      '_overlay_status', '_review_actions',
      ...schemaFields.map((f) => `field_${f.key}`),
      '_claimed_by', '_claimed_at', '_attempt_count', '_last_error', '_confirmed_at', '_confirmed_by',
    ];
    return orderedIds.find((id) => !hiddenCols.has(id)) ?? null;
  }, [hasRun, hiddenCols, schemaFields]);

  /* ---------- column defs ---------- */
  const columns = useMemo<ColumnDef<BlockRow, unknown>[]>(() => {
    const immutable = buildImmutableColumns({ hiddenCols, blockTypeView, hasParserTypeData });
    if (!hasRun) return immutable;
    const userDefined = buildUserDefinedColumns({
      schemaFields,
      hiddenCols,
      firstBoundaryColId: firstUserSchemaColId,
    });
    const overlayMeta = buildOverlayMetaColumns({
      hiddenCols,
      firstBoundaryColId: firstUserSchemaColId,
    });
    return [...immutable, ...userDefined, ...overlayMeta];
  }, [blockTypeView, firstUserSchemaColId, hasParserTypeData, hasRun, hiddenCols, schemaFields]);

  /* ---------- column width persistence ---------- */
  useEffect(() => {
    const widths = loadPersistedColumnWidths(columnWidthStorageKey);
    if (Object.keys(widths).length > 0) setColumnSizing(widths);
  }, [columnWidthStorageKey]);

  useEffect(() => {
    if (Object.keys(columnSizing).length === 0) return;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(columnWidthStorageKey, JSON.stringify(columnSizing));
    }
  }, [columnSizing, columnWidthStorageKey]);

  /* ---------- hidden cols persistence ---------- */
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(Array.from(hiddenCols)));
  }, [hiddenCols]);

  /* ---------- clear selection on page change ---------- */
  useEffect(() => { setSelectedCells(new Set()); setSelectedColumns(new Set()); setRowSelection({}); setLastClickedRowId(null); }, [pageIndex, pageSize]);

  /* ---------- block action handlers ---------- */
  const setBlockBusy = useCallback((blockUid: string, busy: boolean) => {
    setBlockActionBusy((prev) => {
      const next = { ...prev };
      if (busy) next[blockUid] = true; else delete next[blockUid];
      return next;
    });
  }, []);

  const isBusyForBlock = useCallback((blockUid: string) => !!blockActionBusy[blockUid], [blockActionBusy]);

  const handleConfirmAllStaged = useCallback(async () => {
    if (!selectedRunId) return;
    setConfirmingAll(true);
    try {
      const { data, error } = await supabase.rpc('confirm_overlays', { p_run_id: selectedRunId });
      if (error) throw new Error(error.message);
      notifications.show({ color: 'green', title: 'Staged overlays confirmed', message: `${Number(data ?? 0)} block(s) confirmed.` });
      await refetchOverlays();
    } catch (e) {
      notifications.show({ color: 'red', title: 'Confirm all failed', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setConfirmingAll(false);
    }
  }, [refetchOverlays, selectedRunId]);

  const handleConfirmBlock = useCallback(async (blockUid: string) => {
    if (!selectedRunId) return;
    setBlockBusy(blockUid, true);
    try {
      const { data, error } = await supabase.rpc('confirm_overlays', { p_run_id: selectedRunId, p_block_uids: [blockUid] });
      if (error) throw new Error(error.message);
      if (Number(data ?? 0) === 0) notifications.show({ color: 'blue', title: 'No change', message: 'Block is no longer staged.' });
      await refetchOverlays();
    } catch (e) {
      notifications.show({ color: 'red', title: 'Confirm block failed', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBlockBusy(blockUid, false);
    }
  }, [refetchOverlays, selectedRunId, setBlockBusy]);

  const handleRejectBlock = useCallback(async (blockUid: string) => {
    if (!selectedRunId) return;
    setBlockBusy(blockUid, true);
    try {
      const { data, error } = await supabase.rpc('reject_overlays_to_pending', { p_run_id: selectedRunId, p_block_uids: [blockUid] });
      if (error) throw new Error(error.message);
      if (Number(data ?? 0) === 0) notifications.show({ color: 'blue', title: 'No change', message: 'Block is no longer staged.' });
      await refetchOverlays();
    } catch (e) {
      notifications.show({ color: 'red', title: 'Reject block failed', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBlockBusy(blockUid, false);
    }
  }, [refetchOverlays, selectedRunId, setBlockBusy]);

  /* ---------- master checkbox column (V2-specific) ---------- */
  const selectColumn = useMemo<ColumnDef<BlockRow, unknown>>(() => ({
    id: 'select',
    size: 36,
    enableResizing: false,
    enableSorting: false,
    header: ({ table: tbl }) => (
      <Checkbox
        size="xs"
        checked={tbl.getIsAllRowsSelected()}
        indeterminate={tbl.getIsSomeRowsSelected()}
        onChange={tbl.getToggleAllRowsSelectedHandler()}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        size="xs"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
  }), []);

  /* ---------- columns with master select prepended ---------- */
  const columnsWithSelect = useMemo<ColumnDef<BlockRow, unknown>[]>(
    () => [selectColumn, ...columns],
    [selectColumn, columns],
  );

  /* ---------- TanStack table instance ---------- */
  const table = useReactTable<BlockRow>({
    data: rowData,
    columns: columnsWithSelect,
    state: { sorting, columnSizing, rowSelection },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.block_uid as string,
    meta: {
      badgeColorMap,
      blockTypes,
      typeFilter,
      onToggleType: (type: string) =>
        setTypeFilter((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]),
      onClearTypes: () => setTypeFilter([]),
      onConfirmBlock: handleConfirmBlock,
      onRejectBlock: handleRejectBlock,
      isBusy: isBusyForBlock,
    },
  });

  /* ---------- effective selected cells (individual + column-selected) ---------- */
  const effectiveSelectedCells = useMemo(() => {
    if (selectedColumns.size === 0) return selectedCells;
    const all = new Set(selectedCells);
    for (const colId of selectedColumns)
      for (const row of table.getRowModel().rows)
        all.add(`${row.id}_${colId}`);
    return all;
  }, [selectedCells, selectedColumns, table]);

  /* ---------- cell click handler ---------- */
  const handleCellClick = useCallback((e: React.MouseEvent, cellId: string, row: { id: string }) => {
    e.stopPropagation(); // prevent <tr> row handler

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click: toggle cell in multi-select; clear row/column selection
      setSelectedCells((prev) => {
        const next = new Set(prev);
        if (next.has(cellId)) next.delete(cellId); else next.add(cellId);
        return next;
      });
      setSelectedColumns(new Set());
      setRowSelection({});
      setLastClickedRowId(null);
    } else {
      // Plain click: select entire row (existing behavior)
      setRowSelection({ [row.id]: true });
      setLastClickedRowId(row.id);
      setSelectedCells(new Set());
      setSelectedColumns(new Set());
    }
  }, []);

  /* ---------- row click handler (fallback for tr gaps + Shift range) ---------- */
  const handleRowClick = useCallback((e: React.MouseEvent, row: { id: string; getIsSelected: () => boolean; toggleSelected: (v: boolean) => void }) => {
    if (e.shiftKey && lastClickedRowId) {
      const rows = table.getRowModel().rows;
      const lastIdx = rows.findIndex((r) => r.id === lastClickedRowId);
      const curIdx = rows.findIndex((r) => r.id === row.id);
      if (lastIdx !== -1 && curIdx !== -1) {
        const [start, end] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        const next: RowSelectionState = {};
        for (let i = start; i <= end; i++) next[rows[i].id] = true;
        setRowSelection((prev) => e.ctrlKey || e.metaKey ? { ...prev, ...next } : next);
      }
    } else if (e.ctrlKey || e.metaKey) {
      row.toggleSelected(!row.getIsSelected());
    } else {
      setRowSelection({ [row.id]: true });
    }
    setLastClickedRowId(row.id);
    setSelectedCells(new Set());
    setSelectedColumns(new Set());
  }, [lastClickedRowId, table]);

  /* ---------- column header click handler ---------- */
  const handleColumnHeaderClick = useCallback((e: React.MouseEvent, columnId: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedColumns((prev) => {
        const next = new Set(prev);
        if (next.has(columnId)) next.delete(columnId); else next.add(columnId);
        return next;
      });
    } else {
      setSelectedColumns(new Set([columnId]));
    }
    setSelectedCells(new Set());
    setRowSelection({});
    setLastClickedRowId(null);
  }, []);

  /* ---------- Escape to clear all selection ---------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const el = e.target as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'select') return;
      if (tag === 'input' && (el as HTMLInputElement).type !== 'checkbox') return;
      setSelectedCells(new Set());
      setSelectedColumns(new Set());
      setRowSelection({});
      setLastClickedRowId(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* ---------- derived ---------- */
  const totalPages = Math.ceil(totalCount / pageSize);
  const canGoToPrevPage = pageIndex > 0;
  const canGoToNextPage = pageIndex < totalPages - 1;
  const error = blocksError || overlaysError;

  /* ---------- toolbar handlers ---------- */
  const handleViewModeChange = (v: string) => {
    setViewMode(v);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, v);
  };
  const handleBlockTypeViewChange = (v: string) => {
    const next = v === 'parser_native' ? 'parser_native' : 'normalized';
    setBlockTypeView(next);
    setTypeFilter([]);
    if (typeof localStorage !== 'undefined') localStorage.setItem(BLOCK_TYPE_VIEW_KEY, next);
  };
  const handleViewerFontSizeChange = (v: string) => {
    const next: ViewerFontSize = v === 'small' || v === 'large' ? v : 'medium';
    setViewerFontSize(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEWER_FONT_SIZE_KEY, next);
  };
  const handleViewerFontFamilyChange = (v: string) => {
    const next: ViewerFontFamily = v === 'serif' || v === 'mono' ? v : 'sans';
    setViewerFontFamily(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEWER_FONT_FAMILY_KEY, next);
  };
  const handleViewerVerticalAlignChange = (v: string | null) => {
    const next: ViewerVerticalAlign = v === 'top' || v === 'bottom' ? v : 'center';
    setViewerVerticalAlign(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEWER_VERTICAL_ALIGN_KEY, next);
  };
  const toggleColumn = (colId: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });
  };

  const allColumns = useMemo(() => {
    const cols: { id: string; label: string }[] = [
      { id: 'block_index', label: 'ID' },
      { id: 'block_type', label: 'Type' },
      { id: 'block_content', label: 'Block' },
      { id: 'block_uid', label: 'Block UID' },
      { id: 'block_locator', label: 'Locator' },
      { id: 'parser_path', label: 'Parser Path' },
    ];
    if (hasParserTypeData) cols.push({ id: 'parser_block_type', label: 'Parser Type' });
    if (hasRun) {
      cols.push({ id: '_overlay_status', label: 'Status' });
      cols.push({ id: '_review_actions', label: 'Review' });
      schemaFields.forEach((f) => cols.push({ id: `field_${f.key}`, label: f.key }));
      cols.push(
        { id: '_claimed_by', label: 'Claimed By' },
        { id: '_claimed_at', label: 'Claimed At' },
        { id: '_attempt_count', label: 'Attempts' },
        { id: '_last_error', label: 'Last Error' },
        { id: '_confirmed_at', label: 'Confirmed At' },
        { id: '_confirmed_by', label: 'Confirmed By' },
      );
    }
    return cols;
  }, [hasParserTypeData, hasRun, schemaFields]);

  /* ---------- toolbar JSX (identical to V1) ---------- */
  const toolbarControls = (
    <Group className="block-grid-toolbar-row" justify="space-between" wrap="nowrap" gap={8}>
      <Group className="block-grid-toolbar-main" gap="xs" wrap="nowrap">
        <Group className="block-grid-toolbar-group" gap={6} wrap="nowrap">
          <SegmentedControl className="block-grid-segmented-pill" data={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }]} value={viewMode} onChange={handleViewModeChange} size="xs" />
          <SegmentedControl className="block-grid-segmented-pill" data={[{ value: 'small', label: 'S' }, { value: 'medium', label: 'M' }, { value: 'large', label: 'L' }]} value={viewerFontSize} onChange={handleViewerFontSizeChange} size="xs" />
          <SegmentedControl className="block-grid-segmented-pill" data={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]} value={viewerFontFamily} onChange={handleViewerFontFamilyChange} size="xs" />
        </Group>
        <Group className="block-grid-toolbar-group" gap={6} wrap="nowrap">
          <Menu shadow="md" width={170} position="bottom-start" withinPortal>
            <Menu.Target>
              <Button variant="default" className="block-grid-topline-button" size="compact-xs" px={6} rightSection={<IconChevronDown size={10} />} aria-label="Vertical align">
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" fw={600}>Align</Text>
                  {viewerVerticalAlign === 'top' ? <IconArrowBarToUp size={14} /> : viewerVerticalAlign === 'center' ? <IconArrowsVertical size={14} /> : <IconArrowBarToDown size={14} />}
                </Group>
              </Button>
            </Menu.Target>
            <Menu.Dropdown className="block-grid-topline-menu-dropdown">
              <Menu.Item leftSection={<IconArrowBarToUp size={14} />} onClick={() => handleViewerVerticalAlignChange('top')}>Top</Menu.Item>
              <Menu.Item leftSection={<IconArrowsVertical size={14} />} onClick={() => handleViewerVerticalAlignChange('center')}>Center</Menu.Item>
              <Menu.Item leftSection={<IconArrowBarToDown size={14} />} onClick={() => handleViewerVerticalAlignChange('bottom')}>Bottom</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Menu shadow="md" width={250} position="bottom-end" withinPortal closeOnItemClick={false}>
            <Menu.Target>
              <Button variant="default" className="block-grid-topline-button" size="compact-xs" px={6} leftSection={<IconColumns size={14} />} rightSection={<IconChevronDown size={10} />} aria-label="Columns">Columns</Button>
            </Menu.Target>
            <Menu.Dropdown className="block-grid-topline-menu-dropdown">
              <Menu.Label>Representation (affects columns)</Menu.Label>
              <Text size="10px" c="dimmed" px="xs" pb={4}>Normalized shows baseline columns. Parser Native reveals Parser Type/Path columns for inspection.</Text>
              <Menu.Item onClick={() => handleBlockTypeViewChange('normalized')} leftSection={blockTypeView === 'normalized' ? <IconCheck size={14} /> : <span style={{ width: 14, display: 'inline-block' }} />}><Text size="xs">Normalized</Text></Menu.Item>
              <Menu.Item onClick={() => handleBlockTypeViewChange('parser_native')} leftSection={blockTypeView === 'parser_native' ? <IconCheck size={14} /> : <span style={{ width: 14, display: 'inline-block' }} />}><Text size="xs">Parser Native</Text></Menu.Item>
              <Menu.Divider />
              <Menu.Label>Columns</Menu.Label>
              {allColumns.map((c) => (
                <Menu.Item key={c.id} onClick={() => toggleColumn(c.id)} leftSection={<Text size="xs" fw={500}>{hiddenCols.has(c.id) ? '[ ]' : '[x]'}</Text>}><Text size="xs">{c.label}</Text></Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
        {hasRun && (
          <Text size="xs" c="dimmed" className="block-grid-toolbar-metrics">{confirmedCount} confirmed - {stagedCount} staged</Text>
        )}
      </Group>
      <Group className="block-grid-toolbar-actions" gap={4} wrap="nowrap">
        <Button variant={showGridConfigInspector ? 'filled' : 'default'} color="gray" className="block-grid-topline-button" size="compact-xs" px={8} onClick={() => setShowGridConfigInspector((p) => !p)}>Grid Config</Button>
        {onExport && (
          <Tooltip label="Export"><ActionIcon className="block-grid-topline-icon" variant="default" color="gray" size="md" onClick={onExport} aria-label="Export"><IconDownload size={16} /></ActionIcon></Tooltip>
        )}
        {onDelete && (
          <Tooltip label="Delete"><ActionIcon className="block-grid-topline-icon" variant="default" color="red" size="md" onClick={onDelete} aria-label="Delete"><IconTrash size={16} /></ActionIcon></Tooltip>
        )}
      </Group>
    </Group>
  );

  /* ---------- render ---------- */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Paper p="xs" mb={4} style={{ flexShrink: 0 }}>{toolbarControls}</Paper>

      {showGridConfigInspector && (
        <Paper withBorder p="xs" mb={4} style={{ flexShrink: 0, maxHeight: 200, overflow: 'auto' }}>
          <Group justify="space-between" mb={6}>
            <Text size="xs" fw={600}>TanStack Table Config Inspector</Text>
            <Button variant="subtle" size="compact-xs" onClick={() => setShowGridConfigInspector(false)}>Hide</Button>
          </Group>
          <pre className="block-grid-config-inspector">
            {JSON.stringify({ sorting, columnSizing, viewMode, viewerFontSize, viewerFontFamily, viewerVerticalAlign, blockTypeView, typeFilter, hiddenCols: Array.from(hiddenCols), rowCount: rowData.length, totalCount, pageIndex, pageSize }, null, 2)}
          </pre>
        </Paper>
      )}

      {hasRun && stagedCount > 0 && (
        <Alert color="yellow" variant="light" mb={4} style={{ flexShrink: 0 }}>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="xs">Staged - awaiting review: {stagedCount} block(s). Edit staged cells, confirm per block, or confirm all.</Text>
            <Button size="compact-xs" variant="light" leftSection={<IconCheck size={12} />} onClick={handleConfirmAllStaged} loading={confirmingAll} disabled={!selectedRunId || stagedCount === 0}>Confirm All Staged</Button>
          </Group>
        </Alert>
      )}

      {error && <div style={{ flexShrink: 0 }}><ErrorAlert message={error} /></div>}

      <div
        className={`block-viewer-grid grid-${viewMode} grid-font-${viewerFontSize} grid-font-family-${viewerFontFamily} grid-valign-${viewerVerticalAlign}`}
        style={{ flex: 1, minHeight: 0, width: '100%', opacity: blocksLoading || overlaysLoading ? 0.5 : 1, transition: 'opacity 0.15s' }}
      >
        <div className="tanstack-grid-shell">
          <div className="tanstack-grid-scroll" onClick={(e) => { if ((e.target as HTMLElement).closest('.tanstack-grid-td, .tanstack-grid-th') === null) { setSelectedCells(new Set()); setSelectedColumns(new Set()); setRowSelection({}); setLastClickedRowId(null); } }}>
            <table className="tanstack-grid-table" style={{ width: table.getTotalSize() }}>
              <thead className="tanstack-grid-thead">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="tanstack-grid-header-row">
                    {headerGroup.headers.map((header) => {
                      if (header.isPlaceholder) {
                        return <th key={header.id} className="tanstack-grid-th" />;
                      }
                      const headerMeta = header.column.columnDef.meta as Record<string, unknown> | undefined;
                      const headerMetaClass = typeof headerMeta?.cellClassName === 'string' ? headerMeta.cellClassName : '';
                      const isSelectCol = header.column.id === 'select';
                      const headerClasses = ['tanstack-grid-th'];
                      if (isSelectCol) headerClasses.push('col-select-master');
                      if (header.column.id === 'block_index' || header.column.id === 'block_pages' || header.column.id === 'block_type_view') {
                        headerClasses.push('block-grid-col-center-header');
                      }
                      if (headerMetaClass.includes('dt-schema-boundary')) {
                        headerClasses.push('user-schema-boundary-header');
                      }
                      if (selectedColumns.has(header.column.id)) {
                        headerClasses.push('column-selected');
                      }
                      return (
                        <th
                          key={header.id}
                          className={headerClasses.join(' ')}
                          style={{ width: header.getSize() }}
                          colSpan={header.colSpan}
                          onClick={isSelectCol ? undefined : (e) => handleColumnHeaderClick(e, header.column.id)}
                        >
                          <div className="tanstack-grid-th-content">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={`tanstack-grid-resizer${header.column.getIsResizing() ? ' is-resizing' : ''}`}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="tanstack-grid-tbody">
                {table.getRowModel().rows.length === 0 && (
                  <tr className="tanstack-grid-row">
                    <td className="tanstack-grid-td tanstack-grid-empty" colSpan={Math.max(table.getVisibleLeafColumns().length, 1)}>
                      <Text size="xs" c="dimmed">No rows for current filters.</Text>
                    </td>
                  </tr>
                )}
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`tanstack-grid-row${row.getIsSelected() ? ' row-selected' : ''}`}
                    onClick={(e) => handleRowClick(e, row)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined;
                      const metaClass = typeof meta?.cellClassName === 'string' ? meta.cellClassName : '';
                      const cellClasses = ['tanstack-grid-td'];
                      if (metaClass.includes('dt-cell-center')) cellClasses.push('block-grid-col-center-cell');
                      if (metaClass.includes('dt-cell-block')) cellClasses.push('block-grid-col-block-cell');
                      if (metaClass.includes('dt-cell-break')) cellClasses.push('cell-break-anywhere');
                      if (metaClass.includes('dt-schema-boundary')) cellClasses.push('user-schema-boundary-cell');
                      if (cell.column.id.startsWith('field_')) {
                        const status = row.original._overlay_status;
                        if (status === 'ai_complete') cellClasses.push('overlay-staged-cell');
                        if (status === 'confirmed') cellClasses.push('overlay-confirmed-cell');
                      }
                      if (cell.column.id === 'select') cellClasses.push('col-select-master');
                      if (effectiveSelectedCells.has(cell.id)) cellClasses.push('cell-selected');
                      return (
                        <td
                          key={cell.id}
                          className={cellClasses.join(' ')}
                          style={{ width: cell.column.getSize() }}
                          onClick={(e) => handleCellClick(e, cell.id, row)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalCount > 0 && (
        <Group justify="center" className="block-grid-pagination-wrap" style={{ flexShrink: 0 }}>
          <Group gap="md" wrap="nowrap" className="block-grid-pagination-row">
            <Group gap={6} wrap="nowrap" className="block-grid-page-size-control">
              <Text size="xs" c="dimmed">Blocks / page</Text>
              <Select data={PAGE_SIZES} value={String(pageSize)} onChange={(v) => { setPageSize(Number(v) || 50); setPageIndex(0); }} w={72} size="xs" aria-label="Blocks per page" />
            </Group>
            {totalPages > 1 && (
              <Group gap={8} wrap="nowrap" className="block-grid-page-nav">
                <Text size="xs" fw={600} className={`block-grid-page-nav-action${canGoToPrevPage ? '' : ' is-disabled'}`} onClick={() => { if (canGoToPrevPage) setPageIndex((c) => Math.max(0, c - 1)); }}>Previous</Text>
                <Text size="xs" c="dimmed" className="block-grid-page-nav-status">{pageIndex + 1} / {totalPages}</Text>
                <Text size="xs" fw={600} className={`block-grid-page-nav-action${canGoToNextPage ? '' : ' is-disabled'}`} onClick={() => { if (canGoToNextPage) setPageIndex((c) => Math.min(totalPages - 1, c + 1)); }}>Next</Text>
              </Group>
            )}
          </Group>
        </Group>
      )}
    </div>
  );
}
