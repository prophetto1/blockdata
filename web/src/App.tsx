import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { UIProvider } from '@/components/ui/provider';
import { router } from './router';
import 'react-data-grid/lib/styles.css';
import './tailwind.css';
import './theme.css';

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </UIProvider>
  );
}
