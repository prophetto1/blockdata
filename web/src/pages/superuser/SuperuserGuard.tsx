import { Navigate, Outlet } from 'react-router-dom';
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

// Mirror the auth bypass flag from AuthGuard — when auth is bypassed,
// superuser gating is also bypassed so the page is accessible in dev.
// Off by default. Set VITE_AUTH_BYPASS=true in .env.local to enable.
const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

type SurfaceKey = 'blockdataAdmin' | 'agchainAdmin' | 'superuser';

function AdminSurfaceGuard({ surface }: { surface: SurfaceKey }) {
  const { access, status } = useAdminSurfaceAccessState();

  if (AUTH_BYPASS_ENABLED) {
    return <Outlet />;
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  if (status === 'error' || !access?.[surface]) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

export function SuperuserGuard() {
  return <AdminSurfaceGuard surface="superuser" />;
}

export function BlockdataAdminGuard() {
  return <AdminSurfaceGuard surface="blockdataAdmin" />;
}

export function AgchainAdminGuard() {
  return <AdminSurfaceGuard surface="agchainAdmin" />;
}
