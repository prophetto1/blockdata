import { ActionIcon, Box, Tooltip } from '@mantine/core';
import { IconMenu2 } from '@tabler/icons-react';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';

type TopCommandBarProps = {
  onToggleNav: () => void;
  shellGuides?: boolean;
}

export function TopCommandBar({
  onToggleNav,
  shellGuides = false,
}: TopCommandBarProps) {
  const { shellTopSlots } = useHeaderCenter();
  const className = `top-command-bar${shellGuides ? ' top-command-bar--shell-guides' : ' top-command-bar--minimal'}`;
  const leftNode = shellTopSlots?.left ?? null;
  const middleNode = shellTopSlots?.middle ?? null;
  const rightNode = shellTopSlots?.right ?? null;

  return (
    <Box className={className}>
      <Box className="top-command-bar-left">
        <Tooltip label="Toggle navigation">
          <ActionIcon
            hiddenFrom="sm"
            size="md"
            variant="subtle"
            aria-label="Toggle navigation"
            onClick={onToggleNav}
          >
            <IconMenu2 size={18} />
          </ActionIcon>
        </Tooltip>
        {shellGuides ? leftNode : null}
      </Box>
      {shellGuides && (
        <>
          <Box className="top-command-bar-center">
            {middleNode}
          </Box>
          <Box className="top-command-bar-right">
            {rightNode}
          </Box>
        </>
      )}
    </Box>
  );
}
