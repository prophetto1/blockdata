import { Text, Tooltip } from '@mantine/core';

export function BlockContentCell({ content, maxLen = 120 }: { content: string; maxLen?: number }) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const clipped = normalized.length > maxLen;
  const display = clipped ? normalized.slice(0, maxLen) + '...' : normalized;

  return (
    <Tooltip label={normalized} multiline maw={500} disabled={!clipped} withArrow>
      <Text size="sm" ff="monospace" lineClamp={2}>
        {display}
      </Text>
    </Tooltip>
  );
}
