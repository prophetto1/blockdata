import { Badge } from '@mantine/core';
import type { CellContext } from '@tanstack/react-table';

export function BlockTypeCell<T>({ getValue, table }: CellContext<T, unknown>) {
  const type = getValue() as string;
  const badgeColorMap = (table.options.meta as Record<string, unknown> | undefined)?.badgeColorMap as Record<string, string> | undefined;
  return (
    <Badge size="xs" variant="light" color={badgeColorMap?.[type] ?? 'gray'}>
      {type}
    </Badge>
  );
}
