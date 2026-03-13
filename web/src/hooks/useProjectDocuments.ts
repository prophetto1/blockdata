import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

export function useProjectDocuments(projectId: string | null) {
  const [docs, setDocs] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadDocs = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllProjectDocuments<ProjectDocumentRow>({
        projectId: pid,
        select: '*',
      });
      setDocs(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocs([]);
    } finally {
      setLoading(false);
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

  // Realtime subscription for status updates
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
          setDocs((prev) =>
            prev.map((d) =>
              d.source_uid === (payload.new as any).source_uid
                ? { ...d, ...(payload.new as any) }
                : d,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

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
