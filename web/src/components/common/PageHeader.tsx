import type { ReactNode } from 'react';
import { Group, Title, Text } from '@mantine/core';

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <Group justify="space-between" align="flex-start" mb="lg">
      <div>
        <Title order={2}>{title}</Title>
        {subtitle && <Text size="sm" c="dimmed" mt={4}>{subtitle}</Text>}
      </div>
      {children && <Group gap="sm">{children}</Group>}
    </Group>
  );
}
