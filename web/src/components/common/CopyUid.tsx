import { CopyButton, Tooltip, UnstyledButton, Text } from '@mantine/core';

type CopyUidProps = {
  /** The full value to copy to clipboard */
  value: string;
  /** The truncated display label (defaults to value) */
  display?: string;
  /** Font size passed to Text */
  size?: string;
};

/** Truncated UID with click-to-copy and tooltip feedback. */
export function CopyUid({ value, display, size = 'sm' }: CopyUidProps) {
  return (
    <CopyButton value={value} timeout={1500}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? 'Copied' : value} withArrow>
          <UnstyledButton onClick={copy}>
            <Text size={size} ff="monospace" c={copied ? 'teal' : undefined}>
              {display ?? value}
            </Text>
          </UnstyledButton>
        </Tooltip>
      )}
    </CopyButton>
  );
}