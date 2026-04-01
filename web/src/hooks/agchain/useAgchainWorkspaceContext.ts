import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAgchainOrganizations,
  fetchAgchainProjects,
  type AgchainOrganizationRow,
  type AgchainProjectRow,
} from '@/lib/agchainWorkspaces';
import {
  AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT,
  AGCHAIN_PROJECT_LIST_CHANGED_EVENT,
  readStoredAgchainOrganizationFocusId,
  readStoredAgchainProjectFocusId,
  readStoredAgchainProjectFocusSlug,
  setStoredAgchainWorkspaceFocus,
  writeStoredAgchainWorkspaceFocus,
} from '@/lib/agchainProjectFocus';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function resolveSelectedProject(
  projects: AgchainProjectRow[],
  preferredProjectId?: string | null,
  preferredProjectSlug?: string | null,
) {
  if (preferredProjectId) {
    const exact = projects.find((item) => item.project_id === preferredProjectId);
    if (exact) {
      return exact;
    }
  }

  if (preferredProjectSlug) {
    const compatible = projects.find(
      (item) => item.project_slug === preferredProjectSlug || item.primary_benchmark_slug === preferredProjectSlug,
    );
    if (compatible) {
      return compatible;
    }
  }

  return projects[0] ?? null;
}

export function useAgchainWorkspaceContext() {
  const [organizations, setOrganizations] = useState<AgchainOrganizationRow[]>([]);
  const [projects, setProjects] = useState<AgchainProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(
    () => readStoredAgchainOrganizationFocusId(),
  );
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(() => readStoredAgchainProjectFocusId());

  const loadWorkspace = useCallback(async (preferred?: {
    organizationId?: string | null;
    projectId?: string | null;
    projectSlug?: string | null;
  }) => {
    setLoading(true);
    try {
      const organizationsResponse = await fetchAgchainOrganizations();
      const nextOrganizations = organizationsResponse.items;
      const resolvedOrganizationId = preferred?.organizationId
        ?? readStoredAgchainOrganizationFocusId()
        ?? nextOrganizations[0]?.organization_id
        ?? null;

      const nextProjects = resolvedOrganizationId
        ? (await fetchAgchainProjects({ organizationId: resolvedOrganizationId })).items
        : [];
      const resolvedProject = resolveSelectedProject(
        nextProjects,
        preferred?.projectId ?? readStoredAgchainProjectFocusId(),
        preferred?.projectSlug ?? readStoredAgchainProjectFocusSlug(),
      );

      setOrganizations(nextOrganizations);
      setProjects(nextProjects);
      setSelectedOrganizationIdState(resolvedOrganizationId);
      setSelectedProjectIdState(resolvedProject?.project_id ?? null);
      writeStoredAgchainWorkspaceFocus({
        focusedOrganizationId: resolvedOrganizationId,
        focusedProjectId: resolvedProject?.project_id ?? null,
        focusedProjectSlug: resolvedProject?.project_slug ?? (preferred?.projectSlug ?? null),
      });
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const handleFocusChanged = (event: Event) => {
      const detail = (event as CustomEvent<{
        focusedOrganizationId?: string | null;
        focusedProjectId?: string | null;
        focusedProjectSlug?: string | null;
      }>).detail;
      setSelectedOrganizationIdState(detail?.focusedOrganizationId ?? null);
      setSelectedProjectIdState(detail?.focusedProjectId ?? null);
      void loadWorkspace({
        organizationId: detail?.focusedOrganizationId ?? null,
        projectId: detail?.focusedProjectId ?? null,
        projectSlug: detail?.focusedProjectSlug ?? null,
      });
    };

    window.addEventListener(AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT, handleFocusChanged);
    return () => window.removeEventListener(AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT, handleFocusChanged);
  }, [loadWorkspace]);

  useEffect(() => {
    const handleProjectListChanged = (event: Event) => {
      const detail = (event as CustomEvent<{
        focusedOrganizationId?: string | null;
        focusedProjectId?: string | null;
        focusedProjectSlug?: string | null;
      }>).detail;
      void loadWorkspace({
        organizationId: detail?.focusedOrganizationId ?? null,
        projectId: detail?.focusedProjectId ?? null,
        projectSlug: detail?.focusedProjectSlug ?? null,
      });
    };

    window.addEventListener(AGCHAIN_PROJECT_LIST_CHANGED_EVENT, handleProjectListChanged);
    return () => window.removeEventListener(AGCHAIN_PROJECT_LIST_CHANGED_EVENT, handleProjectListChanged);
  }, [loadWorkspace]);

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.organization_id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId],
  );
  const selectedProject = useMemo(
    () => projects.find((item) => item.project_id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const setSelectedOrganizationId = useCallback((organizationId: string | null) => {
    setSelectedOrganizationIdState(organizationId);
    setSelectedProjectIdState(null);
    setStoredAgchainWorkspaceFocus({
      focusedOrganizationId: organizationId,
      focusedProjectId: null,
      focusedProjectSlug: null,
    });
  }, []);

  const setSelectedProjectId = useCallback((projectId: string | null, projectSlug?: string | null) => {
    setSelectedProjectIdState(projectId);
    setStoredAgchainWorkspaceFocus({
      focusedOrganizationId: selectedOrganizationId,
      focusedProjectId: projectId,
      focusedProjectSlug: projectSlug ?? projects.find((item) => item.project_id === projectId)?.project_slug ?? null,
    });
  }, [projects, selectedOrganizationId]);

  return {
    organizations,
    projects,
    loading,
    error,
    selectedOrganizationId,
    selectedOrganization,
    selectedProjectId,
    selectedProject,
    setSelectedOrganizationId,
    setSelectedProjectId,
    reload: () => loadWorkspace({
      organizationId: selectedOrganizationId,
      projectId: selectedProjectId,
      projectSlug: selectedProject?.project_slug ?? readStoredAgchainProjectFocusSlug(),
    }),
  };
}
