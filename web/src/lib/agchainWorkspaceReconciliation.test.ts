import { describe, expect, it } from 'vitest';
import type { AgchainOrganizationRow, AgchainProjectRow } from '@/lib/agchainWorkspaces';
import {
  reconcileWorkspaceSelection,
  resolveSelectedProject,
  type ReconciliationInput,
} from './agchainWorkspaceReconciliation';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ORG_PERSONAL: AgchainOrganizationRow = {
  organization_id: 'org-1',
  organization_slug: 'personal-user-1',
  display_name: 'Personal Workspace',
  membership_role: 'organization_admin',
  is_personal: true,
  project_count: 2,
};

const ORG_TEAM: AgchainOrganizationRow = {
  organization_id: 'org-2',
  organization_slug: 'team-acme',
  display_name: 'Acme Team',
  membership_role: 'organization_member',
  is_personal: false,
  project_count: 1,
};

const PROJECT_LEGAL: AgchainProjectRow = {
  project_id: 'project-1',
  organization_id: 'org-1',
  project_slug: 'legal-evals',
  project_name: 'Legal Evals',
  description: 'Legal benchmark package',
  membership_role: 'project_admin',
  updated_at: '2026-03-31T16:45:00Z',
  primary_benchmark_slug: 'legal-10',
  primary_benchmark_name: 'Legal-10',
};

const PROJECT_FINANCE: AgchainProjectRow = {
  project_id: 'project-2',
  organization_id: 'org-1',
  project_slug: 'finance-evals',
  project_name: 'Finance Evals',
  description: 'Finance evaluation package',
  membership_role: 'project_admin',
  updated_at: '2026-03-31T14:00:00Z',
  primary_benchmark_slug: 'finance-eval',
  primary_benchmark_name: 'Finance Eval',
};

function input(overrides: Partial<ReconciliationInput> = {}): ReconciliationInput {
  return {
    organizations: [ORG_PERSONAL, ORG_TEAM],
    projects: [PROJECT_LEGAL, PROJECT_FINANCE],
    preferredOrgId: null,
    preferredProjectId: null,
    preferredProjectSlug: null,
    fetchError: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// reconcileWorkspaceSelection
// ---------------------------------------------------------------------------

describe('reconcileWorkspaceSelection', () => {
  it('returns error when fetchError is present', () => {
    const result = reconcileWorkspaceSelection(
      input({ fetchError: 'Network failure' }),
    );
    expect(result).toEqual({
      status: 'error',
      selectedOrganizationId: null,
      selectedProjectId: null,
      error: 'Network failure',
    });
  });

  it('returns no-organization when organizations list is empty', () => {
    const result = reconcileWorkspaceSelection(
      input({ organizations: [] }),
    );
    expect(result).toEqual({
      status: 'no-organization',
      selectedOrganizationId: null,
      selectedProjectId: null,
      error: null,
    });
  });

  it('returns no-project when org is valid but projects list is empty', () => {
    const result = reconcileWorkspaceSelection(
      input({ projects: [], preferredOrgId: 'org-1' }),
    );
    expect(result).toEqual({
      status: 'no-project',
      selectedOrganizationId: 'org-1',
      selectedProjectId: null,
      error: null,
    });
  });

  it('returns ready with exact match when stored IDs are valid', () => {
    const result = reconcileWorkspaceSelection(
      input({
        preferredOrgId: 'org-1',
        preferredProjectId: 'project-2',
      }),
    );
    expect(result).toEqual({
      status: 'ready',
      selectedOrganizationId: 'org-1',
      selectedProjectId: 'project-2',
      error: null,
    });
  });

  it('falls back to first org when stored org ID is stale', () => {
    const result = reconcileWorkspaceSelection(
      input({
        preferredOrgId: 'org-deleted',
        preferredProjectId: 'project-1',
      }),
    );
    expect(result.status).toBe('ready');
    expect(result.selectedOrganizationId).toBe('org-1');
    expect(result.selectedProjectId).toBe('project-1');
  });

  it('falls back to first project when stored project ID is stale', () => {
    const result = reconcileWorkspaceSelection(
      input({
        preferredOrgId: 'org-1',
        preferredProjectId: 'project-deleted',
      }),
    );
    expect(result.status).toBe('ready');
    expect(result.selectedOrganizationId).toBe('org-1');
    expect(result.selectedProjectId).toBe('project-1');
  });

  it('resolves project by slug matching primary_benchmark_slug', () => {
    const result = reconcileWorkspaceSelection(
      input({
        preferredOrgId: 'org-1',
        preferredProjectSlug: 'finance-eval',
      }),
    );
    expect(result.status).toBe('ready');
    expect(result.selectedProjectId).toBe('project-2');
  });

  it('resolves project by slug matching project_slug', () => {
    const result = reconcileWorkspaceSelection(
      input({
        preferredOrgId: 'org-1',
        preferredProjectSlug: 'legal-evals',
      }),
    );
    expect(result.status).toBe('ready');
    expect(result.selectedProjectId).toBe('project-1');
  });

  it('defaults to first org and first project when no stored IDs', () => {
    const result = reconcileWorkspaceSelection(input());
    expect(result).toEqual({
      status: 'ready',
      selectedOrganizationId: 'org-1',
      selectedProjectId: 'project-1',
      error: null,
    });
  });

  it('prefers project ID match over slug match', () => {
    const result = reconcileWorkspaceSelection(
      input({
        preferredProjectId: 'project-2',
        preferredProjectSlug: 'legal-evals',
      }),
    );
    expect(result.selectedProjectId).toBe('project-2');
  });

  it('falls back to slug when project ID does not match', () => {
    const result = reconcileWorkspaceSelection(
      input({
        preferredProjectId: 'project-deleted',
        preferredProjectSlug: 'finance-evals',
      }),
    );
    expect(result.selectedProjectId).toBe('project-2');
  });
});

// ---------------------------------------------------------------------------
// resolveSelectedProject
// ---------------------------------------------------------------------------

describe('resolveSelectedProject', () => {
  const projects = [PROJECT_LEGAL, PROJECT_FINANCE];

  it('returns exact match by project_id', () => {
    expect(resolveSelectedProject(projects, 'project-2')?.project_id).toBe('project-2');
  });

  it('returns slug match by project_slug', () => {
    expect(resolveSelectedProject(projects, null, 'finance-evals')?.project_id).toBe('project-2');
  });

  it('returns slug match by primary_benchmark_slug', () => {
    expect(resolveSelectedProject(projects, null, 'legal-10')?.project_id).toBe('project-1');
  });

  it('falls back to first project when no match', () => {
    expect(resolveSelectedProject(projects, 'no-match', 'no-match')?.project_id).toBe('project-1');
  });

  it('returns null for empty list', () => {
    expect(resolveSelectedProject([], 'project-1')).toBeNull();
  });
});
