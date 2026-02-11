import { Box, Button, Group, Text } from '@mantine/core';

type AssistantDockHostProps = {
  onClose: () => void;
};

export function AssistantDockHost({ onClose }: AssistantDockHostProps) {
  return (
    <Box mt="xs">
      <Group justify="space-between" align="center">
        <Text fw={700} size="sm">Assistant</Text>
        <Button variant="subtle" size="compact-xs" onClick={onClose}>
          Close
        </Button>
      </Group>
      <Text size="xs" c="dimmed" mt="xs">
        Internal platform assistant surface. Worker run execution remains a separate AI path.
      </Text>
    </Box>
  );
}
