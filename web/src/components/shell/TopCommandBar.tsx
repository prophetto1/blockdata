import { ActionIcon, Burger, Button, Group, Text, TextInput, Tooltip } from '@mantine/core';
import { IconMoon, IconSearch, IconSun } from '@tabler/icons-react';

type TopCommandBarProps = {
  navOpened: boolean;
  onToggleNav: () => void;
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
  showSearch = true,
  showAssistantToggle = true,
  assistantOpened,
  onToggleAssistant,
  computedColorScheme,
  onToggleColorScheme,
  userLabel,
  onSignOut,
}: TopCommandBarProps) {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="sm">
        <Burger opened={navOpened} onClick={onToggleNav} hiddenFrom="sm" size="sm" />
        <Group gap={8}>
          <img src="/icon-64.png" alt="" width={28} height={28} />
          <Text fw={700} size="lg">BlockData</Text>
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
