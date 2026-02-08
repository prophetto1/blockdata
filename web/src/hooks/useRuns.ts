import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { RunWithSchema } from '@/lib/types';

export function useRuns(convUid: string | null) {
  const [runs, setRuns] = useState<RunWithSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!convUid) { setRuns([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from(TABLES.runs)
        .select('*, schemas(schema_ref, schema_uid, schema_jsonb)')
        .eq('conv_uid', convUid)
        .order('started_at', { ascending: false });

      if (err) throw err;
      setRuns((data ?? []) as RunWithSchema[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [convUid]);

  useEffect(() => { fetch(); }, [fetch]);

  return { runs, loading, error, refetch: fetch };
}
