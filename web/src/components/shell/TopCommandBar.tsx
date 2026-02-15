import { ActionIcon, Group, Kbd, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconMenu2, IconMoon, IconSearch, IconSun } from '@tabler/icons-react';
import { spotlight } from '@mantine/spotlight';
import { useNavigate } from 'react-router-dom';
import { AiAssistantIcon } from '@/components/icons/AiAssistantIcon';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';

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
  onToggleDesktopNav,
  showSearch = true,
  showAssistantToggle = true,
  assistantOpened,
  onToggleAssistant,
  computedColorScheme,
  onToggleColorScheme,
}: TopCommandBarProps) {
  const navigate = useNavigate();
  void navigate; // used by Spotlight actions defined in AppLayout
  const { center } = useHeaderCenter();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="sm">
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
        <Tooltip label="Toggle navigation">
          <ActionIcon
            visibleFrom="sm"
            size="md"
            variant="subtle"
            aria-label="Toggle navigation"
            onClick={onToggleDesktopNav ?? onToggleNav}
          >
            <IconMenu2 size={18} />
          </ActionIcon>
        </Tooltip>
        <Group gap={8}>
          <UnstyledButton
            type="button"
            onClick={() => navigate('/app')}
            aria-label="Go to workspace home"
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <Text fw={800} fz={21} style={{ letterSpacing: '-0.02em' }}>
              BlockData
            </Text>
          </UnstyledButton>
        </Group>
      </Group>

      {center}

      <Group gap="sm">
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
                    ? 'drop-shadow(0 0 8px rgba(255, 77, 109, 0.25))'
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
    </Group>
  );
}
