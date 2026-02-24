import type { ReactNode } from 'react';
import { ColorSchemeScript, MantineProvider } from '@/components/ui/primitives';
import { Notifications } from '@/components/ui/notifications';
import { cssVariablesResolver, theme } from '@/theme';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

type UIProviderProps = {
  children: ReactNode;
};

export function UIProvider({ children }: UIProviderProps) {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="dark" />
      <MantineProvider
        theme={theme}
        defaultColorScheme="dark"
        cssVariablesResolver={cssVariablesResolver}
      >
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </>
  );
}
