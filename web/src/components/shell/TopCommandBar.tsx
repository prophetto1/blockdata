import { ActionIcon, Box, Group, Kbd, Tooltip } from '@mantine/core';
import { IconMenu2, IconMoon, IconSearch, IconSun } from '@tabler/icons-react';
import { spotlight } from '@mantine/spotlight';
import { AiAssistantIcon } from '@/components/icons/AiAssistantIcon';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { styleTokens } from '@/lib/styleTokens';

type TopCommandBarProps = {
  navOpened: boolean;
  onToggleNav: () => void;
  desktopNavOpened?: boolean;
  onToggleDesktopNav?: () => void;
  showSearch?: boolean;
  showAssistantToggle?: boolean;
  assistantOpened: boolean;
  onToggleAssistant: () => void;
  computedColorScheme: 'dark' | 'light';
  onToggleColorScheme: () => void;
};

export function TopCommandBar({
  onToggleNav,
  showSearch = true,
  showAssistantToggle = true,
  assistantOpened,
  onToggleAssistant,
  computedColorScheme,
  onToggleColorScheme,
}: TopCommandBarProps) {
  const { center } = useHeaderCenter();

  return (
    <Box className="top-command-bar">
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
      </Box>

      <Box className="top-command-bar-center">
        {center}
      </Box>

      <Group className="top-command-bar-right" gap="sm" justify="flex-end" wrap="nowrap">
        {showSearch && (
          <Tooltip label={<Group gap={4}><span>Search</span><Kbd size="xs">Ctrl+K</Kbd></Group>}>
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => spotlight.open()}
              aria-label="Open search"
            >
              <IconSearch size={18} />
            </ActionIcon>
          </Tooltip>
        )}
        {showAssistantToggle && (
          <Tooltip label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}>
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={onToggleAssistant}
              aria-label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
            >
              <AiAssistantIcon
                size={20}
                style={{
                  filter: assistantOpened
                    ? `drop-shadow(0 0 8px ${styleTokens.accents.assistantGlow})`
                    : undefined,
                }}
              />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label={computedColorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <ActionIcon
            variant="subtle"
            size="md"
            onClick={onToggleColorScheme}
            aria-label="Toggle color scheme"
          >
            {computedColorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}
