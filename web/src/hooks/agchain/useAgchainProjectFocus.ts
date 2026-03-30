import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAgchainBenchmarks, type AgchainBenchmarkListRow } from '@/lib/agchainBenchmarks';
import {
  AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT,
  AGCHAIN_PROJECT_FOCUS_STORAGE_KEY,
  AGCHAIN_PROJECT_LIST_CHANGED_EVENT,
  readStoredAgchainProjectFocusSlug,
  setStoredAgchainProjectFocusSlug,
  writeStoredAgchainProjectFocusSlug,
} from '@/lib/agchainProjectFocus';
const DEFAULT_LIMIT = 50;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export { AGCHAIN_PROJECT_FOCUS_STORAGE_KEY };

export function useAgchainProjectFocus() {
  const [items, setItems] = useState<AgchainBenchmarkListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedProjectSlug, setFocusedProjectSlugState] = useState<string | null>(() => readStoredAgchainProjectFocusSlug());

  const loadItems = useCallback(async (preferredSlug?: string | null) => {
    setLoading(true);
    try {
      const nextPage = await fetchAgchainBenchmarks(DEFAULT_LIMIT, 0);
      const nextItems = nextPage.items;
      const storedSlug = preferredSlug ?? readStoredAgchainProjectFocusSlug();
      const resolvedFocus = storedSlug && nextItems.some((item) => item.benchmark_slug === storedSlug)
        ? storedSlug
        : nextItems[0]?.benchmark_slug ?? null;

      setItems(nextItems);
      setFocusedProjectSlugState(resolvedFocus);
      writeStoredAgchainProjectFocusSlug(resolvedFocus);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const handleFocusChanged = (event: Event) => {
      const nextSlug = (event as CustomEvent<{ focusedProjectSlug?: string | null }>).detail?.focusedProjectSlug ?? null;
      setFocusedProjectSlugState(nextSlug);
    };

    window.addEventListener(AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT, handleFocusChanged);
    return () => window.removeEventListener(AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT, handleFocusChanged);
  }, []);

  useEffect(() => {
    const handleProjectListChanged = (event: Event) => {
      const nextSlug = (event as CustomEvent<{ focusedProjectSlug?: string | null }>).detail?.focusedProjectSlug
        ?? readStoredAgchainProjectFocusSlug();
      setFocusedProjectSlugState(nextSlug ?? null);
      void loadItems(nextSlug ?? null);
    };

    window.addEventListener(AGCHAIN_PROJECT_LIST_CHANGED_EVENT, handleProjectListChanged);
    return () => window.removeEventListener(AGCHAIN_PROJECT_LIST_CHANGED_EVENT, handleProjectListChanged);
  }, [loadItems]);

  const setFocusedProjectSlug = useCallback((slug: string | null) => {
    setFocusedProjectSlugState(slug);
    setStoredAgchainProjectFocusSlug(slug);
  }, []);

  const focusedProject = useMemo(
    () => items.find((item) => item.benchmark_slug === focusedProjectSlug) ?? null,
    [focusedProjectSlug, items],
  );

  return {
    items,
    loading,
    error,
    focusedProjectSlug,
    focusedProject,
    setFocusedProjectSlug,
    reload: () => loadItems(focusedProjectSlug),
  };
}
