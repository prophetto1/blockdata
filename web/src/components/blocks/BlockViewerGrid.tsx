import { useMemo, useState, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ColGroupDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import {
  Badge,
  Group,
  Select,
  Text,
  Progress,
  Paper,
  Divider,
  Pagination,
  Tooltip,
  SegmentedControl,
  Menu,
  MultiSelect,
  ActionIcon,
} from '@mantine/core';
import {
  IconColumns,
  IconFilter,
} from '@tabler/icons-react';
import { useBlocks } from '@/hooks/useBlocks';
import { useRuns } from '@/hooks/useRuns';
import { useOverlays } from '@/hooks/useOverlays';
import { extractSchemaFields, type SchemaFieldMeta } from '@/lib/schema-fields';
import { RunSelector } from './RunSelector';
import { ErrorAlert } from '@/components/common/ErrorAlert';

// Register AG Grid community modules once
ModuleRegistry.registerModules([AllCommunityModule]);

// Density presets: row padding scale + line-height controlled via CSS class
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

// ── Cell renderers ──

function BlockTypeCellRenderer(params: ICellRendererParams) {
  const t = params.value as string;
  return <Badge size="xs" variant="light" color={BLOCK_TYPE_COLOR[t] ?? 'gray'}>{t}</Badge>;
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
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return (
        <Group gap={3} wrap="wrap">
          {value.slice(0, 5).map((v, i) => (
            <Badge key={i} size="xs" variant="light">{String(v)}</Badge>
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
          {entries.slice(0, 2).map(([k, v]) => `${k}: ${String(v)?.slice(0, 25)}`).join(', ')}
          {entries.length > 2 && ', ...'}
        </Text>
      </Tooltip>
    );
  }

  return <Text size="xs">{String(value)}</Text>;
}

// ── Main component ──

export function BlockViewerGrid({ convUid }: { convUid: string }) {
  const gridRef = useRef<AgGridReact>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [viewMode, setViewMode] = useState<string>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_MODE_KEY) : null;
    // Migrate old 'expanded' value to 'comfortable'
    if (stored === 'expanded') return 'comfortable';
    return stored === 'compact' || stored === 'comfortable' ? stored : 'compact';
  });
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  const { blocks, totalCount, loading: blocksLoading, error: blocksError } = useBlocks(convUid, pageIndex, pageSize);
  const { runs, error: runsError } = useRuns(convUid);
  const { overlayMap, error: overlaysError } = useOverlays(selectedRunId);

  const selectedRun = runs.find((r) => r.run_id === selectedRunId) ?? null;
  const schemaFields = useMemo(
    () => (selectedRun?.schemas?.schema_jsonb ? extractSchemaFields(selectedRun.schemas.schema_jsonb) : []),
    [selectedRun],
  );

  // Collect unique block types for the filter
  const blockTypes = useMemo(() => {
    const types = new Set<string>();
    blocks.forEach((b) => types.add(b.block_type));
    return Array.from(types).sort();
  }, [blocks]);

  // Client-side join: flatten blocks + overlays into row data, then filter by type
  const rowData = useMemo(() => {
    const rows = blocks
      .filter((b) => typeFilter.length === 0 || typeFilter.includes(b.block_type))
      .map((b) => {
        const overlay = overlayMap.get(b.block_uid) ?? null;
        const row: Record<string, unknown> = {
          block_index: b.block_index,
          block_type: b.block_type,
          block_content: b.block_content,
          block_uid: b.block_uid,
          conv_uid: b.conv_uid,
          block_locator: b.block_locator ? JSON.stringify(b.block_locator) : null,
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
            : overlay.overlay_jsonb_staging;
          if (data && Object.keys(data).length > 0) {
            for (const field of schemaFields) {
              row[`field_${field.key}`] = data[field.key] ?? null;
            }
          }
        }
        return row;
      });
    return rows;
  }, [blocks, overlayMap, schemaFields, typeFilter]);

  const hasRun = !!selectedRunId;

  // Dynamic AG Grid theme based on density
  const gridTheme = useMemo(
    () => DENSITY_THEMES[viewMode as keyof typeof DENSITY_THEMES] ?? DENSITY_THEMES.compact,
    [viewMode],
  );

  // Progress stats
  const runProgress = selectedRun
    ? {
        completed: selectedRun.completed_blocks,
        failed: selectedRun.failed_blocks,
        total: selectedRun.total_blocks,
        pctComplete: selectedRun.total_blocks > 0 ? (selectedRun.completed_blocks / selectedRun.total_blocks) * 100 : 0,
        pctFailed: selectedRun.total_blocks > 0 ? (selectedRun.failed_blocks / selectedRun.total_blocks) * 100 : 0,
      }
    : null;

  // Build column definitions dynamically
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
      ...schemaFields.map((field): ColDef => ({
        field: `field_${field.key}`,
        headerName: field.key,
        width: 160,
        cellRenderer: SchemaFieldCellRenderer,
        cellRendererParams: { fieldMeta: field },
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
        headerName: `User-Defined — ${selectedRun?.schemas?.schema_ref ?? 'unknown'}`,
        children: userDefinedCols,
      } as ColGroupDef,
      {
        headerName: 'Overlay Metadata',
        children: overlayMetaCols,
      } as ColGroupDef,
    ];
  }, [hasRun, schemaFields, selectedRun, hiddenCols]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    suppressMovable: false,
  }), []);

  const totalPages = Math.ceil(totalCount / pageSize);
  const error = blocksError || runsError || overlaysError;

  // Grid height: compressed layout — AppShell header 56 + breadcrumbs 28 + doc header 40 + toolbar 44 + pagination 40 + margins ~16
  const gridHeight = 'calc(100vh - 230px)';

  const getRowId = useCallback((params: { data: Record<string, unknown> }) => {
    return params.data.block_uid as string;
  }, []);

  const handleViewModeChange = (val: string) => {
    setViewMode(val);
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, val);
  };

  // Toggle column visibility
  const toggleColumn = (colId: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  // All toggleable columns for the visibility menu
  const allColumns = useMemo(() => {
    const cols: { id: string; label: string; group: string }[] = [
      { id: 'block_index', label: '#', group: 'Immutable' },
      { id: 'block_type', label: 'Type', group: 'Immutable' },
      { id: 'block_content', label: 'Content', group: 'Immutable' },
      { id: 'block_uid', label: 'Block UID', group: 'Immutable' },
      { id: 'conv_uid', label: 'Conv UID', group: 'Immutable' },
      { id: 'block_locator', label: 'Locator', group: 'Immutable' },
    ];
    if (hasRun) {
      cols.push({ id: '_overlay_status', label: 'Status', group: 'Schema' });
      schemaFields.forEach((f) => cols.push({ id: `field_${f.key}`, label: f.key, group: 'Schema' }));
      cols.push(
        { id: '_claimed_by', label: 'Claimed By', group: 'Overlay' },
        { id: '_claimed_at', label: 'Claimed At', group: 'Overlay' },
        { id: '_attempt_count', label: 'Attempts', group: 'Overlay' },
        { id: '_last_error', label: 'Last Error', group: 'Overlay' },
        { id: '_confirmed_at', label: 'Confirmed At', group: 'Overlay' },
        { id: '_confirmed_by', label: 'Confirmed By', group: 'Overlay' },
      );
    }
    return cols;
  }, [hasRun, schemaFields]);

  return (
    <>
      {/* Toolbar — single dense row */}
      <Paper p="xs" mb={4} withBorder>
        <Group justify="space-between" wrap="wrap" gap="xs">
          {/* Left: run selector + status + progress */}
          <Group gap="xs" wrap="wrap">
            <RunSelector runs={runs} value={selectedRunId} onChange={setSelectedRunId} />
            {selectedRun && (
              <Badge size="xs" variant="light" color={selectedRun.status === 'complete' ? 'green' : selectedRun.status === 'running' ? 'blue' : 'red'}>
                {selectedRun.status}
              </Badge>
            )}
            {runProgress && runProgress.total > 0 && (
              <Group gap={4} wrap="nowrap">
                <Progress.Root size="xs" w={80}>
                  <Progress.Section value={runProgress.pctComplete} color="green" />
                  <Progress.Section value={runProgress.pctFailed} color="red" />
                </Progress.Root>
                <Text size="xs" c="dimmed">
                  {runProgress.completed}/{runProgress.total}
                </Text>
              </Group>
            )}
          </Group>

          {/* Right: view controls */}
          <Group gap="xs" wrap="nowrap">
            {/* Block type filter */}
            {blockTypes.length > 1 && (
              <MultiSelect
                data={blockTypes.map((t) => ({ value: t, label: t }))}
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

            {/* Density toggle */}
            <SegmentedControl
              data={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
              value={viewMode}
              onChange={handleViewModeChange}
              size="xs"
            />

            {/* Column visibility */}
            <Menu shadow="md" width={200} position="bottom-end" withinPortal>
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
                    leftSection={
                      <Text size="xs" fw={500} c={hiddenCols.has(col.id) ? 'dimmed' : undefined}>
                        {hiddenCols.has(col.id) ? '☐' : '☑'}
                      </Text>
                    }
                  >
                    <Text size="xs">{col.label}</Text>
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            <Divider orientation="vertical" />

            {/* Block count + page size */}
            <Text size="xs" c="dimmed">
              {typeFilter.length > 0 ? `${rowData.length} of ${totalCount}` : totalCount} blocks
            </Text>
            <Select
              data={PAGE_SIZES}
              value={String(pageSize)}
              onChange={(v) => { setPageSize(Number(v) || 50); setPageIndex(0); }}
              w={72}
              size="xs"
              aria-label="Page size"
            />
          </Group>
        </Group>
      </Paper>

      {error && <ErrorAlert message={error} />}

      {/* Grid + Pagination container */}
      <div style={{ display: 'flex', flexDirection: 'column', height: gridHeight, minHeight: 300 }}>
        {/* AG Grid */}
        <div className={`grid-${viewMode}`} style={{ flex: 1, width: '100%', opacity: blocksLoading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <AgGridReact
            ref={gridRef}
            theme={gridTheme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            animateRows={false}
            suppressColumnVirtualisation={false}
            domLayout="normal"
          />
        </div>

        {/* Pagination — inside container */}
        {totalPages > 1 && (
          <Group justify="center" py={6}>
            <Pagination
              total={totalPages}
              value={pageIndex + 1}
              onChange={(p) => setPageIndex(p - 1)}
              size="xs"
            />
          </Group>
        )}
      </div>
    </>
  );
}
