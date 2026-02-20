import type { ReactNode } from 'react';
import { Group } from '@mantine/core';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

type Props = {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ title, subtitle, children }: Props) {
  useShellHeaderTitle({ title, subtitle });

  if (!children) return null;

  return (
    <Group justify="flex-end" align="center" mb="md" gap="sm" wrap="wrap">
      {children}
    </Group>
  );
}
