import { useEffect, useState } from 'react';
import {
  isPlatformApiDevRecoveryEnabled,
  loadPlatformApiDevRecoveryStatus,
  recoverPlatformApi,
  type PlatformApiDevRecoveryResult,
  type PlatformApiDevStatus,
} from '@/lib/platformApiDevRecovery';

type UsePlatformApiDevRecoveryOptions = {
  enabled?: boolean;
  onRecovered?: () => Promise<void> | void;
};

type UsePlatformApiDevRecoveryState = {
  enabled: boolean;
  loading: boolean;
  recovering: boolean;
  error: string | null;
  status: PlatformApiDevStatus | null;
  lastRecovery: PlatformApiDevRecoveryResult | null;
  refreshStatus: () => Promise<void>;
  recover: () => Promise<void>;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function usePlatformApiDevRecovery(
  options: UsePlatformApiDevRecoveryOptions = {},
): UsePlatformApiDevRecoveryState {
  const enabled = options.enabled ?? isPlatformApiDevRecoveryEnabled();
  const [loading, setLoading] = useState(enabled);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PlatformApiDevStatus | null>(null);
  const [lastRecovery, setLastRecovery] = useState<PlatformApiDevRecoveryResult | null>(null);

  async function refreshStatus() {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextStatus = await loadPlatformApiDevRecoveryStatus();
      setStatus(nextStatus);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  async function recover() {
    if (!enabled) {
      return;
    }

    setRecovering(true);
    setError(null);

    try {
      const nextRecovery = await recoverPlatformApi();
      setLastRecovery(nextRecovery);
      setStatus(nextRecovery.state);

      if (nextRecovery.ok && options.onRecovered) {
        await options.onRecovered();
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setRecovering(false);
    }
  }

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void refreshStatus();
  }, [enabled]);

  return {
    enabled,
    loading,
    recovering,
    error,
    status,
    lastRecovery,
    refreshStatus,
    recover,
  };
}
