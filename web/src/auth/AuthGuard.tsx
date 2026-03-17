import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Auth bypass for local development. Set VITE_AUTH_BYPASS=true in .env.local to enable.
const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

export function AuthGuard() {
  const { session, loading } = useAuth();

  if (AUTH_BYPASS_ENABLED) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
