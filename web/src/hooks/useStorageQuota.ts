import { useEffect, useState } from 'react';

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

const listeners = new Set<(state: StorageQuotaState) => void>();

let sharedState: StorageQuotaState = {
  loading: true,
  data: null,
  error: null,
};

let hasRequestedQuota = false;
let refreshInFlight: Promise<void> | null = null;

function emitStorageQuota() {
  for (const listener of listeners) {
    listener(sharedState);
  }
}

async function refreshStorageQuota() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  hasRequestedQuota = true;
  sharedState = {
    ...sharedState,
    loading: true,
    error: null,
  };
  emitStorageQuota();

  refreshInFlight = (async () => {
    try {
      const response = await platformApiFetch('/storage/quota');
      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Failed to load quota: ${response.status}`);
      }

      const data = await response.json() as StorageQuota;
      sharedState = {
        loading: false,
        data,
        error: null,
      };
    } catch (error) {
      sharedState = {
        loading: false,
        data: sharedState.data,
        error: error instanceof Error ? error.message : 'Failed to load quota',
      };
    } finally {
      refreshInFlight = null;
      emitStorageQuota();
    }
  })();

  return refreshInFlight;
}

export function useStorageQuota() {
  const [state, setState] = useState<StorageQuotaState>(sharedState);

  useEffect(() => {
    listeners.add(setState);
    if (!hasRequestedQuota) {
      void refreshStorageQuota();
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    refresh: refreshStorageQuota,
  };
}
