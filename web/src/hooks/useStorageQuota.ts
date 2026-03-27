import { useCallback, useEffect, useState } from 'react';

import { platformApiFetch } from '@/lib/platformApi';

export type StorageQuota = {
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
};

type StorageQuotaState = {
  loading: boolean;
  data: StorageQuota | null;
  error: string | null;
};

export function useStorageQuota() {
  const [state, setState] = useState<StorageQuotaState>({
    loading: true,
    data: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await platformApiFetch('/storage/quota');
      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Failed to load quota: ${response.status}`);
      }

      const data = await response.json() as StorageQuota;
      setState({
        loading: false,
        data,
        error: null,
      });
    } catch (error) {
      setState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to load quota',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
