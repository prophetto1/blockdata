import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { BlockOverlayRow } from '@/lib/types';

export function useOverlays(runId: string | null) {
  const [overlayMap, setOverlayMap] = useState<Map<string, BlockOverlayRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchOverlays = useCallback(async () => {
    if (!runId) {
      setOverlayMap(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from(TABLES.overlays)
      .select('*')
      .eq('run_id', runId);

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
  }, [runId]);

  const patchOverlay = useCallback((blockUid: string, updater: (overlay: BlockOverlayRow) => BlockOverlayRow) => {
    setOverlayMap((prev) => {
      const existing = prev.get(blockUid);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(blockUid, updater(existing));
      return next;
    });
  }, []);

  useEffect(() => {
    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!runId) {
      queueMicrotask(() => {
        setOverlayMap(new Map());
        setLoading(false);
        setError(null);
      });
      return;
    }

    queueMicrotask(() => {
      void fetchOverlays();
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
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as BlockOverlayRow;
            if (!oldRow?.block_uid) return;
            setOverlayMap((prev) => {
              const next = new Map(prev);
              next.delete(oldRow.block_uid);
              return next;
            });
            return;
          }

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
  }, [runId, fetchOverlays]);

  return { overlayMap, loading, error, refetch: fetchOverlays, patchOverlay };
}
