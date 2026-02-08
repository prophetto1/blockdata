import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { BlockRow } from '@/lib/types';

export function useBlocks(convUid: string | null, pageIndex: number, pageSize: number) {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!convUid) { setBlocks([]); setTotalCount(0); return; }
    setLoading(true);
    setError(null);
    try {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;
      const { data, error: err, count } = await supabase
        .from(TABLES.blocks)
        .select('block_uid, conv_uid, block_index, block_type, block_locator, block_content', { count: 'exact' })
        .eq('conv_uid', convUid)
        .order('block_index', { ascending: true })
        .range(from, to);

      if (err) throw err;
      setBlocks((data ?? []) as BlockRow[]);
      setTotalCount(count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [convUid, pageIndex, pageSize]);

  useEffect(() => { fetch(); }, [fetch]);

  return { blocks, totalCount, loading, error, refetch: fetch };
}
