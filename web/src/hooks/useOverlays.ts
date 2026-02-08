import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { BlockOverlayRow } from '@/lib/types';

export function useOverlays(runId: string | null) {
  const [overlayMap, setOverlayMap] = useState<Map<string, BlockOverlayRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!runId) {
      setOverlayMap(new Map());
      return;
    }

    setLoading(true);
    setError(null);

    // Initial fetch
    supabase
      .from(TABLES.overlays)
      .select('*')
      .eq('run_id', runId)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          const map = new Map<string, BlockOverlayRow>();
          for (const row of (data ?? []) as BlockOverlayRow[]) {
            map.set(row.block_uid, row);
          }
          setOverlayMap(map);
        }
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`overlays-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.overlays,
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as BlockOverlayRow;
          if (row?.block_uid) {
            setOverlayMap((prev) => {
              const next = new Map(prev);
              next.set(row.block_uid, row);
              return next;
            });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [runId]);

  return { overlayMap, loading, error };
}
