import { useCallback, useMemo } from 'react';
import type { AgchainProjectRow } from '@/lib/agchainWorkspaces';
import {
  AGCHAIN_PROJECT_FOCUS_STORAGE_KEY,
  writeStoredAgchainWorkspaceFocus,
} from '@/lib/agchainProjectFocus';
import { useAgchainWorkspace, type AgchainWorkspaceStatus } from '@/contexts/AgchainWorkspaceContext';

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
  const ctx = useAgchainWorkspace();

  const items = useMemo(
    () => ctx.projects.map((project) => toFocusedProjectRow(project)),
    [ctx.projects],
  );

  const focusedProject = useMemo(
    () => (ctx.selectedProject ? toFocusedProjectRow(ctx.selectedProject) : null),
    [ctx.selectedProject],
  );

  const setFocusedProjectSlug = useCallback((slug: string | null) => {
    if (!slug) {
      ctx.setSelectedProjectId(null);
      return;
    }
    // Case 2 (ready): resolve slug against loaded projects
    const match = ctx.projects.find(
      (p) => p.project_slug === slug || p.primary_benchmark_slug === slug,
    );
    if (match) {
      ctx.setSelectedProjectId(match.project_id, match.project_slug);
      return;
    }
    // Case 1 (bootstrapping): write slug to localStorage for reconciliation pickup
    // Case 3 (ready, no match): no-op on provider state — slug is unknown in current org
    if (ctx.status === 'bootstrapping') {
      writeStoredAgchainWorkspaceFocus({
        focusedProjectSlug: slug,
      });
    }
  }, [ctx]);

  const focusedProjectSlug = focusedProject?.project_slug ?? null;

  return {
    items,
    loading: ctx.status === 'bootstrapping',
    error: ctx.error,
    status: ctx.status as AgchainWorkspaceStatus,
    focusedProjectSlug,
    focusedProject,
    setFocusedProjectSlug,
    reload: ctx.reload,
  };
}
