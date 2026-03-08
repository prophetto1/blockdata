import type { ReactNode } from 'react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

type Props = {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ title, subtitle, children }: Props) {
  void subtitle;
  useShellHeaderTitle({ title });

  if (!children) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
      {children}
    </div>
  );
}
