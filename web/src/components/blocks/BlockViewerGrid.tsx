import { useMemo, useState, useCallback } from 'react';
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
  Box,
  Badge,
  Group,
  Select,
  Text,
  Progress,
  Paper,
  Divider,
  Pagination,
  Tooltip,
} from '@mantine/core';
import { useBlocks } from '@/hooks/useBlocks';
import { useRuns } from '@/hooks/useRuns';
import { useOverlays } from '@/hooks/useOverlays';
import { extractSchemaFields, type SchemaFieldMeta } from '@/lib/schema-fields';
import { RunSelector } from './RunSelector';
import { ErrorAlert } from '@/components/common/ErrorAlert';

// Register AG Grid community modules once
ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz;

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

// ── Cell renderers ──

function BlockTypeCellRenderer(params: ICellRendererParams) {
  const t = params.value as string;
  return <Badge size="xs" variant="light" color={BLOCK_TYPE_COLOR[t] ?? 'gray'}>{t}</Badge>;
}

function ContentCellRenderer(params: ICellRendererParams) {
  const val = (params.value as string) ?? '';
  const display = val.replace(/\s+/g, ' ').trim();
  return (
    <Tooltip label={display} disabled={display.length <= 100} multiline maw={500} withArrow>
      <span style={{ fontSize: 'var(--mantine-font-size-xs)' }}>{display}</span>
    </Tooltip>
  );
}

function StatusCellRenderer(params: ICellRendererParams) {
  const status = params.value as string | undefined;
  if (!status) return <Text size="xs" c="dimmed">--</Text>;
  const color =
    status === 'complete' ? 'green'
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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const { blocks, totalCount, loading: blocksLoading, error: blocksError } = useBlocks(convUid, pageIndex, pageSize);
  const { runs, error: runsError } = useRuns(convUid);
  const { overlayMap, error: overlaysError } = useOverlays(selectedRunId);

  const selectedRun = runs.find((r) => r.run_id === selectedRunId) ?? null;
  const schemaFields = useMemo(
    () => (selectedRun?.schemas?.schema_jsonb ? extractSchemaFields(selectedRun.schemas.schema_jsonb) : []),
    [selectedRun],
  );

  // Client-side join: flatten blocks + overlays into row data
  const rowData = useMemo(() => {
    return blocks.map((b) => {
      const overlay = overlayMap.get(b.block_uid) ?? null;
      const row: Record<string, unknown> = {
        block_index: b.block_index,
        block_type: b.block_type,
        block_content: b.block_content,
        block_uid: b.block_uid,
        block_locator: b.block_locator,
        _overlay_status: overlay?.status ?? null,
      };
      // Flatten overlay fields into top-level keys for AG Grid
      if (overlay?.overlay_jsonb) {
        for (const field of schemaFields) {
          row[`field_${field.key}`] = overlay.overlay_jsonb[field.key] ?? null;
        }
      }
      return row;
    });
  }, [blocks, overlayMap, schemaFields]);

  const hasRun = !!selectedRunId;

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
    // Immutable columns — pinned left
    const immutableCols: ColDef[] = [
      {
        field: 'block_index',
        headerName: '#',
        pinned: 'left',
        width: 60,
        suppressSizeToFit: true,
        type: 'numericColumn',
      },
      {
        field: 'block_type',
        headerName: 'Type',
        pinned: 'left',
        width: 120,
        cellRenderer: BlockTypeCellRenderer,
      },
      {
        field: 'block_content',
        headerName: 'Content',
        pinned: 'left',
        width: 350,
        cellRenderer: ContentCellRenderer,
        wrapText: false,
      },
    ];

    if (!hasRun) return immutableCols;

    // User-defined columns — one per schema field
    const userDefinedCols: ColDef[] = [
      {
        field: '_overlay_status',
        headerName: 'Status',
        width: 100,
        cellRenderer: StatusCellRenderer,
      },
      ...schemaFields.map((field): ColDef => ({
        field: `field_${field.key}`,
        headerName: field.key,
        width: 160,
        cellRenderer: SchemaFieldCellRenderer,
        cellRendererParams: { fieldMeta: field },
        resizable: true,
      })),
    ];

    // Wrap in column groups
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
    ];
  }, [hasRun, schemaFields, selectedRun]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    suppressMovable: false,
  }), []);

  const totalPages = Math.ceil(totalCount / pageSize);
  const error = blocksError || runsError || overlaysError;

  // Grid height: fit content or max 600px
  const gridHeight = Math.min(600, 44 + rowData.length * 42);

  const getRowId = useCallback((params: { data: Record<string, unknown> }) => {
    return params.data.block_uid as string;
  }, []);

  return (
    <>
      {/* Toolbar */}
      <Paper p="sm" mb="md" withBorder>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="wrap">
            <RunSelector runs={runs} value={selectedRunId} onChange={setSelectedRunId} />
            {selectedRun && (
              <Badge variant="light" color={selectedRun.status === 'complete' ? 'green' : selectedRun.status === 'running' ? 'blue' : 'red'}>
                {selectedRun.status}
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Text size="xs" c="dimmed">{totalCount} blocks</Text>
            <Divider orientation="vertical" />
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

      {/* Progress bar */}
      {runProgress && runProgress.total > 0 && (
        <Box mb="sm">
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">
              {runProgress.completed} complete, {runProgress.failed} failed of {runProgress.total}
            </Text>
            <Text size="xs" c="dimmed">
              {Math.round(runProgress.pctComplete + runProgress.pctFailed)}%
            </Text>
          </Group>
          <Progress.Root size="sm">
            <Progress.Section value={runProgress.pctComplete} color="green" />
            <Progress.Section value={runProgress.pctFailed} color="red" />
          </Progress.Root>
        </Box>
      )}

      {error && <ErrorAlert message={error} />}

      {/* AG Grid */}
      <div style={{ height: gridHeight, width: '100%', opacity: blocksLoading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        <AgGridReact
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            total={totalPages}
            value={pageIndex + 1}
            onChange={(p) => setPageIndex(p - 1)}
            size="sm"
          />
        </Group>
      )}
    </>
  );
}
