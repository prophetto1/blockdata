import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

/**
 * Probes the admin-config endpoint to determine if the current user
 * is a superuser. Returns `null` while loading, then `true`/`false`.
 * Re-probes when the authenticated user changes.
 */
export function useSuperuserProbe(): boolean | null {
  const { access, status } = useAdminSurfaceAccessState();

  if (status === 'loading' || status === 'idle') {
    return null;
  }

  return Boolean(access?.superuser);
}
