import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { UIProvider } from '@/components/ui/provider';
import { ThemeProvider } from '@/hooks/useTheme';
import { router } from './router';
import 'react-data-grid/lib/styles.css';
import './tailwind.css';
import './theme.css';

export default function App() {
  return (
    <UIProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </UIProvider>
  );
}
