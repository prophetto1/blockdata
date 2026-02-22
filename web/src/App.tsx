import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { router } from './router';
import { theme, cssVariablesResolver } from './theme';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'react-data-grid/lib/styles.css';
import './theme.css';

export default function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="dark" />
      <MantineProvider
        theme={theme}
        defaultColorScheme="dark"
        cssVariablesResolver={cssVariablesResolver}
      >
        <Notifications position="top-right" />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </MantineProvider>
    </>
  );
}
