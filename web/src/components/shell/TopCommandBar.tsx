import { ActionIcon, Box, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@/components/ui/primitives';
import { IconMenu2, IconMoonStars, IconSun } from '@tabler/icons-react';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';

type TopCommandBarProps = {
  onToggleNav: () => void;
  shellGuides?: boolean;
}

export function TopCommandBar({
  onToggleNav,
  shellGuides = false,
}: TopCommandBarProps) {
  const { center, shellTopSlots } = useHeaderCenter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');
  const isDark = (colorScheme === 'auto' ? computedColorScheme : colorScheme) === 'dark';
  const className = `top-command-bar${shellGuides ? ' top-command-bar--shell-guides' : ' top-command-bar--minimal'}`;
  const leftNode = shellTopSlots?.left ?? null;
  const middleNode = shellGuides ? (shellTopSlots?.middle ?? null) : center;
  const rightNode = shellTopSlots?.right ?? null;
  const hideLeftDivider = shellGuides && Boolean(shellTopSlots?.hideLeftDivider);
  const showRightSlot = shellGuides || Boolean(shellTopSlots?.showRightInMinimal);

  return (
    <Box
      className={className}
      data-hide-left-divider={hideLeftDivider ? 'true' : undefined}
    >
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
      <Box className="top-command-bar-center">
        {middleNode}
      </Box>
      <Box className="top-command-bar-right">
        <Box className="top-command-bar-right-content">
          {showRightSlot ? (
            <Box className="top-command-bar-right-slot">
              {rightNode}
            </Box>
          ) : null}
          <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <ActionIcon
              className="top-command-bar-theme-toggle"
              variant="subtle"
              size="md"
              aria-label="Toggle color scheme"
              onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <IconSun size={20} /> : <IconMoonStars size={20} />}
            </ActionIcon>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
