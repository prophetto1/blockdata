import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErrorAlert } from '@/components/common/ErrorAlert';
import { platformApiFetch } from '@/lib/platformApi';

type ProvisioningRow = {
  user_id: string;
  email: string | null;
  created_at: string | null;
  has_auth_user: boolean;
  has_default_project: boolean;
  default_project_id: string | null;
  has_storage_quota: boolean;
  quota_bytes: number | null;
  used_bytes: number | null;
  reserved_bytes: number | null;
  status: 'ok' | 'incomplete';
};

export function Component() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProvisioningRow[]>([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await platformApiFetch('/admin/storage/provisioning/recent?limit=50');
      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Provisioning fetch failed: ${response.status}`);
      }

      const data = await response.json() as { items?: ProvisioningRow[] };
      setRows(data.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load provisioning monitor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const incompleteCount = useMemo(
    () => rows.filter((row) => row.status !== 'ok').length,
    [rows],
  );

  return (
    <div className="h-full min-h-0 overflow-hidden p-4">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Signup Provisioning</h2>
            <p className="text-xs text-muted-foreground">
              Confirms each recent signup has an auth user, Default Project, and storage quota row.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            onClick={() => { void loadRows(); }}
          >
            Refresh
          </button>
        </div>

        {error ? <ErrorAlert message={error} /> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading provisioning monitor...</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{rows.length} recent signups</span>
              <span>{incompleteCount} incomplete</span>
            </div>

            <div className="overflow-hidden rounded-md border border-border">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Default Project</th>
                    <th className="px-3 py-2 font-medium">Quota Row</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.user_id} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{row.email ?? row.user_id}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.created_at ?? '--'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.has_default_project ? 'Present' : 'Missing'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.has_storage_quota ? 'Present' : 'Missing'}</td>
                      <td className="px-3 py-2">
                        <span className={row.status === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
