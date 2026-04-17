import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createOrganizationMemberInvitations,
  fetchOrganizationMembers,
  updateOrganizationMembershipStatus,
  type AgchainOrganizationMember,
  type AgchainOrganizationMemberInvitationRequest,
  type AgchainOrganizationMemberInvitationResult,
  type AgchainOrganizationMembersStatusFilter,
  type AgchainPermissionGroupSummary,
  type AgchainSettingsOrganization,
  type AgchainOrganizationMemberStatus,
} from '@/lib/agchainSettings';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function derivePermissionGroups(items: AgchainOrganizationMember[]): AgchainPermissionGroupSummary[] {
  const groups = new Map<string, AgchainPermissionGroupSummary>();
  for (const item of items) {
    for (const group of item.groups) {
      groups.set(group.permission_group_id, group);
    }
  }
  return Array.from(groups.values()).sort((left, right) => {
    if (left.is_system_group !== right.is_system_group) {
      return left.is_system_group ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

export function useAgchainOrganizationMembers(selectedOrganizationId: string | null) {
  const loadRequestIdRef = useRef(0);
  const [organization, setOrganization] = useState<AgchainSettingsOrganization | null>(null);
  const [items, setItems] = useState<AgchainOrganizationMember[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgchainOrganizationMembersStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResults, setInviteResults] = useState<AgchainOrganizationMemberInvitationResult[]>([]);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;

    if (!selectedOrganizationId) {
      setOrganization(null);
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchOrganizationMembers(selectedOrganizationId, {
        search,
        status: statusFilter,
      });
      if (loadRequestIdRef.current !== requestId) {
        return;
      }
      setOrganization(result.organization);
      setItems(result.items);
      setError(null);
    } catch (nextError) {
      if (loadRequestIdRef.current !== requestId) {
        return;
      }
      setError(getErrorMessage(nextError));
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [search, selectedOrganizationId, statusFilter]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const permissionGroups = useMemo(() => derivePermissionGroups(items), [items]);

  const inviteMembers = useCallback(
    async (payload: AgchainOrganizationMemberInvitationRequest) => {
      if (!selectedOrganizationId) {
        throw new Error('No AGChain organization is selected');
      }

      setCreatingInvite(true);
      try {
        const result = await createOrganizationMemberInvitations(selectedOrganizationId, payload);
        setInviteResults(result.results);
        setInviteError(null);
        await loadMembers();
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setInviteError(message);
        throw nextError;
      } finally {
        setCreatingInvite(false);
      }
    },
    [loadMembers, selectedOrganizationId],
  );

  const updateMembershipStatus = useCallback(
    async (organizationMemberId: string, membershipStatus: AgchainOrganizationMemberStatus) => {
      if (!selectedOrganizationId) {
        throw new Error('No AGChain organization is selected');
      }

      setUpdatingMemberId(organizationMemberId);
      try {
        await updateOrganizationMembershipStatus(
          selectedOrganizationId,
          organizationMemberId,
          membershipStatus,
        );
        setError(null);
        await loadMembers();
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw nextError;
      } finally {
        setUpdatingMemberId(null);
      }
    },
    [loadMembers, selectedOrganizationId],
  );

  return {
    organization,
    items,
    permissionGroups,
    search,
    statusFilter,
    loading,
    error,
    inviteError,
    inviteResults,
    creatingInvite,
    updatingMemberId,
    setSearch,
    setStatusFilter,
    inviteMembers,
    updateMembershipStatus,
    reload: loadMembers,
  };
}
