import { Text, Tooltip } from '@mantine/core';
import type { CellContext } from '@tanstack/react-table';

export function BlockContentCell<T>({ getValue, column }: CellContext<T, unknown>) {
  const meta = column.columnDef.meta as Record<string, unknown> | undefined;
  const normalize = meta?.normalizeContent as ((v: unknown) => string) | undefined;
  const raw = getValue();
  const text = normalize ? normalize(raw) : (typeof raw === 'string' ? raw : '');

  if (!text) return <Text size="xs" c="dimmed">--</Text>;

  return (
    <Tooltip label={text} disabled={text.length <= 80} multiline maw={500} withArrow>
      <Text size="xs" style={{ whiteSpace: 'normal', lineHeight: 1.45 }}>
        {text}
      </Text>
    </Tooltip>
  );
}
