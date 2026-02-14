import { ActionIcon, Burger, Button, Group, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconMoon, IconSearch, IconSun } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

type TopCommandBarProps = {
  navOpened: boolean;
  onToggleNav: () => void;
  desktopNavOpened: boolean;
  onToggleDesktopNav: () => void;
  showSearch?: boolean;
  showAssistantToggle?: boolean;
  assistantOpened: boolean;
  onToggleAssistant: () => void;
  computedColorScheme: 'dark' | 'light';
  onToggleColorScheme: () => void;
  userLabel?: string;
  onSignOut: () => void | Promise<void>;
};

export function TopCommandBar({
  navOpened,
  onToggleNav,
  desktopNavOpened,
  onToggleDesktopNav,
  showSearch = true,
  showAssistantToggle = true,
  assistantOpened,
  onToggleAssistant,
  computedColorScheme,
  onToggleColorScheme,
  userLabel,
  onSignOut,
}: TopCommandBarProps) {
  const navigate = useNavigate();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="sm">
        <Burger opened={navOpened} onClick={onToggleNav} hiddenFrom="sm" size="sm" />
        <Tooltip label={desktopNavOpened ? 'Hide navigation' : 'Show navigation'}>
          <ActionIcon
            visibleFrom="sm"
            variant="subtle"
            size="md"
            onClick={onToggleDesktopNav}
            aria-label={desktopNavOpened ? 'Hide navigation' : 'Show navigation'}
          >
            {desktopNavOpened ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
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
        {showSearch && (
          <TextInput
            visibleFrom="md"
            size="xs"
            radius="xl"
            w={320}
            leftSection={<IconSearch size={14} />}
            placeholder="Search projects, schemas, runs..."
          />
        )}
      </Group>

      <Group gap="sm">
        {showAssistantToggle && (
          <Button variant="subtle" size="xs" onClick={onToggleAssistant}>
            {assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
          </Button>
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
        <Text size="sm" c="dimmed">
          {userLabel}
        </Text>
        <Button variant="subtle" size="xs" onClick={onSignOut}>
          Sign out
        </Button>
      </Group>
    </Group>
  );
}
