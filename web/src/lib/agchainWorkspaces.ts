import { platformApiFetch } from '@/lib/platformApi';

export type AgchainOrganizationRow = {
  organization_id: string;
  organization_slug: string;
  display_name: string;
  membership_role: string;
  is_personal: boolean;
  project_count: number;
};

export type AgchainProjectRow = {
  project_id: string;
  organization_id: string;
  project_slug: string;
  project_name: string;
  description: string;
  membership_role: string;
  updated_at: string | null;
  primary_benchmark_slug: string | null;
  primary_benchmark_name: string | null;
};

export type AgchainProjectCreateRequest = {
  organization_id?: string | null;
  project_name: string;
  project_slug?: string | null;
  description?: string;
  seed_initial_benchmark?: boolean;
  initial_benchmark_name?: string | null;
};

export type AgchainProjectCreateResult = {
  ok: boolean;
  project_id: string;
  project_slug: string;
  primary_benchmark_slug: string | null;
  redirect_path: string;
};

export type AgchainWorkspaceBootstrapStatus =
  | 'bootstrapping'
  | 'no-organization'
  | 'no-project'
  | 'ready'
  | 'error';

export type AgchainWorkspaceBootstrapResult = {
  status: AgchainWorkspaceBootstrapStatus;
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  error: string | null;
};

type OrganizationsResponse = {
  items?: AgchainOrganizationRow[];
};

type ProjectsResponse = {
  items?: AgchainProjectRow[];
};

type WorkspaceBootstrapResponse = {
  status?: AgchainWorkspaceBootstrapStatus;
  organizations?: AgchainOrganizationRow[];
  projects?: AgchainProjectRow[];
  selected_organization_id?: string | null;
  selected_project_id?: string | null;
  error?: string | null;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as { detail?: string; error?: string }).detail ??
      (errorBody as { detail?: string; error?: string }).error ??
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchAgchainOrganizations(): Promise<{ items: AgchainOrganizationRow[] }> {
  const response = await platformApiFetch('/agchain/organizations');
  const data = await parseJsonResponse<OrganizationsResponse>(response);
  return { items: data.items ?? [] };
}

export async function fetchAgchainProjects(options: {
  organizationId?: string | null;
  search?: string | null;
} = {}): Promise<{ items: AgchainProjectRow[] }> {
  const params = new URLSearchParams();
  if (options.organizationId) {
    params.set('organization_id', options.organizationId);
  }
  if (options.search) {
    params.set('search', options.search);
  }
  const suffix = params.size ? `?${params.toString()}` : '';
  const response = await platformApiFetch(`/agchain/projects${suffix}`);
  const data = await parseJsonResponse<ProjectsResponse>(response);
  return { items: data.items ?? [] };
}

export async function fetchAgchainWorkspaceBootstrap(options: {
  preferredOrganizationId?: string | null;
  preferredProjectId?: string | null;
  preferredProjectSlug?: string | null;
} = {}): Promise<AgchainWorkspaceBootstrapResult> {
  const params = new URLSearchParams();
  if (options.preferredOrganizationId) {
    params.set('preferred_organization_id', options.preferredOrganizationId);
  }
  if (options.preferredProjectId) {
    params.set('preferred_project_id', options.preferredProjectId);
  }
  if (options.preferredProjectSlug) {
    params.set('preferred_project_slug', options.preferredProjectSlug);
  }
  const suffix = params.size ? `?${params.toString()}` : '';
  const response = await platformApiFetch(`/agchain/workspace${suffix}`);
  const data = await parseJsonResponse<WorkspaceBootstrapResponse>(response);
  return {
    status: data.status ?? 'bootstrapping',
    organizations: data.organizations ?? [],
    projects: data.projects ?? [],
    selectedOrganizationId: data.selected_organization_id ?? null,
    selectedProjectId: data.selected_project_id ?? null,
    error: data.error ?? null,
  };
}

export async function createAgchainProject(
  payload: AgchainProjectCreateRequest,
): Promise<AgchainProjectCreateResult> {
  const response = await platformApiFetch('/agchain/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<AgchainProjectCreateResult>(response);
}
