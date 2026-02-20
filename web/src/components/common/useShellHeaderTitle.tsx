import { useEffect, useMemo, type ReactNode } from 'react';
import { Text } from '@mantine/core';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';

type ShellHeaderTitleInput = {
  title: ReactNode;
  subtitle?: ReactNode;
};

export function useShellHeaderTitle({ title, subtitle }: ShellHeaderTitleInput) {
  void subtitle;
  const { setCenter } = useHeaderCenter();

  const centerNode = useMemo(
    () => (
      <div className="shell-header-title">
        <Text
          className="shell-header-title-main"
          title={typeof title === 'string' ? title : undefined}
        >
          {title}
        </Text>
      </div>
    ),
    [title],
  );

  useEffect(() => {
    setCenter(centerNode);
    return () => setCenter(null);
  }, [centerNode, setCenter]);
}
