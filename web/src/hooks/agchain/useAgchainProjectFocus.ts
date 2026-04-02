import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgchainProjectRow } from '@/lib/agchainWorkspaces';
import {
  AGCHAIN_PROJECT_FOCUS_STORAGE_KEY,
  readStoredAgchainProjectFocusSlug,
} from '@/lib/agchainProjectFocus';
import { useAgchainWorkspaceContext } from '@/hooks/agchain/useAgchainWorkspaceContext';

export { AGCHAIN_PROJECT_FOCUS_STORAGE_KEY };

export type AgchainFocusedProjectRow = AgchainProjectRow & {
  benchmark_slug: string | null;
  benchmark_name: string;
  href: string;
};

function toFocusedProjectRow(project: AgchainProjectRow): AgchainFocusedProjectRow {
  return {
    ...project,
    benchmark_slug: project.primary_benchmark_slug ?? project.project_slug,
    benchmark_name: project.primary_benchmark_name ?? project.project_name,
    href: `/app/agchain/overview?project=${encodeURIComponent(project.project_slug)}`,
  };
}

export function useAgchainProjectFocus() {
  const {
    projects,
    loading,
    error,
    selectedProject,
    setSelectedProjectId,
    reload,
  } = useAgchainWorkspaceContext();
  const [pendingLegacySlug, setPendingLegacySlug] = useState<string | null>(() => readStoredAgchainProjectFocusSlug());

  useEffect(() => {
    if (selectedProject?.project_slug) {
      setPendingLegacySlug(selectedProject.project_slug);
      return;
    }
    if (loading) {
      setPendingLegacySlug(readStoredAgchainProjectFocusSlug());
      return;
    }
    setPendingLegacySlug(null);
  }, [loading, selectedProject?.project_slug]);

  const items = useMemo(
    () => projects.map((project) => toFocusedProjectRow(project)),
    [projects],
  );

  const focusedProject = useMemo(
    () => (selectedProject ? toFocusedProjectRow(selectedProject) : null),
    [selectedProject],
  );

  const setFocusedProjectSlug = useCallback((slug: string | null) => {
    const match = projects.find((project) => project.project_slug === slug || project.primary_benchmark_slug === slug);
    setPendingLegacySlug(slug);
    setSelectedProjectId(match?.project_id ?? null, match?.project_slug ?? slug);
  }, [projects, setSelectedProjectId]);

  const focusedProjectSlug = focusedProject?.project_slug ?? pendingLegacySlug;

  return {
    items,
    loading,
    error,
    focusedProjectSlug,
    focusedProject,
    setFocusedProjectSlug,
    reload,
  };
}
