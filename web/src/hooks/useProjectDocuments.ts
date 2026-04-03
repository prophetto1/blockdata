import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

export function useProjectDocuments(projectId: string | null) {
  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const hasConvertingRef = useRef(false);

  const loadDocs = useCallback(async (pid: string, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const all = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId: pid,
        select: '*',
      });
      setDocs(all);
      if (!silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
        setDocs([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Load on project change
  useEffect(() => {
    if (!projectId) {
      setDocs([]);
      setSelected(new Set());
      return;
    }
    void loadDocs(projectId);
  }, [projectId, loadDocs]);

  // Realtime subscription for status updates, deletes, and inserts
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`docs-status-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_documents',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.document_surface === 'pipeline-services') return;
          setDocs((prev) =>
            prev.map((d) =>
              d.source_uid === updated.source_uid
                ? { ...d, ...updated }
                : d,
            ),
          );
          // When a doc transitions to parsed, refetch to get joined view columns
          // (conv_total_blocks, conv_uid, etc.) that aren't in the realtime payload.
          if (updated.status === 'parsed') {
            void loadDocs(projectId, true);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'source_documents',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          if (deleted?.document_surface === 'pipeline-services') return;
          const deletedUid = deleted?.source_uid;
          if (deletedUid) {
            setDocs((prev) => prev.filter((d) => d.source_uid !== deletedUid));
            setSelected((prev) => {
              if (!prev.has(deletedUid)) return prev;
              const next = new Set(prev);
              next.delete(deletedUid);
              return next;
            });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'source_documents',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if ((payload.new as any)?.document_surface === 'pipeline-services') return;
          // Refetch to get the full joined view row for the new document.
          void loadDocs(projectId, true);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadDocs]);

  // Keep ref in sync so the polling effect doesn't depend on docs directly.
  useEffect(() => {
    hasConvertingRef.current = docs.some((d) => d.status === 'converting');
  }, [docs]);

  // Polling fallback: refetch docs while any are in a transitional state.
  // Realtime should handle updates, but polling ensures the UI reflects
  // status changes even if the Realtime connection drops.
  // Uses a ref for the converting check to avoid resetting the interval
  // every time docs change.
  useEffect(() => {
    if (!projectId) return;

    const interval = setInterval(() => {
      if (hasConvertingRef.current) {
        void loadDocs(projectId, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, loadDocs]);

  const refreshDocs = useCallback(() => {
    if (projectId) void loadDocs(projectId);
  }, [projectId, loadDocs]);

  const toggleSelect = useCallback((uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === docs.length
        ? new Set<string>()
        : new Set(docs.map((d) => d.source_uid)),
    );
  }, [docs]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const allSelected = docs.length > 0 && selected.size === docs.length;
  const someSelected = selected.size > 0 && selected.size < docs.length;

  const selectedDocs = useMemo(
    () => docs.filter((d) => selected.has(d.source_uid)),
    [docs, selected],
  );

  return {
    docs,
    loading,
    error,
    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    allSelected,
    someSelected,
    selectedDocs,
    refreshDocs,
  };
}
