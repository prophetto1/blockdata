import {
  ActionIcon,
  Box,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowsLeftRight,
  IconChevronDown,
  IconDotsVertical,
  IconSettings,
  IconExternalLink,
  IconMicrophone,
  IconPlus,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import './AssistantDockHost.css';

type AssistantDockHostProps = {
  onClose: () => void;
  onDetach?: () => void;
  detached?: boolean;
  onToggleSide?: () => void;
  side?: 'left' | 'right';
};

export function AssistantDockHost({
  onClose,
  onDetach,
  detached = false,
  onToggleSide,
  side = 'right',
}: AssistantDockHostProps) {
  const sharedTabs: Array<{ label: string; description: string }> = [];

  return (
    <Box className={`assistant-dock-host${detached ? ' is-detached' : ''}`}>
      <Box className="assistant-dock-shell">
        <Group className="assistant-dock-header" justify="space-between" align="center" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            {onToggleSide && !detached && (
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={side === 'right' ? 'Move assistant to left' : 'Move assistant to right'}
                onClick={onToggleSide}
              >
                <IconArrowsLeftRight size={16} stroke={1.8} />
              </ActionIcon>
            )}
            {onDetach && (
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={detached ? 'Attach to sidebar' : 'Detach assistant panel'}
                onClick={onDetach}
              >
                <IconExternalLink size={16} stroke={1.8} />
              </ActionIcon>
            )}
            <Text className="assistant-dock-title" fw={700}>
              Assistant
            </Text>
          </Group>
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Settings">
              <ActionIcon variant="light" size="sm" aria-label="Settings">
                <IconSettings size={16} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon variant="subtle" size="sm" aria-label="Assistant options">
              <IconDotsVertical size={16} stroke={1.8} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" aria-label="Close assistant" onClick={onClose}>
              <IconX size={16} stroke={1.8} />
            </ActionIcon>
          </Group>
        </Group>

        <ScrollArea className="assistant-dock-scroll" scrollbarSize={8} type="auto">
          <Stack className="assistant-dock-thread" gap="md">
            <UnstyledButton className="assistant-dock-thinking-toggle">
              <Group gap={6} wrap="nowrap">
                <IconSparkles size={14} />
                <Text size="sm" fw={600}>Show thinking</Text>
              </Group>
              <IconChevronDown size={14} />
            </UnstyledButton>

            {sharedTabs.length > 0 && (
              <Paper className="assistant-dock-shared-tabs" p="sm" radius="md">
                <Group justify="space-between" align="center" mb={8}>
                  <Text fw={700} size="sm">Sharing {sharedTabs.length} tabs</Text>
                  <IconChevronDown size={14} />
                </Group>
                <Stack gap={4}>
                  {sharedTabs.map(({ label, description }) => (
                    <Group className="assistant-dock-tab-row" key={label} justify="space-between" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <Text size="sm" className="assistant-dock-tab-label">
                          {label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {description}
                        </Text>
                      </Group>
                      <ActionIcon variant="transparent" size="xs" aria-label={`Remove ${label}`}>
                        <IconX size={12} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        </ScrollArea>

        <Box className="assistant-dock-composer">
          <TextInput
            classNames={{ input: 'assistant-dock-composer-input' }}
            placeholder="Type @ to ask about a tab"
          />
          <Group justify="space-between" mt={8} wrap="nowrap">
            <ActionIcon variant="subtle" size="md" aria-label="Add context">
              <IconPlus size={18} />
            </ActionIcon>
            <Group gap={6} wrap="nowrap">
              <UnstyledButton className="assistant-dock-model-pill">
                <Text size="sm" fw={600}>Pro</Text>
                <IconChevronDown size={14} />
              </UnstyledButton>
              <ActionIcon variant="subtle" size="md" aria-label="Voice input">
                <IconMicrophone size={17} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>
      </Box>
    </Box>
  );
}
