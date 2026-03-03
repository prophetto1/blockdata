import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Temporary bypass: disable auth-gated routing until auth is rewired.
const AUTH_BYPASS_ENABLED = true;

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
