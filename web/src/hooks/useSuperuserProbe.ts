import { useEffect, useState } from 'react';
import { edgeFetch } from '@/lib/edge';

/** Module-level cache so re-mounts don't re-probe */
let cached: boolean | null = null;

/**
 * Probes the admin-config endpoint to determine if the current user
 * is a superuser. Returns `null` while loading, then `true`/`false`.
 * Result is cached for the lifetime of the page.
 */
export function useSuperuserProbe(): boolean | null {
  const [isSuperuser, setIsSuperuser] = useState<boolean | null>(cached);

  useEffect(() => {
    if (cached !== null) return;
    let cancelled = false;
    edgeFetch('admin-config?audit_limit=0', { method: 'GET' })
      .then((resp) => {
        if (!cancelled) {
          cached = resp.ok;
          setIsSuperuser(resp.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          cached = false;
          setIsSuperuser(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return isSuperuser;
}
