import { useMemo, useState, useCallback, useRef } from 'react';
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
  MultiSelect,
  Pagination,
  Paper,
  SegmentedControl,
  Select,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconColumns,
  IconFilter,
  IconRotateClockwise,
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

type BlockViewerGridProps = {
  convUid: string;
  selectedRunId: string | null;
  selectedRun: RunWithSchema | null;
};

export function BlockViewerGrid({ convUid, selectedRunId, selectedRun }: BlockViewerGridProps) {
  const gridRef = useRef<AgGridReact<Record<string, unknown>>>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<string>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_MODE_KEY) : null;
    if (stored === 'expanded') return 'comfortable';
    return stored === 'compact' || stored === 'comfortable' ? stored : 'compact';
  });
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
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

  const blockTypes = useMemo(() => {
    const types = new Set<string>();
    blocks.forEach((block) => types.add(block.block_type));
    return Array.from(types).sort();
  }, [blocks]);

  const rowData = useMemo(() => {
    return blocks
      .filter((block) => typeFilter.length === 0 || typeFilter.includes(block.block_type))
      .map((block) => {
        const overlay = overlayMap.get(block.block_uid) ?? null;
        const row: Record<string, unknown> = {
          block_index: block.block_index,
          block_type: block.block_type,
          block_content: block.block_content,
          block_uid: block.block_uid,
          conv_uid: block.conv_uid,
          block_locator: block.block_locator ? JSON.stringify(block.block_locator) : null,
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
  }, [blocks, overlayMap, schemaFields, typeFilter]);

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

  const gridTheme = useMemo(
    () => DENSITY_THEMES[viewMode as keyof typeof DENSITY_THEMES] ?? DENSITY_THEMES.compact,
    [viewMode],
  );

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
    const immutableCols: ColDef[] = [
      {
        field: 'block_index',
        headerName: '#',
        pinned: 'left',
        width: 60,
        suppressSizeToFit: true,
        type: 'numericColumn',
        hide: hiddenCols.has('block_index'),
      },
      {
        field: 'block_type',
        headerName: 'Type',
        pinned: 'left',
        width: 120,
        cellRenderer: BlockTypeCellRenderer,
        hide: hiddenCols.has('block_type'),
      },
      {
        field: 'block_content',
        headerName: 'Content',
        pinned: 'left',
        width: 350,
        wrapText: true,
        autoHeight: true,
        hide: hiddenCols.has('block_content'),
      },
      {
        field: 'block_uid',
        headerName: 'Block UID',
        width: 220,
        hide: hiddenCols.has('block_uid'),
      },
      {
        field: 'conv_uid',
        headerName: 'Conv UID',
        width: 220,
        hide: hiddenCols.has('conv_uid'),
      },
      {
        field: 'block_locator',
        headerName: 'Locator',
        width: 250,
        wrapText: true,
        autoHeight: true,
        hide: hiddenCols.has('block_locator'),
      },
    ];

    if (!hasRun) return immutableCols;

    const userDefinedCols: ColDef[] = [
      {
        field: '_overlay_status',
        headerName: 'Status',
        width: 100,
        cellRenderer: StatusCellRenderer,
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
        resizable: true,
        wrapText: true,
        autoHeight: true,
        hide: hiddenCols.has(`field_${field.key}`),
      })),
    ];

    const overlayMetaCols: ColDef[] = [
      { field: '_claimed_by', headerName: 'Claimed By', width: 140, hide: hiddenCols.has('_claimed_by') },
      { field: '_claimed_at', headerName: 'Claimed At', width: 160, hide: hiddenCols.has('_claimed_at') },
      { field: '_attempt_count', headerName: 'Attempts', width: 90, type: 'numericColumn', hide: hiddenCols.has('_attempt_count') },
      { field: '_last_error', headerName: 'Last Error', width: 200, wrapText: true, autoHeight: true, hide: hiddenCols.has('_last_error') },
      { field: '_confirmed_at', headerName: 'Confirmed At', width: 160, hide: hiddenCols.has('_confirmed_at') },
      { field: '_confirmed_by', headerName: 'Confirmed By', width: 140, hide: hiddenCols.has('_confirmed_by') },
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
    handleConfirmBlock,
    handleRejectBlock,
    hasRun,
    hiddenCols,
    isBusyForBlock,
    schemaFields,
    selectedRun,
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

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIEW_MODE_KEY, value);
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
      { id: 'conv_uid', label: 'Conv UID' },
      { id: 'block_locator', label: 'Locator' },
    ];
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
  }, [hasRun, schemaFields]);

  return (
    <>
      <Paper p="xs" mb={4} withBorder>
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs" wrap="nowrap">
            {blockTypes.length > 1 && (
              <MultiSelect
                data={blockTypes.map((type) => ({ value: type, label: type }))}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="All types"
                size="xs"
                w={160}
                clearable
                leftSection={<IconFilter size={14} />}
                comboboxProps={{ withinPortal: true }}
              />
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

            <Menu shadow="md" width={220} position="bottom-end" withinPortal>
              <Menu.Target>
                <Tooltip label="Toggle columns">
                  <ActionIcon variant="subtle" size="sm">
                    <IconColumns size={16} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
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
          className={`grid-${viewMode}`}
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
