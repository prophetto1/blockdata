import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

/**
 * Reads the shared admin-surface access store and returns the current
 * superuser flag. Returns `null` while access verification is unresolved.
 */
export function useSuperuserProbe(): boolean | null {
  const { access, status } = useAdminSurfaceAccessState();

  if ((status === 'loading' || status === 'idle' || status === 'error') && access === null) {
    return null;
  }

  return Boolean(access?.superuser);
}
