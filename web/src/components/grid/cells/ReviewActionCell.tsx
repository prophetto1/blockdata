import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconRotateClockwise } from '@tabler/icons-react';
import type { CellContext } from '@tanstack/react-table';

export type ReviewActionMeta = {
  onConfirmBlock?: (blockUid: string) => void;
  onRejectBlock?: (blockUid: string) => void;
  isBusy?: (blockUid: string) => boolean;
};

export function ReviewActionCell<T>({ row, table }: CellContext<T, unknown>) {
  const rowData = row.original as Record<string, unknown>;
  const status = rowData._overlay_status as string | undefined;
  const blockUid = rowData.block_uid as string | undefined;

  if (!blockUid || status !== 'ai_complete') {
    return <Text size="xs" c="dimmed">--</Text>;
  }

  const meta = table.options.meta as (ReviewActionMeta & Record<string, unknown>) | undefined;
  const busy = meta?.isBusy?.(blockUid) ?? false;

  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip label="Confirm block">
        <ActionIcon
          size="sm"
          variant="light"
          color="green"
          loading={busy}
          disabled={busy}
          onClick={() => meta?.onConfirmBlock?.(blockUid)}
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
          onClick={() => meta?.onRejectBlock?.(blockUid)}
        >
          <IconRotateClockwise size={12} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
