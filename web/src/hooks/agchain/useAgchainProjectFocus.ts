import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAgchainBenchmarks, type AgchainBenchmarkListRow } from '@/lib/agchainBenchmarks';

export const AGCHAIN_PROJECT_FOCUS_STORAGE_KEY = 'agchain.projectFocusSlug';
const DEFAULT_LIMIT = 50;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function readStoredProjectFocusSlug() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY);
}

function writeStoredProjectFocusSlug(slug: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (slug) {
    window.localStorage.setItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY, slug);
    return;
  }

  window.localStorage.removeItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY);
}

export function useAgchainProjectFocus() {
  const [items, setItems] = useState<AgchainBenchmarkListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedProjectSlug, setFocusedProjectSlugState] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const nextPage = await fetchAgchainBenchmarks(DEFAULT_LIMIT, 0);
      const nextItems = nextPage.items;
      const storedSlug = readStoredProjectFocusSlug();
      const preferredSlug = focusedProjectSlug ?? storedSlug;
      const resolvedFocus = preferredSlug && nextItems.some((item) => item.benchmark_slug === preferredSlug)
        ? preferredSlug
        : nextItems[0]?.benchmark_slug ?? null;

      setItems(nextItems);
      setFocusedProjectSlugState(resolvedFocus);
      writeStoredProjectFocusSlug(resolvedFocus);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [focusedProjectSlug]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const setFocusedProjectSlug = useCallback((slug: string) => {
    setFocusedProjectSlugState(slug);
    writeStoredProjectFocusSlug(slug);
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
    reload: loadItems,
  };
}
