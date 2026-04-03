import { platformApiFetch } from '@/lib/platformApi';

export type AgchainPermissionGroupSummary = {
  permission_group_id: string;
  name: string;
  is_system_group: boolean;
  system_group_kind: 'owners' | null;
};

export type AgchainPermissionDefinition = {
  permission_key: string;
  label: string;
  description: string;
  user_assignable: boolean;
};

export type AgchainProtectedSystemGroup = {
  system_group_kind: 'owners';
  name: string;
  deletable: boolean;
  last_member_removable: boolean;
};

export type AgchainSettingsOrganization = {
  organization_id: string;
  organization_slug?: string;
  display_name: string;
  is_personal?: boolean;
};

export type AgchainOrganizationMemberStatus = 'active' | 'disabled';
export type AgchainOrganizationMembersStatusFilter = AgchainOrganizationMemberStatus | 'all';

export type AgchainOrganizationMember = {
  organization_member_id: string;
  organization_id: string;
  user_id: string;
  email: string;
  display_name: string;
  membership_role: 'organization_admin' | 'organization_member';
  membership_status: AgchainOrganizationMemberStatus;
  created_at: string;
  group_count: number;
  groups: AgchainPermissionGroupSummary[];
};

export type AgchainOrganizationMembersResponse = {
  organization: AgchainSettingsOrganization;
  items: AgchainOrganizationMember[];
};

export type AgchainOrganizationMemberInvitationRequest = {
  emails: string[];
  permission_group_ids: string[];
};

export type AgchainOrganizationMemberInvitationResult = {
  email: string;
  outcome: 'invite_created' | 'already_member' | 'already_pending' | 'invalid_email';
  invite_id: string | null;
  invite_status: 'pending' | null;
  expires_at: string | null;
  permission_group_ids: string[];
  error_code: string | null;
};

export type AgchainOrganizationMemberInvitationsResponse = {
  ok: boolean;
  organization_id: string;
  results: AgchainOrganizationMemberInvitationResult[];
};

export type AgchainPermissionDefinitionsResponse = {
  organization_permissions: AgchainPermissionDefinition[];
  project_permissions: AgchainPermissionDefinition[];
  protected_system_groups: AgchainProtectedSystemGroup[];
};

export type AgchainPermissionGroup = {
  permission_group_id: string;
  organization_id: string;
  name: string;
  group_slug: string;
  description: string;
  is_system_group: boolean;
  system_group_kind: 'owners' | null;
  member_count: number;
  organization_permission_count: number;
  project_permission_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type AgchainPermissionGroupsResponse = {
  organization: AgchainSettingsOrganization;
  items: AgchainPermissionGroup[];
};

export type AgchainPermissionGroupCreateRequest = {
  name: string;
  description: string;
  permission_keys: string[];
};

export type AgchainPermissionGroupCreateResponse = {
  ok: boolean;
  group: {
    permission_group_id: string;
    organization_id: string;
    name: string;
    group_slug: string;
    description: string;
    is_system_group: boolean;
    organization_permission_count: number;
    project_permission_count: number;
    created_at: string | null;
    updated_at: string | null;
  };
};

export type AgchainPermissionGroupDetailResponse = {
  group: {
    permission_group_id: string;
    organization_id: string;
    name: string;
    group_slug: string;
    description: string;
    is_system_group: boolean;
    system_group_kind: 'owners' | null;
  };
  grants: {
    organization: string[];
    project: string[];
  };
  group_policy_notice: string;
};

export type AgchainPermissionGroupMembersResponse = {
  group: {
    permission_group_id: string;
    name: string;
    is_system_group: boolean;
  };
  items: Array<{
    organization_member_id: string;
    user_id: string;
    email: string;
    display_name: string;
    membership_role: 'organization_admin' | 'organization_member';
    membership_status: AgchainOrganizationMemberStatus;
    created_at: string | null;
  }>;
};

export type AgchainPermissionGroupMembersAddResponse = {
  ok: boolean;
  added_count: number;
  already_present_count: number;
  items: Array<{
    organization_member_id: string;
    permission_group_id: string;
  }>;
};

export type AgchainPermissionGroupMemberRemoveResponse = {
  ok: boolean;
  removed: boolean;
};

type AgchainOrganizationMemberStatusUpdateResponse = {
  ok: boolean;
  member: {
    organization_member_id: string;
    organization_id: string;
    user_id: string;
    membership_role: 'organization_admin' | 'organization_member';
    membership_status: AgchainOrganizationMemberStatus;
    updated_at: string;
  };
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

export async function fetchOrganizationMembers(
  organizationId: string,
  options: {
    search?: string | null;
    status?: AgchainOrganizationMembersStatusFilter | null;
  } = {},
): Promise<AgchainOrganizationMembersResponse> {
  const params = new URLSearchParams();
  if (options.search?.trim()) {
    params.set('search', options.search.trim());
  }
  if (options.status && options.status !== 'all') {
    params.set('status', options.status);
  }
  const query = params.size ? `?${params.toString()}` : '';
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/members${query}`,
  );
  return parseJsonResponse<AgchainOrganizationMembersResponse>(response);
}

export async function createOrganizationMemberInvitations(
  organizationId: string,
  payload: AgchainOrganizationMemberInvitationRequest,
): Promise<AgchainOrganizationMemberInvitationsResponse> {
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/member-invitations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  return parseJsonResponse<AgchainOrganizationMemberInvitationsResponse>(response);
}

export async function updateOrganizationMembershipStatus(
  organizationId: string,
  organizationMemberId: string,
  membershipStatus: AgchainOrganizationMemberStatus,
): Promise<AgchainOrganizationMemberStatusUpdateResponse> {
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(organizationMemberId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        membership_status: membershipStatus,
      }),
    },
  );
  return parseJsonResponse<AgchainOrganizationMemberStatusUpdateResponse>(response);
}

export async function fetchPermissionDefinitions(
  organizationId: string,
): Promise<AgchainPermissionDefinitionsResponse> {
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/permission-definitions`,
  );
  return parseJsonResponse<AgchainPermissionDefinitionsResponse>(response);
}

export async function fetchPermissionGroups(
  organizationId: string,
  options: {
    search?: string | null;
  } = {},
): Promise<AgchainPermissionGroupsResponse> {
  const params = new URLSearchParams();
  if (options.search?.trim()) {
    params.set('search', options.search.trim());
  }
  const query = params.size ? `?${params.toString()}` : '';
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/permission-groups${query}`,
  );
  return parseJsonResponse<AgchainPermissionGroupsResponse>(response);
}

export async function createOrganizationPermissionGroup(
  organizationId: string,
  payload: AgchainPermissionGroupCreateRequest,
): Promise<AgchainPermissionGroupCreateResponse> {
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/permission-groups`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  return parseJsonResponse<AgchainPermissionGroupCreateResponse>(response);
}

export async function fetchPermissionGroupDetail(
  organizationId: string,
  permissionGroupId: string,
): Promise<AgchainPermissionGroupDetailResponse> {
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/permission-groups/${encodeURIComponent(permissionGroupId)}`,
  );
  return parseJsonResponse<AgchainPermissionGroupDetailResponse>(response);
}

export async function fetchPermissionGroupMembers(
  organizationId: string,
  permissionGroupId: string,
  options: {
    search?: string | null;
  } = {},
): Promise<AgchainPermissionGroupMembersResponse> {
  const params = new URLSearchParams();
  if (options.search?.trim()) {
    params.set('search', options.search.trim());
  }
  const query = params.size ? `?${params.toString()}` : '';
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/permission-groups/${encodeURIComponent(permissionGroupId)}/members${query}`,
  );
  return parseJsonResponse<AgchainPermissionGroupMembersResponse>(response);
}

export async function addPermissionGroupMembers(
  organizationId: string,
  permissionGroupId: string,
  organizationMemberIds: string[],
): Promise<AgchainPermissionGroupMembersAddResponse> {
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/permission-groups/${encodeURIComponent(permissionGroupId)}/members`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_member_ids: organizationMemberIds,
      }),
    },
  );
  return parseJsonResponse<AgchainPermissionGroupMembersAddResponse>(response);
}

export async function removePermissionGroupMember(
  organizationId: string,
  permissionGroupId: string,
  organizationMemberId: string,
): Promise<AgchainPermissionGroupMemberRemoveResponse> {
  const response = await platformApiFetch(
    `/agchain/settings/organizations/${encodeURIComponent(organizationId)}/permission-groups/${encodeURIComponent(permissionGroupId)}/members/${encodeURIComponent(organizationMemberId)}`,
    {
      method: 'DELETE',
    },
  );
  return parseJsonResponse<AgchainPermissionGroupMemberRemoveResponse>(response);
}
