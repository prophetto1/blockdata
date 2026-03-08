import { Navigate, Outlet } from 'react-router-dom';
import { useSuperuserProbe } from '@/hooks/useSuperuserProbe';

// Mirror the auth bypass flag from AuthGuard — when auth is bypassed,
// superuser gating is also bypassed so the page is accessible in dev.
const AUTH_BYPASS_ENABLED = true;

export function SuperuserGuard() {
  const isSuperuser = useSuperuserProbe();

  if (AUTH_BYPASS_ENABLED) {
    return <Outlet />;
  }

  if (isSuperuser === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  if (!isSuperuser) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
