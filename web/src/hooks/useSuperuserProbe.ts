import { useEffect, useState } from 'react';
import { edgeFetch } from '@/lib/edge';
import { useAuth } from '@/auth/AuthContext';

/**
 * Probes the admin-config endpoint to determine if the current user
 * is a superuser. Returns `null` while loading, then `true`/`false`.
 * Re-probes when the authenticated user changes.
 */
export function useSuperuserProbe(): boolean | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isSuperuser, setIsSuperuser] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsSuperuser(null);
      return;
    }

    let cancelled = false;
    edgeFetch('admin-config?audit_limit=0', { method: 'GET' })
      .then((resp) => {
        if (!cancelled) setIsSuperuser(resp.ok);
      })
      .catch(() => {
        if (!cancelled) setIsSuperuser(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  return isSuperuser;
}