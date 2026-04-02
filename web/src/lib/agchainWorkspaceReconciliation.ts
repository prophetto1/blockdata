import type { AgchainOrganizationRow, AgchainProjectRow } from '@/lib/agchainWorkspaces';

// ---------------------------------------------------------------------------
// Status type — authoritative, determines UI behavior
// ---------------------------------------------------------------------------

export type AgchainWorkspaceStatus =
  | 'bootstrapping'
  | 'no-organization'
  | 'no-project'
  | 'ready'
  | 'error';

// ---------------------------------------------------------------------------
// Reconciliation types
// ---------------------------------------------------------------------------

export type ReconciliationInput = {
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];
  preferredOrgId: string | null;
  preferredProjectId: string | null;
  preferredProjectSlug: string | null;
  fetchError: string | null;
};

export type ReconciliationResult = {
  status: AgchainWorkspaceStatus;
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Project resolution helper (extracted from useAgchainWorkspaceContext)
// ---------------------------------------------------------------------------

export function resolveSelectedProject(
  projects: AgchainProjectRow[],
  preferredProjectId?: string | null,
  preferredProjectSlug?: string | null,
): AgchainProjectRow | null {
  if (preferredProjectId) {
    const exact = projects.find((item) => item.project_id === preferredProjectId);
    if (exact) {
      return exact;
    }
  }

  if (preferredProjectSlug) {
    const compatible = projects.find(
      (item) =>
        item.project_slug === preferredProjectSlug ||
        item.primary_benchmark_slug === preferredProjectSlug,
    );
    if (compatible) {
      return compatible;
    }
  }

  return projects[0] ?? null;
}

// ---------------------------------------------------------------------------
// Pure reconciliation function
// ---------------------------------------------------------------------------

export function reconcileWorkspaceSelection(
  input: ReconciliationInput,
): ReconciliationResult {
  if (input.fetchError) {
    return {
      status: 'error',
      selectedOrganizationId: null,
      selectedProjectId: null,
      error: input.fetchError,
    };
  }

  if (input.organizations.length === 0) {
    return {
      status: 'no-organization',
      selectedOrganizationId: null,
      selectedProjectId: null,
      error: null,
    };
  }

  // Resolve org: prefer stored, fallback to first
  const orgMatch = input.organizations.find(
    (o) => o.organization_id === input.preferredOrgId,
  );
  const resolvedOrgId = orgMatch
    ? orgMatch.organization_id
    : input.organizations[0].organization_id;

  if (input.projects.length === 0) {
    return {
      status: 'no-project',
      selectedOrganizationId: resolvedOrgId,
      selectedProjectId: null,
      error: null,
    };
  }

  // Resolve project: prefer ID, then slug, then first
  const resolvedProject = resolveSelectedProject(
    input.projects,
    input.preferredProjectId,
    input.preferredProjectSlug,
  );

  return {
    status: resolvedProject ? 'ready' : 'no-project',
    selectedOrganizationId: resolvedOrgId,
    selectedProjectId: resolvedProject?.project_id ?? null,
    error: null,
  };
}
