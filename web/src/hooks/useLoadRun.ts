import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { platformApiFetch } from '@/lib/platformApi';

type ServiceFunction = {
  function_id: string;
  function_name: string;
  function_type: string;
  bd_stage: string;
  label: string;
  description: string | null;
  service_name: string;
  execution_plane: string;
};

type Connection = {
  id: string;
  provider: string;
  connection_type: string;
  status: string;
  metadata_jsonb: Record<string, unknown> | null;
};

type RunItem = {
  item_id: string;
  item_key: string;
  status: string;
  rows_written: number;
  rows_failed: number;
  error_message: string | null;
};

type LoadRun = {
  run_id: string;
  status: string;
  rows_affected: number | null;
  config_snapshot: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
};

export function useLoadRun() {
  const [sourceFunctions, setSourceFunctions] = useState<ServiceFunction[]>([]);
  const [destFunctions, setDestFunctions] = useState<ServiceFunction[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<LoadRun | null>(null);
  const [runItems, setRunItems] = useState<RunItem[]>([]);
  const [stepping, setStepping] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: srcData } = await supabase
          .from('service_functions_view')
          .select('function_id, function_name, function_type, bd_stage, label, description, service_name, execution_plane')
          .eq('bd_stage', 'source')
          .eq('execution_plane', 'fastapi');
        setSourceFunctions(srcData ?? []);

        const { data: dstData } = await supabase
          .from('service_functions_view')
          .select('function_id, function_name, function_type, bd_stage, label, description, service_name, execution_plane')
          .eq('bd_stage', 'destination')
          .eq('execution_plane', 'fastapi');
        setDestFunctions(dstData ?? []);

        const resp = await platformApiFetch('/connections');
        if (resp.ok) {
          const data = await resp.json();
          setConnections((data.connections ?? []).filter((c: Connection) => c.status === 'connected'));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!activeRun) return;

    const runChannel = supabase
      .channel(`run-${activeRun.run_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_runs',
        filter: `run_id=eq.${activeRun.run_id}`,
      }, (payload) => {
        setActiveRun((prev) => prev ? { ...prev, ...payload.new } as LoadRun : null);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_run_items',
        filter: `run_id=eq.${activeRun.run_id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRunItems((prev) => [...prev, payload.new as RunItem]);
        } else if (payload.eventType === 'UPDATE') {
          setRunItems((prev) =>
            prev.map((item) =>
              item.item_id === (payload.new as RunItem).item_id ? (payload.new as RunItem) : item,
            ),
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(runChannel);
    };
  }, [activeRun?.run_id]);

  const submitLoad = useCallback(async (params: {
    source_function_name: string;
    source_download_function: string;
    source_connection_id: string;
    dest_function_name: string;
    dest_connection_id: string;
    project_id?: string;
    config: Record<string, unknown>;
  }) => {
    setError(null);
    setSubmitting(true);
    try {
      const resp = await platformApiFetch('/load-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error ?? err.detail ?? `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setActiveRun({
        run_id: data.run_id,
        status: data.status,
        rows_affected: data.total_items,
        config_snapshot: params.config,
        started_at: null,
        completed_at: null,
      });
      setRunItems([]);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const stepLoad = useCallback(async () => {
    if (!activeRun) return;
    setStepping(true);
    setError(null);
    try {
      const resp = await platformApiFetch(`/load-runs/${activeRun.run_id}/step`, {
        method: 'POST',
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error ?? err.detail ?? `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.status) {
        setActiveRun((prev) => prev ? { ...prev, status: data.status } : null);
      }
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStepping(false);
    }
  }, [activeRun]);

  const loadRunDetails = useCallback(async (runId: string) => {
    try {
      const resp = await platformApiFetch(`/load-runs/${runId}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setActiveRun(data.run);
      setRunItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const reset = useCallback(() => {
    setActiveRun(null);
    setRunItems([]);
    setError(null);
  }, []);

  return {
    sourceFunctions,
    destFunctions,
    connections,
    loading,
    submitting,
    stepping,
    error,
    activeRun,
    runItems,
    submitLoad,
    stepLoad,
    loadRunDetails,
    reset,
  };
}
