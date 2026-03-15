import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ReadinessState = {
  isReady: boolean;
  reasons: string[];
  loading: boolean;
  error: string | null;
};

export function useExtractRuntimeReadiness() {
  const [state, setState] = useState<ReadinessState>({
    isReady: false,
    reasons: [],
    loading: true,
    error: null,
  });

  const check = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('extract-readiness');
      if (error) {
        setState({ isReady: false, reasons: [], loading: false, error: error.message });
        return;
      }
      const result = data as { is_ready: boolean; reasons: string[] };
      setState({
        isReady: result.is_ready,
        reasons: result.reasons,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        isReady: false,
        reasons: [],
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return { ...state, recheck: check };
}
