import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  DataGrid,
  type CellMouseArgs,
  type CellMouseEvent,
  type Column,
  type ColumnWidths,
  type ColumnOrColumnGroup,
  type RenderEditCellProps,
  type RowsChangeData,
  type SortColumn,
} from 'react-data-grid';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconArrowsVertical,
  IconCheck,
  IconChevronDown,
  IconColumns,
  IconDownload,
  IconFilter,
  IconRotateClockwise,
  IconTrash,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useBlocks } from '@/hooks/useBlocks';
import { useBlockTypeRegistry } from '@/hooks/useBlockTypeRegistry';
import { useOverlays } from '@/hooks/useOverlays';
import { extractSchemaFields, type SchemaFieldMeta } from '@/lib/schema-fields';
import type { RunWithSchema } from '@/lib/types';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { NativeSelect } from '@/components/ui/native-select';
import {
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  extractPagesFromLocator,
  formatPageLabels,
  normalizeBlockContentForDisplay,
  parseEditedValue,
  parserNativeMetaFromLocator,
  prettyCellValue,
  stringifyDebugConfig,
} from './BlockViewerGridRDG.helpers';

type RowData = Record<string, unknown>;
type BlockTypeView = 'normalized' | 'parser_native';
type ViewerFontSize = 'small' | 'medium' | 'large';
type ViewerFontFamily = 'sans' | 'serif' | 'mono';
type ViewerVerticalAlign = 'top' | 'center' | 'bottom';
type RowStripeTone = 'gray' | 'blue' | 'none';
type WrapMode = 'off' | 'on';

type BlockViewerGridProps = {
  convUid: string;
  selectedRunId: string | null;
  selectedRun: RunWithSchema | null;
  onExport?: () => void;
  onDelete?: () => void;
};

const PAGE_SIZES = ['50', '100', '250', '500', '1000'];
const VIEW_MODE_KEY = 'blockdata-view-mode';
const BLOCK_TYPE_VIEW_KEY = 'blockdata-type-view';
const HIDDEN_COLS_KEY = 'blockdata-hidden-cols';
const DEFAULT_HIDDEN_COLS = ['block_uid', 'parser_path'];
const VIEWER_FONT_SIZE_KEY = 'blockdata-viewer-font-size';
const VIEWER_FONT_FAMILY_KEY = 'blockdata-viewer-font-family';
const VIEWER_VERTICAL_ALIGN_KEY = 'blockdata-viewer-vertical-align';
const ROW_STRIPE_TONE_KEY = 'blockdata-row-stripe-tone';
const WRAP_MODE_KEY = 'blockdata-wrap-mode';
const COLUMN_WIDTHS_KEY_BASE = 'blockdata-rdg-column-widths';
const RDG_RESIZE_SPACER_COLUMN_KEY = '_rdg_resize_spacer';

function statusColor(status?: string): string {
  if (status === 'confirmed') return 'green';
  if (status === 'ai_complete') return 'yellow';
  if (status === 'pending') return 'gray';
  if (status === 'claimed') return 'blue';
  if (status === 'failed') return 'red';
  return 'gray';
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function readPersistedColumnWidths(storageKey: string): ColumnWidths {
  if (typeof localStorage === 'undefined') return new Map();
  const stored = localStorage.getItem(storageKey);
  if (!stored) return new Map();
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Map();
    const entries = parsed
      .map((entry): [string, { type: 'resized'; width: number }] | null => {
        if (!Array.isArray(entry) || entry.length !== 3) return null;
        const [key, type, width] = entry;
        if (typeof key !== 'string') return null;
        if (key === RDG_RESIZE_SPACER_COLUMN_KEY) return null;
        if (type !== 'resized') return null;
        if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) return null;
        return [key, { type, width }];
      })
      .filter((entry): entry is [string, { type: 'resized'; width: number }] => entry !== null);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function keepResizedColumnWidths(columnWidths: ColumnWidths): ColumnWidths {
  return new Map(
    Array.from(columnWidths.entries()).filter(([key, value]) => value.type === 'resized' && key !== RDG_RESIZE_SPACER_COLUMN_KEY),
  );
}

function SchemaValueCell({ row, column, fieldMeta }: { row: RowData; column: string; fieldMeta: SchemaFieldMeta }) {
  const value = row[column];
  if (value === null || value === undefined) return <span className="text-xs text-muted-foreground">--</span>;
  if (typeof value === 'boolean') return <Badge size="xs" color={value ? 'green' : 'gray'}>{value ? 'Yes' : 'No'}</Badge>;
  if (typeof value === 'number') return <span className="text-xs font-medium">{value}</span>;
  if (typeof value === 'string') {
    if (fieldMeta.enumValues?.includes(value)) return <Badge size="xs" variant="light">{value}</Badge>;
    return <span className="text-xs line-clamp-1 break-words">{value}</span>;
  }
  if (Array.isArray(value)) return <span className="text-xs text-muted-foreground">[{value.length} items]</span>;
  if (typeof value === 'object') return <span className="text-xs text-muted-foreground">{prettyCellValue(value)}</span>;
  return <span className="text-xs">{String(value)}</span>;
}

function SchemaValueEditor({ row, column, onRowChange, onClose, fieldMeta }: RenderEditCellProps<RowData> & { fieldMeta: SchemaFieldMeta }) {
  const columnKey = String(column.key);
  const [draft, setDraft] = useState(() => {
    const value = row[columnKey];
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  });

  const commit = useCallback(() => {
    onRowChange({ ...row, [columnKey]: draft }, true);
    onClose(true, true);
  }, [columnKey, draft, onClose, onRowChange, row]);

  if (fieldMeta.type === 'enum' || fieldMeta.type === 'boolean') {
    const options = fieldMeta.type === 'enum' ? fieldMeta.enumValues ?? [] : ['true', 'false'];
    return (
      <NativeSelect
        autoFocus
        value={draft}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setDraft(next);
          onRowChange({ ...row, [columnKey]: next }, true);
          onClose(true, true);
        }}
        onBlur={() => onClose(true, true)}
        className="h-6 text-[12px]"
        options={[
          { value: '', label: '--' },
          ...options.map((option) => ({ value: option, label: option })),
        ]}
      />
    );
  }

  return (
    <TextInput
      autoFocus
      size="xs"
      value={draft}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={() => commit()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose(false, true);
        }
      }}
      aria-label="Edit field value"
    />
  );
}

function TypeHeaderCell({ blockTypes, typeFilter, onToggleType, onClearTypes }: {
  blockTypes: string[];
  typeFilter: string[];
  onToggleType: (type: string) => void;
  onClearTypes: () => void;
}) {
  const selectedCount = typeFilter.length;
  return (
    <div className="rdg-type-header">
      <span className="rdg-type-header-label">Type</span>
      {blockTypes.length > 1 && (
        <MenuRoot positioning={{ placement: 'bottom-start' }} closeOnSelect={false}>
          <MenuTrigger asChild>
            <button
              type="button"
              className={`rdg-type-header-filter inline-flex h-5 w-5 items-center justify-center rounded ${selectedCount > 0 ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Filter block types"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <IconFilter size={12} />
            </button>
          </MenuTrigger>
          <MenuPortal>
            <MenuPositioner>
              <MenuContent className="w-[200px]">
                {blockTypes.map((type) => (
                  <MenuItem
                    key={type}
                    value={`type-${type}`}
                    leftSection={typeFilter.includes(type) ? <IconCheck size={14} /> : <span style={{ width: 14, display: 'inline-block' }} />}
                    onClick={() => onToggleType(type)}
                  >
                    <span className="text-xs">{type}</span>
                  </MenuItem>
                ))}
                {selectedCount > 0 && (
                  <>
                    <MenuSeparator />
                    <MenuItem value="type-clear" className="text-muted-foreground" onClick={onClearTypes}><span className="text-xs">Clear all</span></MenuItem>
                  </>
                )}
              </MenuContent>
            </MenuPositioner>
          </MenuPortal>
        </MenuRoot>
      )}
    </div>
  );
}

export function BlockViewerGridRDG({ convUid, selectedRunId, selectedRun, onExport, onDelete }: BlockViewerGridProps) {
  const columnWidthsStorageKey = `${COLUMN_WIDTHS_KEY_BASE}:${convUid}`;
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
  const [rowStripeTone, setRowStripeTone] = useState<RowStripeTone>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(ROW_STRIPE_TONE_KEY) : null;
    return stored === 'blue' || stored === 'none' ? stored : 'gray';
  });
  const [wrapMode, setWrapMode] = useState<WrapMode>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(WRAP_MODE_KEY) : null;
    return stored === 'on' ? 'on' : 'off';
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
      if (Array.isArray(parsed)) return new Set(parsed.filter((value): value is string => typeof value === 'string'));
    } catch {
      // ignore invalid localStorage payload
    }
    return new Set(DEFAULT_HIDDEN_COLS);
  });
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [blockActionBusy, setBlockActionBusy] = useState<Record<string, boolean>>({});
  const [showGridConfigInspector, setShowGridConfigInspector] = useState(false);
  const [configRefreshTick, setConfigRefreshTick] = useState(0);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => readPersistedColumnWidths(columnWidthsStorageKey));
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<string>>(new Set());
  const [selectionAnchorRowKey, setSelectionAnchorRowKey] = useState<string | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const rowsRef = useRef<RowData[]>([]);

  const { registry } = useBlockTypeRegistry();
  const badgeColorMap = useMemo(() => registry?.badgeColor ?? {}, [registry]);

  const { blocks, totalCount, loading: blocksLoading, error: blocksError } = useBlocks(convUid, pageIndex, pageSize);
  const {
    overlayMap,
    loading: overlaysLoading,
    error: overlaysError,
    refetch: refetchOverlays,
    patchOverlay,
  } = useOverlays(selectedRunId);

  const schemaFields = useMemo(
    () => (selectedRun?.schemas?.schema_jsonb ? extractSchemaFields(selectedRun.schemas.schema_jsonb) : []),
    [selectedRun],
  );
  const schemaFieldByKey = useMemo(() => new Map(schemaFields.map((field) => [field.key, field])), [schemaFields]);

  const rowDataBase = useMemo(() => {
    return blocks.map((block) => {
      const overlay = overlayMap.get(block.block_uid) ?? null;
      const normalizedLocator = block.block_locator ?? null;
      const { parserBlockType, parserPath } = parserNativeMetaFromLocator(normalizedLocator);
      const pageLabels = formatPageLabels(extractPagesFromLocator(normalizedLocator));
      const normalizedLocatorJson = normalizedLocator ? JSON.stringify(normalizedLocator) : null;

      const row: RowData = {
        block_index: block.block_index,
        block_pages: pageLabels,
        block_type: block.block_type,
        block_type_view: block.block_type,
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
        const data = overlay.status === 'confirmed'
          ? overlay.overlay_jsonb_confirmed
          : overlay.status === 'ai_complete'
            ? overlay.overlay_jsonb_staging
            : null;
        if (data && Object.keys(data).length > 0) {
          for (const field of schemaFields) row[`field_${field.key}`] = data[field.key] ?? null;
        }
      }

      return row;
    });
  }, [blocks, overlayMap, schemaFields]);

  const blockTypes = useMemo(() => {
    const types = new Set<string>();
    rowDataBase.forEach((row) => {
      const typeValue = row.block_type_view;
      if (typeof typeValue === 'string' && typeValue) types.add(typeValue);
    });
    return Array.from(types).sort();
  }, [rowDataBase]);

  const rowData = useMemo(() => {
    if (typeFilter.length === 0) return rowDataBase;
    return rowDataBase.filter((row) => {
      const typeValue = row.block_type_view;
      return typeof typeValue === 'string' && typeFilter.includes(typeValue);
    });
  }, [rowDataBase, typeFilter]);

  useEffect(() => {
    setRows(rowData);
    rowsRef.current = rowData;
  }, [rowData]);

  const hasParserTypeData = useMemo(
    () => rowDataBase.some((row) => typeof row.parser_block_type === 'string' && row.parser_block_type.trim().length > 0),
    [rowDataBase],
  );

  const stagedCount = useMemo(() => {
    let count = 0;
    for (const overlay of overlayMap.values()) if (overlay.status === 'ai_complete') count += 1;
    return count;
  }, [overlayMap]);

  const confirmedCount = useMemo(() => {
    let count = 0;
    for (const overlay of overlayMap.values()) if (overlay.status === 'confirmed') count += 1;
    return count;
  }, [overlayMap]);

  const hasRun = !!selectedRunId;

  const firstUserSchemaColId = useMemo(() => {
    if (!hasRun) return null;
    const orderedIds = [
      '_overlay_status',
      '_review_actions',
      ...schemaFields.map((field) => `field_${field.key}`),
      '_claimed_by',
      '_claimed_at',
      '_attempt_count',
      '_last_error',
      '_confirmed_at',
      '_confirmed_by',
    ];
    return orderedIds.find((id) => !hiddenCols.has(id)) ?? null;
  }, [hasRun, hiddenCols, schemaFields]);

  const setBlockBusy = useCallback((blockUid: string, busy: boolean) => {
    setBlockActionBusy((prev) => {
      const next = { ...prev };
      if (busy) next[blockUid] = true;
      else delete next[blockUid];
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
      toast.success(`Staged overlays confirmed: ${Number(data ?? 0)} block(s) confirmed.`);
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

  const handleSchemaFieldCommit = useCallback(async (
    blockUid: string,
    fieldKey: string,
    nextRawValue: unknown,
    previousRawValue: unknown,
  ): Promise<boolean> => {
    if (!selectedRunId) return false;
    const overlay = overlayMap.get(blockUid);
    if (!overlay || overlay.status !== 'ai_complete') return false;

    const fieldMeta = schemaFieldByKey.get(fieldKey);
    const parsedValue = parseEditedValue(nextRawValue, fieldMeta);
    const parsedPreviousValue = parseEditedValue(previousRawValue, fieldMeta);
    if (JSON.stringify(parsedValue) === JSON.stringify(parsedPreviousValue)) return true;

    const nextStaging = { ...(overlay.overlay_jsonb_staging ?? {}), [fieldKey]: parsedValue };

    try {
      const { error } = await supabase.rpc('update_overlay_staging', {
        p_run_id: selectedRunId,
        p_block_uid: blockUid,
        p_staging_jsonb: nextStaging,
      });
      if (error) throw new Error(error.message);
      patchOverlay(blockUid, (current) => ({ ...current, overlay_jsonb_staging: nextStaging }));
      return true;
    } catch (e) {
      notifications.show({ color: 'red', title: 'Save failed', message: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }, [overlayMap, patchOverlay, schemaFieldByKey, selectedRunId]);

  const handleRowsChange = useCallback((nextRows: RowData[], data: RowsChangeData<RowData>) => {
    const previousRows = rowsRef.current;
    rowsRef.current = nextRows;
    setRows(nextRows);

    const columnKey = data.column.key;
    if (!selectedRunId || !columnKey.startsWith('field_')) return;
    const fieldKey = columnKey.slice('field_'.length);

    for (const rowIndex of data.indexes) {
      const nextRow = nextRows[rowIndex];
      const previousRow = previousRows[rowIndex];
      if (!nextRow || !previousRow) continue;

      const blockUid = typeof nextRow.block_uid === 'string' ? nextRow.block_uid : '';
      if (!blockUid) continue;

      const nextValue = nextRow[columnKey];
      const previousValue = previousRow[columnKey];

      void handleSchemaFieldCommit(blockUid, fieldKey, nextValue, previousValue).then((ok) => {
        if (ok) return;
        setRows((current) => {
          const rollback = [...current];
          const target = rollback[rowIndex];
          if (!target) return current;
          rollback[rowIndex] = { ...target, [columnKey]: previousValue };
          rowsRef.current = rollback;
          return rollback;
        });
      });
    }
  }, [handleSchemaFieldCommit, selectedRunId]);

  const getUserSchemaCellClass = useCallback((columnId: string, row: RowData) => {
    const classes: string[] = [];
    if (firstUserSchemaColId === columnId) classes.push('user-schema-boundary-cell');
    if (columnId.startsWith('field_')) {
      if (row._overlay_status === 'ai_complete') classes.push('overlay-staged-cell');
      if (row._overlay_status === 'confirmed') classes.push('overlay-confirmed-cell');
    }
    return classes.join(' ') || undefined;
  }, [firstUserSchemaColId]);

  const columns = useMemo<readonly ColumnOrColumnGroup<RowData>[]>(() => {
    const trailingResizeSpacer: Column<RowData> = {
      key: RDG_RESIZE_SPACER_COLUMN_KEY,
      name: '',
      sortable: false,
      resizable: true,
      width: 24,
      minWidth: 1,
      headerCellClass: 'rdg-resize-spacer-header',
      cellClass: 'rdg-resize-spacer-cell',
      renderCell: () => null,
    };

    const immutableCols: Column<RowData>[] = [
      { key: 'block_index', name: 'ID', sortable: true, resizable: true, headerCellClass: 'block-grid-col-center-header', cellClass: 'block-grid-col-center-cell', renderCell: ({ row }: { row: RowData }) => <Text size="xs">{String(row.block_index ?? '--')}</Text> },
      { key: 'block_pages', name: 'Pages', sortable: true, resizable: true, headerCellClass: 'block-grid-col-center-header', cellClass: 'block-grid-col-center-cell', renderCell: ({ row }: { row: RowData }) => <Text size="xs">{typeof row.block_pages === 'string' && row.block_pages.trim().length > 0 ? row.block_pages : '--'}</Text> },
      {
        key: 'block_type',
        name: 'Type',
        sortable: true,
        resizable: true,
        headerCellClass: 'block-grid-col-center-header',
        cellClass: 'block-grid-col-center-cell',
        renderHeaderCell: () => <TypeHeaderCell blockTypes={blockTypes} typeFilter={typeFilter} onToggleType={(type) => setTypeFilter((prev) => prev.includes(type) ? prev.filter((entry) => entry !== type) : [...prev, type])} onClearTypes={() => setTypeFilter([])} />,
        renderCell: ({ row }: { row: RowData }) => {
          const type = typeof row.block_type_view === 'string' ? row.block_type_view : String(row.block_type ?? '--');
          return <Badge size="xs" variant="light" color={badgeColorMap[type] ?? 'gray'}>{type}</Badge>;
        },
      },
      {
        key: 'block_content',
        name: 'Block',
        sortable: false,
        resizable: true,
        minWidth: 240,
        headerCellClass: 'block-grid-col-center-header',
        cellClass: 'block-grid-col-block-cell',
        renderCell: ({ row }: { row: RowData }) => <Text size="xs" className="block-grid-block-text">{normalizeBlockContentForDisplay(row.block_content)}</Text>,
      },
      { key: 'block_uid', name: 'Block UID', sortable: false, resizable: true, cellClass: 'cell-break-anywhere', renderCell: ({ row }: { row: RowData }) => <Text size="xs">{prettyCellValue(row.block_uid)}</Text> },
      { key: 'block_locator', name: 'Locator', sortable: false, resizable: true, renderCell: ({ row }: { row: RowData }) => <Text size="xs">{prettyCellValue(row.block_locator_view)}</Text> },
      { key: 'parser_block_type', name: 'Parser Type', sortable: true, resizable: true, renderCell: ({ row }: { row: RowData }) => <Text size="xs">{prettyCellValue(row.parser_block_type)}</Text> },
      { key: 'parser_path', name: 'Parser Path', sortable: false, resizable: true, renderCell: ({ row }: { row: RowData }) => <Text size="xs">{prettyCellValue(row.parser_path)}</Text> },
    ].filter((column) => {
      if (hiddenCols.has(column.key)) return false;
      if (column.key === 'parser_block_type' && (blockTypeView !== 'parser_native' || !hasParserTypeData)) return false;
      if (column.key === 'parser_path' && blockTypeView !== 'parser_native') return false;
      return true;
    });

    if (!hasRun) return [...immutableCols, trailingResizeSpacer];
    const userDefinedCols: Column<RowData>[] = [
      {
        key: '_overlay_status',
        name: 'Status',
        sortable: true,
        resizable: true,
        headerCellClass: firstUserSchemaColId === '_overlay_status' ? 'user-schema-boundary-header' : undefined,
        cellClass: (row: RowData) => getUserSchemaCellClass('_overlay_status', row),
        renderCell: ({ row }: { row: RowData }) => {
          const status = typeof row._overlay_status === 'string' ? row._overlay_status : undefined;
          if (!status) return <span className="text-xs text-muted-foreground">--</span>;
          return <Badge size="xs" variant="light" color={statusColor(status)}>{status}</Badge>;
        },
      },
      {
        key: '_review_actions',
        name: 'Review',
        sortable: false,
        resizable: true,
        headerCellClass: firstUserSchemaColId === '_review_actions' ? 'user-schema-boundary-header' : undefined,
        cellClass: (row: RowData) => getUserSchemaCellClass('_review_actions', row),
        renderCell: ({ row }: { row: RowData }) => {
          const status = typeof row._overlay_status === 'string' ? row._overlay_status : undefined;
          const blockUid = typeof row.block_uid === 'string' ? row.block_uid : null;
          if (!blockUid || status !== 'ai_complete') return <span className="text-xs text-muted-foreground">--</span>;
          const busy = isBusyForBlock(blockUid);
          return (
            <Group gap={4} wrap="nowrap">
              <Tooltip label="Confirm block">
                <ActionIcon size="sm" variant="light" color="green" loading={busy} disabled={busy} onClick={() => void handleConfirmBlock(blockUid)}>
                  <IconCheck size={12} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Reject to pending">
                <ActionIcon size="sm" variant="light" color="yellow" loading={busy} disabled={busy} onClick={() => void handleRejectBlock(blockUid)}>
                  <IconRotateClockwise size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        },
      },
      ...schemaFields.map((field): Column<RowData> => ({
        key: `field_${field.key}`,
        name: field.key,
        sortable: false,
        resizable: true,
        editable: (row: RowData) => row._overlay_status === 'ai_complete',
        headerCellClass: firstUserSchemaColId === `field_${field.key}` ? 'user-schema-boundary-header' : undefined,
        cellClass: (row: RowData) => getUserSchemaCellClass(`field_${field.key}`, row),
        renderCell: ({ row }: { row: RowData }) => <SchemaValueCell row={row} column={`field_${field.key}`} fieldMeta={field} />,
        renderEditCell: (props: RenderEditCellProps<RowData>) => <SchemaValueEditor {...props} fieldMeta={field} />,
      })),
    ].filter((column) => !hiddenCols.has(column.key));

    const overlayMetaCols: Column<RowData>[] = [
      { key: '_claimed_by', name: 'Claimed By', sortable: true, resizable: true, headerCellClass: firstUserSchemaColId === '_claimed_by' ? 'user-schema-boundary-header' : undefined, cellClass: (row: RowData) => getUserSchemaCellClass('_claimed_by', row) },
      { key: '_claimed_at', name: 'Claimed At', sortable: true, resizable: true, headerCellClass: firstUserSchemaColId === '_claimed_at' ? 'user-schema-boundary-header' : undefined, cellClass: (row: RowData) => getUserSchemaCellClass('_claimed_at', row) },
      { key: '_attempt_count', name: 'Attempts', sortable: true, resizable: true, headerCellClass: firstUserSchemaColId === '_attempt_count' ? 'user-schema-boundary-header' : undefined, cellClass: (row: RowData) => getUserSchemaCellClass('_attempt_count', row) },
      { key: '_last_error', name: 'Last Error', sortable: false, resizable: true, headerCellClass: firstUserSchemaColId === '_last_error' ? 'user-schema-boundary-header' : undefined, cellClass: (row: RowData) => getUserSchemaCellClass('_last_error', row) },
      { key: '_confirmed_at', name: 'Confirmed At', sortable: true, resizable: true, headerCellClass: firstUserSchemaColId === '_confirmed_at' ? 'user-schema-boundary-header' : undefined, cellClass: (row: RowData) => getUserSchemaCellClass('_confirmed_at', row) },
      { key: '_confirmed_by', name: 'Confirmed By', sortable: true, resizable: true, headerCellClass: firstUserSchemaColId === '_confirmed_by' ? 'user-schema-boundary-header' : undefined, cellClass: (row: RowData) => getUserSchemaCellClass('_confirmed_by', row) },
    ].filter((column) => !hiddenCols.has(column.key));

    return [
      { name: 'Immutable', children: immutableCols },
      { name: `User-Defined - ${selectedRun?.schemas?.schema_ref ?? 'unknown'}`, children: userDefinedCols },
      { name: 'Overlay Metadata', children: [...overlayMetaCols, trailingResizeSpacer] },
    ];
  }, [
    badgeColorMap,
    blockTypeView,
    blockTypes,
    firstUserSchemaColId,
    getUserSchemaCellClass,
    handleConfirmBlock,
    handleRejectBlock,
    hasParserTypeData,
    hasRun,
    hiddenCols,
    isBusyForBlock,
    schemaFields,
    selectedRun,
    typeFilter,
  ]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(Array.from(hiddenCols)));
  }, [hiddenCols]);

  useEffect(() => {
    setColumnWidths(readPersistedColumnWidths(columnWidthsStorageKey));
  }, [columnWidthsStorageKey]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const resizedOnly = keepResizedColumnWidths(columnWidths);
    const serialized = JSON.stringify(Array.from(resizedOnly.entries()).map(([key, value]) => [key, value.type, value.width]));
    localStorage.setItem(columnWidthsStorageKey, serialized);
  }, [columnWidths, columnWidthsStorageKey]);

  const sortedRows = useMemo(() => {
    if (sortColumns.length === 0) return rows;
    const [{ columnKey, direction }] = sortColumns;
    const modifier = direction === 'ASC' ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(a[columnKey], b[columnKey]) * modifier);
  }, [rows, sortColumns]);

  const sortedRowKeys = useMemo(
    () => sortedRows.map((row) => String(row.block_uid ?? '')).filter((key) => key.length > 0),
    [sortedRows],
  );

  useEffect(() => {
    const validKeys = new Set(sortedRowKeys);
    setSelectedRows((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const key of prev) if (validKeys.has(key)) next.add(key);
      return next;
    });
    if (selectionAnchorRowKey && !validKeys.has(selectionAnchorRowKey)) {
      setSelectionAnchorRowKey(null);
    }
  }, [selectionAnchorRowKey, sortedRowKeys]);

  const handleGridCellClick = useCallback((args: CellMouseArgs<RowData>, event: CellMouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, [role="button"], [contenteditable="true"]')) return;

    const rowKey = String(args.row.block_uid ?? '');
    if (!rowKey) return;

    event.preventGridDefault();

    if (event.shiftKey && selectionAnchorRowKey) {
      const anchorIdx = sortedRowKeys.indexOf(selectionAnchorRowKey);
      const currentIdx = sortedRowKeys.indexOf(rowKey);
      if (anchorIdx >= 0 && currentIdx >= 0) {
        const start = Math.min(anchorIdx, currentIdx);
        const end = Math.max(anchorIdx, currentIdx);
        const next = new Set<string>();
        for (let idx = start; idx <= end; idx += 1) next.add(sortedRowKeys[idx]);
        setSelectedRows(next);
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (next.has(rowKey)) next.delete(rowKey);
        else next.add(rowKey);
        return next;
      });
      setSelectionAnchorRowKey(rowKey);
      return;
    }

    setSelectedRows(new Set([rowKey]));
    setSelectionAnchorRowKey(rowKey);
  }, [selectionAnchorRowKey, sortedRowKeys]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const canGoToPrevPage = pageIndex > 0;
  const canGoToNextPage = pageIndex < totalPages - 1;
  const error = blocksError || overlaysError;

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, value);
  };

  const handleBlockTypeViewChange = (value: string) => {
    const next = value === 'parser_native' ? 'parser_native' : 'normalized';
    setBlockTypeView(next);
    setTypeFilter([]);
    if (typeof localStorage !== 'undefined') localStorage.setItem(BLOCK_TYPE_VIEW_KEY, next);
  };

  const handleViewerFontSizeChange = (value: string) => {
    const next: ViewerFontSize = value === 'small' || value === 'large' ? value : 'medium';
    setViewerFontSize(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEWER_FONT_SIZE_KEY, next);
  };

  const handleViewerFontFamilyChange = (value: string) => {
    const next: ViewerFontFamily = value === 'serif' || value === 'mono' ? value : 'sans';
    setViewerFontFamily(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEWER_FONT_FAMILY_KEY, next);
  };

  const handleViewerVerticalAlignChange = (value: string | null) => {
    const next: ViewerVerticalAlign = value === 'top' || value === 'bottom' ? value : 'center';
    setViewerVerticalAlign(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEWER_VERTICAL_ALIGN_KEY, next);
  };

  const handleRowStripeToneChange = (value: string) => {
    const next: RowStripeTone = value === 'blue' || value === 'none' ? value : 'gray';
    setRowStripeTone(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem(ROW_STRIPE_TONE_KEY, next);
  };

  const handleWrapModeChange = (value: string) => {
    const next: WrapMode = value === 'on' ? 'on' : 'off';
    setWrapMode(next);
    setColumnWidths((prev) => keepResizedColumnWidths(prev));
    if (typeof localStorage !== 'undefined') localStorage.setItem(WRAP_MODE_KEY, next);
  };

  const toggleColumn = (colId: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
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
      schemaFields.forEach((field) => cols.push({ id: `field_${field.key}`, label: field.key }));
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
  const gridConfigSnapshot = useMemo(() => ({
    source: 'BlockViewerGridRDG',
    generatedAt: new Date().toISOString(),
    state: {
      refreshTick: configRefreshTick,
      convUid,
      selectedRunId,
      hasRun,
      rowCount: sortedRows.length,
      totalCount,
      pageIndex,
      pageSize,
      viewMode,
      viewerFontSize,
      viewerFontFamily,
      viewerVerticalAlign,
      wrapMode,
      rowStripeTone,
      blockTypeView,
      typeFilter,
      hiddenCols: Array.from(hiddenCols),
      sortColumns,
      persistedColumnWidths: columnWidths.size,
    },
    columnGroupCount: columns.length,
  }), [
    blockTypeView,
    columnWidths.size,
    columns,
    configRefreshTick,
    convUid,
    hasRun,
    hiddenCols,
    pageIndex,
    pageSize,
    selectedRunId,
    sortColumns,
    sortedRows.length,
    totalCount,
    typeFilter,
    viewMode,
    rowStripeTone,
    viewerFontFamily,
    viewerFontSize,
    viewerVerticalAlign,
    wrapMode,
  ]);

  const rowHeight = useMemo(
    () => {
      if (wrapMode === 'on') return viewMode === 'compact' ? 72 : 96;
      return viewMode === 'compact' ? 28 : 36;
    },
    [viewMode, wrapMode],
  );

  const gridConfigSnapshotJson = useMemo(() => stringifyDebugConfig(gridConfigSnapshot), [gridConfigSnapshot]);

  const toolbarControls = (
    <Group className="block-grid-toolbar-row min-w-0 w-full items-center gap-2 overflow-x-auto" justify="space-between" wrap="nowrap" gap={8}>
      <Group className="block-grid-toolbar-main min-w-0 flex-1 overflow-x-auto" gap="xs" wrap="nowrap">
        <Group className="block-grid-toolbar-group shrink-0" gap={6} wrap="nowrap">
          <SegmentedControl className="block-grid-segmented-boxed" data={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }]} value={viewMode} onChange={handleViewModeChange} size="xs" />
          <SegmentedControl className="block-grid-segmented-boxed" data={[{ value: 'gray', label: 'Rows Gray' }, { value: 'blue', label: 'Rows Blue' }, { value: 'none', label: 'Rows None' }]} value={rowStripeTone} onChange={handleRowStripeToneChange} size="xs" />
          <div className="block-grid-two-tab inline-flex items-stretch overflow-hidden border border-slate-300/80 bg-slate-100/70 dark:border-slate-600/60 dark:bg-slate-900/30" role="tablist" aria-label="Representation mode">
            <button type="button" role="tab" aria-selected={blockTypeView === 'normalized'} className={`block-grid-two-tab-option h-6 px-3 text-[11px] font-semibold leading-none${blockTypeView === 'normalized' ? ' is-active bg-sky-100 text-sky-800 dark:bg-sky-900/35 dark:text-sky-200' : ' text-slate-700 dark:text-slate-200'} border-r border-slate-300/70 dark:border-slate-600/60`} onClick={() => handleBlockTypeViewChange('normalized')}>
              Normalized
            </button>
            <button type="button" role="tab" aria-selected={blockTypeView === 'parser_native'} className={`block-grid-two-tab-option h-6 px-3 text-[11px] font-semibold leading-none${blockTypeView === 'parser_native' ? ' is-active bg-sky-100 text-sky-800 dark:bg-sky-900/35 dark:text-sky-200' : ' text-slate-700 dark:text-slate-200'}`} onClick={() => handleBlockTypeViewChange('parser_native')}>
              Parser Native
            </button>
          </div>
          <SegmentedControl className="block-grid-segmented-boxed" data={[{ value: 'off', label: 'Wrap Off' }, { value: 'on', label: 'Wrap On' }]} value={wrapMode} onChange={handleWrapModeChange} size="xs" />
          <SegmentedControl className="block-grid-segmented-boxed" data={[{ value: 'small', label: 'S' }, { value: 'medium', label: 'M' }, { value: 'large', label: 'L' }]} value={viewerFontSize} onChange={handleViewerFontSizeChange} size="xs" />
          <SegmentedControl className="block-grid-segmented-boxed" data={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]} value={viewerFontFamily} onChange={handleViewerFontFamilyChange} size="xs" />
        </Group>

        <Group className="block-grid-toolbar-group shrink-0" gap={6} wrap="nowrap">
          <MenuRoot positioning={{ placement: 'bottom-start' }}>
            <MenuTrigger asChild>
              <button type="button" className="block-grid-topline-button inline-flex h-6 items-center gap-1 rounded border border-border bg-background px-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent" aria-label="Vertical align">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">Align</span>
                  {viewerVerticalAlign === 'top' ? <IconArrowBarToUp size={14} /> : viewerVerticalAlign === 'center' ? <IconArrowsVertical size={14} /> : <IconArrowBarToDown size={14} />}
                </span>
                <IconChevronDown size={10} />
              </button>
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner>
                <MenuContent className="block-grid-topline-menu-dropdown min-w-[170px]">
                  <MenuItem value="align-top" leftSection={<IconArrowBarToUp size={14} />} onClick={() => handleViewerVerticalAlignChange('top')}>Top</MenuItem>
                  <MenuItem value="align-center" leftSection={<IconArrowsVertical size={14} />} onClick={() => handleViewerVerticalAlignChange('center')}>Center</MenuItem>
                  <MenuItem value="align-bottom" leftSection={<IconArrowBarToDown size={14} />} onClick={() => handleViewerVerticalAlignChange('bottom')}>Bottom</MenuItem>
                </MenuContent>
              </MenuPositioner>
            </MenuPortal>
          </MenuRoot>

          <MenuRoot positioning={{ placement: 'bottom-end' }} closeOnSelect={false}>
            <MenuTrigger asChild>
              <button type="button" className="block-grid-topline-button inline-flex h-6 items-center gap-1 rounded border border-border bg-background px-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent" aria-label="Columns"><IconColumns size={14} />Columns<IconChevronDown size={10} /></button>
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner>
                <MenuContent className="block-grid-topline-menu-dropdown min-w-[250px]">
                  <MenuLabel>Columns</MenuLabel>
                  {allColumns.map((col) => (
                    <MenuItem key={col.id} value={`column-${col.id}`} onClick={() => toggleColumn(col.id)} leftSection={<Text size="xs" fw={500}>{hiddenCols.has(col.id) ? '[ ]' : '[x]'}</Text>}>
                      <Text size="xs">{col.label}</Text>
                    </MenuItem>
                  ))}
                </MenuContent>
              </MenuPositioner>
            </MenuPortal>
          </MenuRoot>
        </Group>

        {hasRun && <Text size="xs" c="dimmed" className="block-grid-toolbar-metrics">{confirmedCount} confirmed - {stagedCount} staged - {selectedRows.size} selected</Text>}
      </Group>
      <Group className="block-grid-toolbar-actions shrink-0" gap={4} wrap="nowrap">
        <button type="button" className={`block-grid-topline-button inline-flex h-6 items-center gap-1 rounded border border-border px-2 text-xs font-semibold transition-colors ${showGridConfigInspector ? 'bg-accent text-accent-foreground' : 'bg-background text-foreground hover:bg-accent'}`} onClick={() => { setShowGridConfigInspector((prev) => !prev); setConfigRefreshTick((prev) => prev + 1); }}>Grid Config</button>
        {onExport && <button type="button" className="block-grid-topline-icon inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground" onClick={onExport} aria-label="Export" title="Export"><IconDownload size={16} /></button>}
        {onDelete && <button type="button" className="block-grid-topline-icon inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-destructive transition-colors hover:bg-destructive/10" onClick={onDelete} aria-label="Delete" title="Delete"><IconTrash size={16} /></button>}
      </Group>
    </Group>
  );

  return (
    <>
      <Paper p="xs" mb={4} className="border border-slate-300/70 bg-slate-100/55 dark:border-slate-600/60 dark:bg-slate-900/20">{toolbarControls}</Paper>

      {showGridConfigInspector && (
        <Paper withBorder p="xs" mb={4}>
          <Group justify="space-between" mb={6}>
            <Text size="xs" fw={600}>React Data Grid Config Inspector</Text>
            <Group gap={4}>
              <Button variant="subtle" size="compact-xs" onClick={() => setConfigRefreshTick((prev) => prev + 1)}>Refresh</Button>
              <Button variant="subtle" size="compact-xs" onClick={() => setShowGridConfigInspector(false)}>Hide</Button>
            </Group>
          </Group>
          <pre className="block-grid-config-inspector">{gridConfigSnapshotJson}</pre>
        </Paper>
      )}

      {hasRun && stagedCount > 0 && (
        <Alert color="yellow" variant="light" mb={4}>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="xs">Staged - awaiting review: {stagedCount} block(s). Edit staged cells, confirm per block, or confirm all.</Text>
            <Button size="compact-xs" variant="light" leftSection={<IconCheck size={12} />} onClick={handleConfirmAllStaged} loading={confirmingAll} disabled={!selectedRunId || stagedCount === 0}>Confirm All Staged</Button>
          </Group>
        </Alert>
      )}

      {error && <ErrorAlert message={error} />}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div className={`rdg-grid-wrapper block-viewer-grid grid-${viewMode} grid-font-${viewerFontSize} grid-font-family-${viewerFontFamily} grid-valign-${viewerVerticalAlign} grid-wrap-${wrapMode} grid-row-tone-${rowStripeTone}`} style={{ flex: 1, width: '100%', opacity: blocksLoading || overlaysLoading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <DataGrid<RowData>
            className="block-viewer-rdg"
            columns={columns}
            rows={sortedRows}
            direction="ltr"
            rowKeyGetter={(row: RowData) => String(row.block_uid ?? '')}
            defaultColumnOptions={{ sortable: true, resizable: true }}
            columnWidths={columnWidths}
            onColumnWidthsChange={(next) => setColumnWidths(new Map(next))}
            rowHeight={rowHeight}
            headerRowHeight={36}
            onRowsChange={handleRowsChange}
            selectedRows={selectedRows}
            onSelectedRowsChange={(next) => {
              const normalized = new Set<string>();
              for (const key of next) normalized.add(String(key));
              setSelectedRows(normalized);
            }}
            onCellClick={handleGridCellClick}
            sortColumns={sortColumns}
            onSortColumnsChange={(next: SortColumn[]) => setSortColumns(next.slice(-1))}
            renderers={{ noRowsFallback: <div className="block-grid-empty-rdg"><Text size="xs" c="dimmed">No rows for current filters.</Text></div> }}
          />
        </div>

        {totalCount > 0 && (
          <Group justify="center" className="block-grid-pagination-wrap">
            <Group gap="md" wrap="nowrap" className="block-grid-pagination-row">
              <Group gap={6} wrap="nowrap" className="block-grid-page-size-control">
                <Text size="xs" c="dimmed">Blocks / page</Text>
                <Select data={PAGE_SIZES} value={String(pageSize)} onChange={(value) => { setPageSize(Number(value) || 50); setPageIndex(0); }} w={72} size="xs" aria-label="Blocks per page" />
              </Group>
              {totalPages > 1 && (
                <Group gap={8} wrap="nowrap" className="block-grid-page-nav">
                  <Text size="xs" fw={600} className={`block-grid-page-nav-action${canGoToPrevPage ? '' : ' is-disabled'}`} onClick={() => { if (canGoToPrevPage) setPageIndex((current) => Math.max(0, current - 1)); }}>Previous</Text>
                  <Text size="xs" c="dimmed" className="block-grid-page-nav-status">{pageIndex + 1} / {totalPages}</Text>
                  <Text size="xs" fw={600} className={`block-grid-page-nav-action${canGoToNextPage ? '' : ' is-disabled'}`} onClick={() => { if (canGoToNextPage) setPageIndex((current) => Math.min(totalPages - 1, current + 1)); }}>Next</Text>
                </Group>
              )}
            </Group>
          </Group>
        )}
      </div>
    </>
  );
}
