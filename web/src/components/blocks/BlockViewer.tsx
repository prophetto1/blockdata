import { Fragment, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type ExpandedState,
  type ColumnPinningState,
} from '@tanstack/react-table';
import {
  Box,
  Badge,
  Group,
  Select,
  Pagination,
  ActionIcon,
  Text,
  Progress,
  Paper,
  Divider,
} from '@mantine/core';
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { useBlocks } from '@/hooks/useBlocks';
import { useRuns } from '@/hooks/useRuns';
import { useOverlays } from '@/hooks/useOverlays';
import { extractSchemaFields } from '@/lib/schema-fields';
import type { BlockWithOverlay } from '@/lib/types';
import { RunSelector } from './RunSelector';
import { BlockContentCell } from './BlockContentCell';
import { StatusBadge } from './StatusBadge';
import { OverlayCell } from './OverlayCell';
import { ExpandedRow } from './ExpandedRow';
import { ErrorAlert } from '@/components/common/ErrorAlert';

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

// IDs of the immutable (left-pinned) columns
const PINNED_LEFT = ['expand', 'block_index', 'block_type', 'block_content'];

export function BlockViewer({ convUid }: { convUid: string }) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnPinning] = useState<ColumnPinningState>({ left: PINNED_LEFT, right: [] });

  const { blocks, totalCount, loading: blocksLoading, error: blocksError } = useBlocks(convUid, pageIndex, pageSize);
  const { runs, error: runsError } = useRuns(convUid);
  const { overlayMap, error: overlaysError } = useOverlays(selectedRunId);

  const selectedRun = runs.find((r) => r.run_id === selectedRunId) ?? null;
  const schemaFields = useMemo(
    () => (selectedRun?.schemas?.schema_jsonb ? extractSchemaFields(selectedRun.schemas.schema_jsonb) : []),
    [selectedRun],
  );

  // Client-side join: blocks + overlays
  const data: BlockWithOverlay[] = useMemo(
    () => blocks.map((b) => ({ ...b, overlay: overlayMap.get(b.block_uid) ?? null })),
    [blocks, overlayMap],
  );

  // Progress stats for selected run
  const runProgress = selectedRun
    ? {
        completed: selectedRun.completed_blocks,
        failed: selectedRun.failed_blocks,
        total: selectedRun.total_blocks,
        pctComplete: selectedRun.total_blocks > 0 ? (selectedRun.completed_blocks / selectedRun.total_blocks) * 100 : 0,
        pctFailed: selectedRun.total_blocks > 0 ? (selectedRun.failed_blocks / selectedRun.total_blocks) * 100 : 0,
      }
    : null;

  const columns = useMemo<ColumnDef<BlockWithOverlay>[]>(() => {
    const cols: ColumnDef<BlockWithOverlay>[] = [
      {
        id: 'expand',
        header: '',
        size: 36,
        cell: ({ row }) => (
          <ActionIcon variant="subtle" size="xs" onClick={() => row.toggleExpanded()}>
            {row.getIsExpanded() ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </ActionIcon>
        ),
      },
      {
        id: 'block_index',
        accessorKey: 'block_index',
        header: '#',
        size: 52,
        cell: ({ getValue }) => (
          <Text size="xs" ff="monospace" c="dimmed">{getValue<number>()}</Text>
        ),
      },
      {
        id: 'block_type',
        accessorKey: 'block_type',
        header: 'Type',
        size: 110,
        cell: ({ getValue }) => {
          const t = getValue<string>();
          return <Badge size="xs" variant="light" color={BLOCK_TYPE_COLOR[t] ?? 'gray'}>{t}</Badge>;
        },
      },
      {
        id: 'block_content',
        accessorKey: 'block_content',
        header: 'Content',
        size: 360,
        cell: ({ getValue }) => <BlockContentCell content={getValue<string>()} />,
      },
    ];

    if (selectedRunId) {
      cols.push({
        id: 'overlay_status',
        header: 'Status',
        size: 90,
        cell: ({ row }) => <StatusBadge status={row.original.overlay?.status} />,
      });

      for (const field of schemaFields) {
        cols.push({
          id: `field_${field.key}`,
          header: field.key,
          size: 180,
          cell: ({ row }) => (
            <OverlayCell
              value={row.original.overlay?.overlay_jsonb?.[field.key]}
              fieldMeta={field}
            />
          ),
        });
      }
    }

    return cols;
  }, [selectedRunId, schemaFields]);

  const table = useReactTable({
    data,
    columns,
    state: { expanded, columnPinning },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const error = blocksError || runsError || overlaysError;

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

      {/* Progress bar (when run selected) */}
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

      {/* Table */}
      <Box
        style={{
          overflow: 'auto',
          width: '100%',
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-md)',
          opacity: blocksLoading ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'var(--mantine-font-size-sm)',
          }}
        >
          {/* Column group header row */}
          {selectedRunId && (
            <thead>
              <tr>
                <th
                  colSpan={PINNED_LEFT.length}
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    background: 'var(--mantine-color-blue-light)',
                    padding: '4px 8px',
                    fontSize: 'var(--mantine-font-size-xs)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--mantine-color-blue-light-color)',
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  Immutable
                </th>
                <th
                  colSpan={columns.length - PINNED_LEFT.length}
                  style={{
                    background: 'var(--mantine-color-violet-light)',
                    padding: '4px 8px',
                    fontSize: 'var(--mantine-font-size-xs)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--mantine-color-violet-light-color)',
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                  }}
                >
                  User-Defined ({selectedRun?.schemas?.schema_ref ?? 'unknown'})
                </th>
              </tr>
            </thead>
          )}
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  return (
                    <th
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        minWidth: header.getSize(),
                        position: isPinned ? 'sticky' : undefined,
                        left: isPinned === 'left' ? `${header.column.getStart('left')}px` : undefined,
                        zIndex: isPinned ? 2 : 1,
                        background: 'var(--mantine-color-body)',
                        padding: '8px 10px',
                        fontWeight: 600,
                        fontSize: 'var(--mantine-font-size-xs)',
                        textAlign: 'left',
                        borderBottom: '2px solid var(--mantine-color-default-border)',
                        whiteSpace: 'nowrap',
                        boxShadow: isPinned === 'left' && header.column.id === 'block_content'
                          ? '2px 0 4px -2px rgba(0,0,0,0.1)' : undefined,
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  style={{
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => row.toggleExpanded()}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isPinned = cell.column.getIsPinned();
                    return (
                      <td
                        key={cell.id}
                        style={{
                          padding: '6px 10px',
                          position: isPinned ? 'sticky' : undefined,
                          left: isPinned === 'left' ? `${cell.column.getStart('left')}px` : undefined,
                          zIndex: isPinned ? 1 : 0,
                          background: 'var(--mantine-color-body)',
                          verticalAlign: 'top',
                          boxShadow: isPinned === 'left' && cell.column.id === 'block_content'
                            ? '2px 0 4px -2px rgba(0,0,0,0.1)' : undefined,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={columns.length} style={{ padding: 0 }}>
                      <ExpandedRow row={row.original} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {data.length === 0 && !blocksLoading && (
              <tr>
                <td colSpan={columns.length} style={{ padding: '24px', textAlign: 'center' }}>
                  <Text c="dimmed" size="sm">No blocks found.</Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Box>

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
