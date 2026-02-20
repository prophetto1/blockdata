import type { ReactNode } from 'react';
import { Box } from '@mantine/core';
import { styleTokens } from '@/lib/styleTokens';

type AppPageShellMode = 'fluid' | 'constrained';

type AppPageShellProps = {
  children: ReactNode;
  mode?: AppPageShellMode;
};

export function AppPageShell({ children, mode = 'fluid' }: AppPageShellProps) {
  const constrained = mode === 'constrained';
  const outerClassName = constrained ? 'app-page-shell app-page-shell--constrained' : 'app-page-shell';
  const innerClassName = constrained
    ? 'app-page-shell-inner app-page-shell-inner--constrained'
    : 'app-page-shell-inner';

  return (
    <Box className={outerClassName}>
      <Box
        className={innerClassName}
        style={
          constrained
            ? {
                maxWidth: styleTokens.shell.contentMaxWidth,
                gap: styleTokens.shell.pageGap,
                paddingBottom: styleTokens.shell.pageBottomPadding,
              }
            : undefined
        }
      >
        {children}
      </Box>
    </Box>
  );
}
