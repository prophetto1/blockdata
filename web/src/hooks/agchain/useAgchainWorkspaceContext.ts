import { useAgchainWorkspace } from '@/contexts/AgchainWorkspaceContext';

export function useAgchainWorkspaceContext() {
  const ctx = useAgchainWorkspace();
  return {
    organizations: ctx.organizations,
    projects: ctx.projects,
    loading: ctx.status === 'bootstrapping',
    error: ctx.error,
    selectedOrganizationId: ctx.selectedOrganizationId,
    selectedOrganization: ctx.selectedOrganization,
    selectedProjectId: ctx.selectedProjectId,
    selectedProject: ctx.selectedProject,
    setSelectedOrganizationId: ctx.setSelectedOrganizationId,
    setSelectedProjectId: ctx.setSelectedProjectId,
    reload: ctx.reload,
  };
}
