import { Navigate, Outlet } from 'react-router-dom';
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

// Mirror the auth bypass flag from AuthGuard — when auth is bypassed,
// superuser gating is also bypassed so the page is accessible in dev.
// Off by default. Set VITE_AUTH_BYPASS=true in .env.local to enable.
const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

type SurfaceKey = 'blockdataAdmin' | 'agchainAdmin' | 'superuser';

function hasSurfaceAccess(
  access: { blockdataAdmin: boolean; agchainAdmin: boolean; superuser: boolean } | null,
  surface: SurfaceKey | 'anyAdmin',
) {
  if (!access) return false;
  if (surface === 'anyAdmin') {
    return access.blockdataAdmin || access.agchainAdmin || access.superuser;
  }
  if (surface === 'blockdataAdmin') {
    return access.blockdataAdmin || access.superuser;
  }
  if (surface === 'agchainAdmin') {
    return access.agchainAdmin || access.superuser;
  }
  return access.superuser;
}

function AdminSurfaceGuard({ surface }: { surface: SurfaceKey | 'anyAdmin' }) {
  const { access, status, refresh } = useAdminSurfaceAccessState();

  if (AUTH_BYPASS_ENABLED) {
    return <Outlet />;
  }

  if ((status === 'loading' || status === 'idle') && access === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  if (hasSurfaceAccess(access, surface)) {
    return <Outlet />;
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">Unable to verify admin access right now.</p>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasSurfaceAccess(access, surface)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

export function SuperuserGuard() {
  return <AdminSurfaceGuard surface="anyAdmin" />;
}

export function SuperuserOnlyGuard() {
  return <AdminSurfaceGuard surface="superuser" />;
}

export function BlockdataAdminGuard() {
  return <AdminSurfaceGuard surface="blockdataAdmin" />;
}

export function AgchainAdminGuard() {
  return <AdminSurfaceGuard surface="agchainAdmin" />;
}
