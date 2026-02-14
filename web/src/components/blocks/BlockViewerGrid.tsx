import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellValueChangedEvent,
  type ColDef,
  type ColGroupDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  Pagination,
  Paper,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
  useComputedColorScheme,
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
  IconFilter,
  IconRotateClockwise,
  IconTrash,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useBlocks } from '@/hooks/useBlocks';
import { useOverlays } from '@/hooks/useOverlays';
import { extractSchemaFields, type SchemaFieldMeta } from '@/lib/schema-fields';
import type { RunWithSchema } from '@/lib/types';
import { ErrorAlert } from '@/components/common/ErrorAlert';

ModuleRegistry.registerModules([AllCommunityModule]);

const DENSITY_THEMES = {
  compact: themeQuartz.withParams({ rowVerticalPaddingScale: 0.3 }),
  comfortable: themeQuartz.withParams({ rowVerticalPaddingScale: 0.7 }),
} as const;

const BLOCK_TYPE_COLOR: Record<string, string> = {
  heading: 'blue',
  paragraph: 'gray',
  list_item: 'teal',
  code_block: 'violet',
  table: 'orange',
  figure: 'pink',
  caption: 'grape',
  footnote: 'cyan',
  divider: 'gray',
  html_block: 'red',
  definition: 'indigo',
  checkbox: 'lime',
  other: 'gray',
};

const PAGE_SIZES = ['25', '50', '100'];
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

function BlockTypeCellRenderer(params: ICellRendererParams) {
  const type = params.value as string;
  return <Badge size="xs" variant="light" color={BLOCK_TYPE_COLOR[type] ?? 'gray'}>{type}</Badge>;
}

function StatusCellRenderer(params: ICellRendererParams) {
  const status = params.value as string | undefined;
  if (!status) return <Text size="xs" c="dimmed">--</Text>;
  const color =
    status === 'confirmed' ? 'green'
      : status === 'ai_complete' ? 'yellow'
        : status === 'pending' ? 'gray'
          : status === 'claimed' ? 'blue'
            : status === 'failed' ? 'red' : 'gray';
  return <Badge size="xs" variant="light" color={color}>{status}</Badge>;
}

type ReviewActionCellRendererParams = {
  onConfirmBlock?: (blockUid: string) => void;
  onRejectBlock?: (blockUid: string) => void;
  isBusy?: (blockUid: string) => boolean;
};

function ReviewActionCellRenderer(params: ICellRendererParams) {
  const row = params.data as Record<string, unknown> | undefined;
  const status = row?._overlay_status as string | undefined;
  const blockUid = row?.block_uid as string | undefined;
  if (!blockUid || status !== 'ai_complete') return <Text size="xs" c="dimmed">--</Text>;

  const config = params.colDef?.cellRendererParams as ReviewActionCellRendererParams | undefined;
  const busy = config?.isBusy?.(blockUid) ?? false;

  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip label="Confirm block">
        <ActionIcon
          size="sm"
          variant="light"
          color="green"
          loading={busy}
          disabled={busy}
          onClick={() => config?.onConfirmBlock?.(blockUid)}
        >
          <IconCheck size={12} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Reject to pending">
        <ActionIcon
          size="sm"
          variant="light"
          color="yellow"
          loading={busy}
          disabled={busy}
          onClick={() => config?.onRejectBlock?.(blockUid)}
        >
          <IconRotateClockwise size={12} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

function SchemaFieldCellRenderer(params: ICellRendererParams) {
  const value = params.value;
  const meta = params.colDef?.cellRendererParams?.fieldMeta as SchemaFieldMeta | undefined;

  if (value === null || value === undefined) {
    return <Text size="xs" c="dimmed">--</Text>;
  }

  if (typeof value === 'boolean') {
    return <Badge size="xs" color={value ? 'green' : 'gray'}>{value ? 'Yes' : 'No'}</Badge>;
  }

  if (typeof value === 'number') {
    return <Text size="xs" fw={500}>{value}</Text>;
  }

  if (typeof value === 'string') {
    if (meta?.enumValues?.includes(value)) {
      return <Badge size="xs" variant="light">{value}</Badge>;
    }
    return (
      <Tooltip label={value} disabled={value.length <= 60} multiline maw={400} withArrow>
        <Text size="xs" lineClamp={1} style={{ wordBreak: 'break-word' }}>{value}</Text>
      </Tooltip>
    );
  }

  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return (
        <Group gap={3} wrap="wrap">
          {value.slice(0, 5).map((item, index) => (
            <Badge key={index} size="xs" variant="light">{String(item)}</Badge>
          ))}
          {value.length > 5 && <Text size="xs" c="dimmed">+{value.length - 5}</Text>}
        </Group>
      );
    }
    return (
      <Tooltip label={JSON.stringify(value, null, 2)} multiline maw={400} withArrow>
        <Text size="xs" c="dimmed">[{value.length} items]</Text>
      </Tooltip>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <Tooltip label={JSON.stringify(value, null, 2)} multiline maw={400} withArrow>
        <Text size="xs" c="dimmed">
          {entries.slice(0, 2).map(([key, val]) => `${key}: ${String(val).slice(0, 25)}`).join(', ')}
          {entries.length > 2 && ', ...'}
        </Text>
      </Tooltip>
    );
  }

  return <Text size="xs">{String(value)}</Text>;
}

function parseEditedValue(value: unknown, meta: SchemaFieldMeta | undefined): unknown {
  if (value === null || value === undefined) return null;

  if (meta?.type === 'number') {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (meta?.type === 'boolean') {
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
  }

  if ((meta?.type === 'array' || meta?.type === 'object') && typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function parserNativeMetaFromLocator(locator: unknown): {
  parserBlockType: string | null;
  parserPath: string | null;
} {
  if (!locator || typeof locator !== 'object' || Array.isArray(locator)) {
    return { parserBlockType: null, parserPath: null };
  }
  const obj = locator as Record<string, unknown>;
  const parserBlockType = typeof obj.parser_block_type === 'string' ? obj.parser_block_type : null;
  const parserPath = typeof obj.parser_path === 'string'
    ? obj.parser_path
    : typeof obj.path === 'string'
      ? obj.path
      : typeof obj.pointer === 'string'
        ? obj.pointer
        : null;
  return { parserBlockType, parserPath };
}

type BlockViewerGridProps = {
  convUid: string;
  selectedRunId: string | null;
  selectedRun: RunWithSchema | null;
  onExport?: () => void;
  onDelete?: () => void;
};

export function BlockViewerGrid({ convUid, selectedRunId, selectedRun, onExport, onDelete }: BlockViewerGridProps) {
  const gridRef = useRef<AgGridReact<Record<string, unknown>>>(null);
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
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = computedColorScheme === 'dark';
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    if (typeof localStorage === 'undefined') return new Set(DEFAULT_HIDDEN_COLS);
    const stored = localStorage.getItem(HIDDEN_COLS_KEY);
    if (!stored) return new Set(DEFAULT_HIDDEN_COLS);
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((value): value is string => typeof value === 'string'));
      }
    } catch {
      // Fall back to defaults when storage is invalid.
    }
    return new Set(DEFAULT_HIDDEN_COLS);
  });
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [blockActionBusy, setBlockActionBusy] = useState<Record<string, boolean>>({});

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
  const schemaFieldByKey = useMemo(
    () => new Map(schemaFields.map((field) => [field.key, field])),
    [schemaFields],
  );

  const rowDataBase = useMemo(() => {
    return blocks.map((block) => {
      const overlay = overlayMap.get(block.block_uid) ?? null;
      const normalizedLocator = block.block_locator ?? null;
      const { parserBlockType, parserPath } = parserNativeMetaFromLocator(normalizedLocator);
      const normalizedLocatorJson = normalizedLocator ? JSON.stringify(normalizedLocator) : null;

      const row: Record<string, unknown> = {
        block_index: block.block_index,
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
          overlay.status === 'confirmed'
            ? overlay.overlay_jsonb_confirmed
            : overlay.status === 'ai_complete'
              ? overlay.overlay_jsonb_staging
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

  const hasParserTypeData = useMemo(() => (
    rowDataBase.some((row) => {
      const value = row.parser_block_type;
      return typeof value === 'string' && value.trim().length > 0;
    })
  ), [rowDataBase]);

  const stagedCount = useMemo(() => {
    let count = 0;
    for (const overlay of overlayMap.values()) {
      if (overlay.status === 'ai_complete') count += 1;
    }
    return count;
  }, [overlayMap]);

  const confirmedCount = useMemo(() => {
    let count = 0;
    for (const overlay of overlayMap.values()) {
      if (overlay.status === 'confirmed') count += 1;
    }
    return count;
  }, [overlayMap]);

  const hasRun = !!selectedRunId;

  const firstUserSchemaColId = useMemo(() => {
    if (!hasRun) return null;
    const orderedIds: string[] = [
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

  const gridTheme = useMemo(() => {
    const base = DENSITY_THEMES[viewMode as keyof typeof DENSITY_THEMES] ?? DENSITY_THEMES.compact;
    return base.withParams({
      browserColorScheme: isDark ? 'dark' : 'light',
      backgroundColor: isDark ? '#09090b' : '#ffffff',
      chromeBackgroundColor: isDark ? '#09090b' : '#ffffff',
      foregroundColor: isDark ? '#fafafa' : '#09090b',
      borderColor: isDark ? '#27272a' : '#e4e4e7',
      subtleTextColor: isDark ? '#a1a1aa' : '#52525b',
    });
  }, [isDark, viewMode]);

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
      notifications.show({
        color: 'green',
        title: 'Staged overlays confirmed',
        message: `${Number(data ?? 0)} block(s) confirmed.`,
      });
      await refetchOverlays();
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Confirm all failed',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setConfirmingAll(false);
    }
  }, [refetchOverlays, selectedRunId]);

  const handleConfirmBlock = useCallback(async (blockUid: string) => {
    if (!selectedRunId) return;
    setBlockBusy(blockUid, true);
    try {
      const { data, error } = await supabase.rpc('confirm_overlays', {
        p_run_id: selectedRunId,
        p_block_uids: [blockUid],
      });
      if (error) throw new Error(error.message);
      const confirmed = Number(data ?? 0);
      if (confirmed === 0) {
        notifications.show({
          color: 'blue',
          title: 'No change',
          message: 'Block is no longer staged.',
        });
      }
      await refetchOverlays();
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Confirm block failed',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBlockBusy(blockUid, false);
    }
  }, [refetchOverlays, selectedRunId, setBlockBusy]);

  const handleRejectBlock = useCallback(async (blockUid: string) => {
    if (!selectedRunId) return;
    setBlockBusy(blockUid, true);
    try {
      const { data, error } = await supabase.rpc('reject_overlays_to_pending', {
        p_run_id: selectedRunId,
        p_block_uids: [blockUid],
      });
      if (error) throw new Error(error.message);
      const reset = Number(data ?? 0);
      if (reset === 0) {
        notifications.show({
          color: 'blue',
          title: 'No change',
          message: 'Block is no longer staged.',
        });
      }
      await refetchOverlays();
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Reject block failed',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBlockBusy(blockUid, false);
    }
  }, [refetchOverlays, selectedRunId, setBlockBusy]);

  const handleCellValueChanged = useCallback(async (event: CellValueChangedEvent<Record<string, unknown>>) => {
    const colField = event.colDef.field;
    if (!colField || !colField.startsWith('field_') || !selectedRunId) return;

    const blockUid = event.data?.block_uid as string | undefined;
    if (!blockUid) return;

    const overlay = overlayMap.get(blockUid);
    if (!overlay || overlay.status !== 'ai_complete') return;

    const fieldKey = colField.slice('field_'.length);
    const fieldMeta = schemaFieldByKey.get(fieldKey);
    const parsedValue = parseEditedValue(event.newValue, fieldMeta);
    const parsedPreviousValue = parseEditedValue(event.oldValue, fieldMeta);
    if (JSON.stringify(parsedValue) === JSON.stringify(parsedPreviousValue)) return;

    const nextStaging = {
      ...(overlay.overlay_jsonb_staging ?? {}),
      [fieldKey]: parsedValue,
    };

    try {
      const { error } = await supabase.rpc('update_overlay_staging', {
        p_run_id: selectedRunId,
        p_block_uid: blockUid,
        p_staging_jsonb: nextStaging,
      });
      if (error) throw new Error(error.message);

      patchOverlay(blockUid, (current) => ({
        ...current,
        overlay_jsonb_staging: nextStaging,
      }));
    } catch (e) {
      event.node.setDataValue(colField, event.oldValue);
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [overlayMap, patchOverlay, schemaFieldByKey, selectedRunId]);

  const columnDefs = useMemo<(ColDef | ColGroupDef)[]>(() => {
    const useAutoHeight = viewMode === 'comfortable';
    const contentMinWidth = 320;
    const locatorWidth = 280;
    const parserPathWidth = 280;
    const lastErrorWidth = 220;

    const immutableCols: ColDef[] = [
      {
        field: 'block_index',
        headerName: '#',
        width: 60,
        suppressSizeToFit: true,
        type: 'numericColumn',
        hide: hiddenCols.has('block_index'),
      },
      {
        field: 'block_type_view',
        headerName: 'Type',
        width: 120,
        cellRenderer: BlockTypeCellRenderer,
        hide: hiddenCols.has('block_type'),
      },
      {
        field: 'block_content',
        headerName: 'Content',
        flex: 1,
        minWidth: contentMinWidth,
        wrapText: true,
        autoHeight: true,
        hide: hiddenCols.has('block_content'),
      },
      {
        field: 'block_uid',
        headerName: 'Block UID',
        width: 220,
        wrapText: true,
        autoHeight: true,
        cellClass: 'cell-break-anywhere',
        hide: hiddenCols.has('block_uid'),
      },
      {
        field: 'block_locator_view',
        headerName: 'Locator',
        width: locatorWidth,
        wrapText: true,
        autoHeight: useAutoHeight,
        hide: hiddenCols.has('block_locator'),
      },
      {
        field: 'parser_block_type',
        headerName: 'Parser Type',
        width: 160,
        hide: hiddenCols.has('parser_block_type') || blockTypeView !== 'parser_native' || !hasParserTypeData,
      },
      {
        field: 'parser_path',
        headerName: 'Parser Path',
        width: parserPathWidth,
        wrapText: true,
        autoHeight: useAutoHeight,
        hide: hiddenCols.has('parser_path') || blockTypeView !== 'parser_native',
      },
    ];

    if (!hasRun) return immutableCols;

    const userDefinedCols: ColDef[] = [
      {
        field: '_overlay_status',
        headerName: 'Status',
        width: 100,
        cellRenderer: StatusCellRenderer,
        cellClass: firstUserSchemaColId === '_overlay_status' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_overlay_status' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_overlay_status'),
      },
      {
        field: '_review_actions',
        headerName: 'Review',
        width: 100,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: ReviewActionCellRenderer,
        cellRendererParams: {
          onConfirmBlock: handleConfirmBlock,
          onRejectBlock: handleRejectBlock,
          isBusy: isBusyForBlock,
        } satisfies ReviewActionCellRendererParams,
        cellClass: firstUserSchemaColId === '_review_actions' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_review_actions' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_review_actions'),
      },
      ...schemaFields.map((field): ColDef => ({
        field: `field_${field.key}`,
        headerName: field.key,
        width: 180,
        cellRenderer: SchemaFieldCellRenderer,
        cellRendererParams: { fieldMeta: field },
        editable: (params) => params.data?._overlay_status === 'ai_complete',
        cellEditor: field.type === 'enum' || field.type === 'boolean' ? 'agSelectCellEditor' : undefined,
        cellEditorParams: field.type === 'enum'
          ? { values: field.enumValues ?? [] }
          : field.type === 'boolean'
            ? { values: ['true', 'false'] }
            : undefined,
        valueParser: (params) => parseEditedValue(params.newValue, field),
        cellClassRules: {
          'overlay-staged-cell': (params) => params.data?._overlay_status === 'ai_complete',
          'overlay-confirmed-cell': (params) => params.data?._overlay_status === 'confirmed',
        },
        cellClass: firstUserSchemaColId === `field_${field.key}` ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === `field_${field.key}` ? 'user-schema-boundary-header' : undefined,
        resizable: true,
        wrapText: true,
        autoHeight: useAutoHeight,
        hide: hiddenCols.has(`field_${field.key}`),
      })),
    ];

    const overlayMetaCols: ColDef[] = [
      {
        field: '_claimed_by',
        headerName: 'Claimed By',
        width: 140,
        cellClass: firstUserSchemaColId === '_claimed_by' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_claimed_by' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_claimed_by'),
      },
      {
        field: '_claimed_at',
        headerName: 'Claimed At',
        width: 160,
        cellClass: firstUserSchemaColId === '_claimed_at' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_claimed_at' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_claimed_at'),
      },
      {
        field: '_attempt_count',
        headerName: 'Attempts',
        width: 90,
        type: 'numericColumn',
        cellClass: firstUserSchemaColId === '_attempt_count' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_attempt_count' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_attempt_count'),
      },
      {
        field: '_last_error',
        headerName: 'Last Error',
        width: lastErrorWidth,
        wrapText: true,
        autoHeight: useAutoHeight,
        cellClass: firstUserSchemaColId === '_last_error' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_last_error' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_last_error'),
      },
      {
        field: '_confirmed_at',
        headerName: 'Confirmed At',
        width: 160,
        cellClass: firstUserSchemaColId === '_confirmed_at' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_confirmed_at' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_confirmed_at'),
      },
      {
        field: '_confirmed_by',
        headerName: 'Confirmed By',
        width: 140,
        cellClass: firstUserSchemaColId === '_confirmed_by' ? 'user-schema-boundary-cell' : undefined,
        headerClass: firstUserSchemaColId === '_confirmed_by' ? 'user-schema-boundary-header' : undefined,
        hide: hiddenCols.has('_confirmed_by'),
      },
    ];

    return [
      {
        headerName: 'Immutable',
        children: immutableCols,
        marryChildren: true,
      } as ColGroupDef,
      {
        headerName: `User-Defined - ${selectedRun?.schemas?.schema_ref ?? 'unknown'}`,
        children: userDefinedCols,
      } as ColGroupDef,
      {
        headerName: 'Overlay Metadata',
        children: overlayMetaCols,
      } as ColGroupDef,
    ];
  }, [
    blockTypeView,
    handleConfirmBlock,
    handleRejectBlock,
    hasRun,
    firstUserSchemaColId,
    hasParserTypeData,
    hiddenCols,
    isBusyForBlock,
    schemaFields,
    selectedRun,
    viewMode,
  ]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    suppressMovable: false,
  }), []);

  const totalPages = Math.ceil(totalCount / pageSize);
  const error = blocksError || overlaysError;
  const gridHeight = 'calc(100vh - 230px)';

  const getRowId = useCallback((params: { data: Record<string, unknown> }) => (
    params.data.block_uid as string
  ), []);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.resetRowHeights();
    api.refreshCells({ force: true });
  }, [viewerFontFamily, viewerFontSize, viewMode, blockTypeView]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(Array.from(hiddenCols)));
  }, [hiddenCols]);

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIEW_MODE_KEY, value);
    }
  };

  const handleBlockTypeViewChange = (value: string) => {
    const next = value === 'parser_native' ? 'parser_native' : 'normalized';
    setBlockTypeView(next);
    setTypeFilter([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BLOCK_TYPE_VIEW_KEY, next);
    }
  };

  const handleViewerFontSizeChange = (value: string) => {
    const next: ViewerFontSize = value === 'small' || value === 'large' ? value : 'medium';
    setViewerFontSize(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIEWER_FONT_SIZE_KEY, next);
    }
  };

  const handleViewerFontFamilyChange = (value: string) => {
    const next: ViewerFontFamily = value === 'serif' || value === 'mono' ? value : 'sans';
    setViewerFontFamily(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIEWER_FONT_FAMILY_KEY, next);
    }
  };

  const handleViewerVerticalAlignChange = (value: string | null) => {
    const next: ViewerVerticalAlign = value === 'top' || value === 'bottom' ? value : 'center';
    setViewerVerticalAlign(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIEWER_VERTICAL_ALIGN_KEY, next);
    }
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
      { id: 'block_index', label: '#' },
      { id: 'block_type', label: 'Type' },
      { id: 'block_content', label: 'Content' },
      { id: 'block_uid', label: 'Block UID' },
      { id: 'block_locator', label: 'Locator' },
      { id: 'parser_path', label: 'Parser Path' },
    ];
    if (hasParserTypeData) {
      cols.push({ id: 'parser_block_type', label: 'Parser Type' });
    }
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

  return (
    <>
      <Paper p="xs" mb={4} withBorder>
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs" wrap="nowrap">
            {blockTypes.length > 1 && (
              <Menu shadow="md" width={200} position="bottom-start" withinPortal closeOnItemClick={false}>
                <Menu.Target>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    px={8}
                    leftSection={<IconFilter size={14} />}
                    rightSection={<IconChevronDown size={10} />}
                  >
                    {typeFilter.length === 0 ? 'All types' : `${typeFilter.length} type${typeFilter.length > 1 ? 's' : ''}`}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {blockTypes.map((type) => (
                    <Menu.Item
                      key={type}
                      leftSection={
                        typeFilter.includes(type)
                          ? <IconCheck size={14} />
                          : <span style={{ width: 14, display: 'inline-block' }} />
                      }
                      onClick={() =>
                        setTypeFilter((prev) =>
                          prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
                        )
                      }
                    >
                      <Text size="xs">{type}</Text>
                    </Menu.Item>
                  ))}
                  {typeFilter.length > 0 && (
                    <>
                      <Menu.Divider />
                      <Menu.Item c="dimmed" onClick={() => setTypeFilter([])}>
                        <Text size="xs">Clear all</Text>
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
            )}

            <SegmentedControl
              data={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
              value={viewMode}
              onChange={handleViewModeChange}
              size="xs"
            />

            <SegmentedControl
              data={[
                { value: 'small', label: 'S' },
                { value: 'medium', label: 'M' },
                { value: 'large', label: 'L' },
              ]}
              value={viewerFontSize}
              onChange={handleViewerFontSizeChange}
              size="xs"
            />

            <SegmentedControl
              data={[
                { value: 'sans', label: 'Sans' },
                { value: 'serif', label: 'Serif' },
                { value: 'mono', label: 'Mono' },
              ]}
              value={viewerFontFamily}
              onChange={handleViewerFontFamilyChange}
              size="xs"
            />

            <Menu shadow="md" width={170} position="bottom-start" withinPortal>
              <Menu.Target>
                <Tooltip label="Vertical align">
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    px={6}
                    rightSection={<IconChevronDown size={10} />}
                    aria-label="Vertical align"
                  >
                    {viewerVerticalAlign === 'top'
                      ? <IconArrowBarToUp size={14} />
                      : viewerVerticalAlign === 'center'
                        ? <IconArrowsVertical size={14} />
                        : <IconArrowBarToDown size={14} />}
                  </Button>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconArrowBarToUp size={14} />} onClick={() => handleViewerVerticalAlignChange('top')}>Top</Menu.Item>
                <Menu.Item leftSection={<IconArrowsVertical size={14} />} onClick={() => handleViewerVerticalAlignChange('center')}>Center</Menu.Item>
                <Menu.Item leftSection={<IconArrowBarToDown size={14} />} onClick={() => handleViewerVerticalAlignChange('bottom')}>Bottom</Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <Menu shadow="md" width={250} position="bottom-end" withinPortal closeOnItemClick={false}>
              <Menu.Target>
                <Tooltip label="Toggle columns">
                  <ActionIcon variant="subtle" size="sm">
                    <IconColumns size={16} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Representation (affects columns)</Menu.Label>
                <Text size="10px" c="dimmed" px="xs" pb={4}>
                  Normalized shows baseline columns. Parser Native reveals Parser Type/Path columns for inspection.
                </Text>
                <Menu.Item
                  onClick={() => handleBlockTypeViewChange('normalized')}
                  leftSection={
                    blockTypeView === 'normalized'
                      ? <IconCheck size={14} />
                      : <span style={{ width: 14, display: 'inline-block' }} />
                  }
                >
                  <Text size="xs">Normalized</Text>
                </Menu.Item>
                <Menu.Item
                  onClick={() => handleBlockTypeViewChange('parser_native')}
                  leftSection={
                    blockTypeView === 'parser_native'
                      ? <IconCheck size={14} />
                      : <span style={{ width: 14, display: 'inline-block' }} />
                  }
                >
                  <Text size="xs">Parser Native</Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Label>Columns</Menu.Label>
                {allColumns.map((col) => (
                  <Menu.Item
                    key={col.id}
                    onClick={() => toggleColumn(col.id)}
                    leftSection={<Text size="xs" fw={500}>{hiddenCols.has(col.id) ? '[ ]' : '[x]'}</Text>}
                  >
                    <Text size="xs">{col.label}</Text>
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            <Divider orientation="vertical" />

            <Text size="xs" c="dimmed">
              {typeFilter.length > 0 ? `${rowData.length} of ${totalCount}` : totalCount} blocks
            </Text>
            {hasRun && (
              <Text size="xs" c="dimmed">
                {confirmedCount} confirmed - {stagedCount} staged
              </Text>
            )}
            <Select
              data={PAGE_SIZES}
              value={String(pageSize)}
              onChange={(value) => {
                setPageSize(Number(value) || 50);
                setPageIndex(0);
              }}
              w={72}
              size="xs"
              aria-label="Page size"
            />
          </Group>
          <Group gap={4} wrap="nowrap">
            {onExport && (
              <Tooltip label="Export">
                <ActionIcon variant="light" size="lg" onClick={onExport} aria-label="Export">
                  <IconDownload size={22} />
                </ActionIcon>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip label="Delete">
                <ActionIcon variant="subtle" color="red" size="lg" onClick={onDelete} aria-label="Delete">
                  <IconTrash size={22} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Paper>

      {hasRun && stagedCount > 0 && (
        <Alert color="yellow" variant="light" mb={4}>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="xs">
              Staged - awaiting review: {stagedCount} block(s). Edit staged cells, confirm per block, or confirm all.
            </Text>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconCheck size={12} />}
              onClick={handleConfirmAllStaged}
              loading={confirmingAll}
              disabled={!selectedRunId || stagedCount === 0}
            >
              Confirm All Staged
            </Button>
          </Group>
        </Alert>
      )}

      {error && <ErrorAlert message={error} />}

      <div style={{ display: 'flex', flexDirection: 'column', height: gridHeight, minHeight: 300 }}>
        <div
          className={`block-viewer-grid grid-${viewMode} grid-font-${viewerFontSize} grid-font-family-${viewerFontFamily} grid-valign-${viewerVerticalAlign}`}
          style={{
            flex: 1,
            width: '100%',
            opacity: blocksLoading || overlaysLoading ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <AgGridReact
            ref={gridRef}
            theme={gridTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            onCellValueChanged={handleCellValueChanged}
            animateRows={false}
            suppressColumnVirtualisation={false}
            domLayout="normal"
          />
        </div>

        {totalPages > 1 && (
          <Group justify="center" py={6}>
            <Pagination
              total={totalPages}
              value={pageIndex + 1}
              onChange={(page) => setPageIndex(page - 1)}
              size="xs"
            />
          </Group>
        )}
      </div>
    </>
  );
}
