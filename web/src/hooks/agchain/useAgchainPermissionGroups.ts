import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addPermissionGroupMembers,
  createOrganizationPermissionGroup,
  fetchOrganizationMembers,
  fetchPermissionDefinitions,
  fetchPermissionGroupDetail,
  fetchPermissionGroupMembers,
  fetchPermissionGroups,
  removePermissionGroupMember,
  type AgchainOrganizationMember,
  type AgchainPermissionDefinitionsResponse,
  type AgchainPermissionGroup,
  type AgchainPermissionGroupCreateRequest,
  type AgchainPermissionGroupDetailResponse,
  type AgchainPermissionGroupMembersResponse,
  type AgchainSettingsOrganization,
} from '@/lib/agchainSettings';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainPermissionGroups(selectedOrganizationId: string | null) {
  const loadIndexRequestIdRef = useRef(0);
  const [organization, setOrganization] = useState<AgchainSettingsOrganization | null>(null);
  const [items, setItems] = useState<AgchainPermissionGroup[]>([]);
  const [permissionDefinitions, setPermissionDefinitions] = useState<AgchainPermissionDefinitionsResponse | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<AgchainPermissionGroupDetailResponse | null>(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<AgchainPermissionGroupMembersResponse | null>(null);
  const [availableMembers, setAvailableMembers] = useState<AgchainOrganizationMember[]>([]);
  const [search, setSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const loadPermissionGroupsIndex = useCallback(async () => {
    const requestId = ++loadIndexRequestIdRef.current;

    if (!selectedOrganizationId) {
      setOrganization(null);
      setItems([]);
      setPermissionDefinitions(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const [definitions, groups] = await Promise.all([
        fetchPermissionDefinitions(selectedOrganizationId),
        fetchPermissionGroups(selectedOrganizationId, { search }),
      ]);
      if (loadIndexRequestIdRef.current !== requestId) {
        return;
      }
      setPermissionDefinitions(definitions);
      setOrganization(groups.organization);
      setItems(groups.items);
      setError(null);
    } catch (nextError) {
      if (loadIndexRequestIdRef.current !== requestId) {
        return;
      }
      setError(getErrorMessage(nextError));
    } finally {
      if (loadIndexRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [search, selectedOrganizationId]);

  useEffect(() => {
    void loadPermissionGroupsIndex();
  }, [loadPermissionGroupsIndex]);

  const createPermissionGroup = useCallback(
    async (payload: AgchainPermissionGroupCreateRequest) => {
      if (!selectedOrganizationId) {
        throw new Error('No AGChain organization is selected');
      }

      setCreating(true);
      try {
        await createOrganizationPermissionGroup(selectedOrganizationId, payload);
        setCreateError(null);
        await loadPermissionGroupsIndex();
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setCreateError(message);
        throw nextError;
      } finally {
        setCreating(false);
      }
    },
    [loadPermissionGroupsIndex, selectedOrganizationId],
  );

  const loadPermissionGroupDetail = useCallback(
    async (permissionGroupId: string) => {
      if (!selectedOrganizationId) {
        throw new Error('No AGChain organization is selected');
      }

      setDetailLoading(true);
      try {
        const detail = await fetchPermissionGroupDetail(selectedOrganizationId, permissionGroupId);
        setSelectedGroupDetail(detail);
        setDetailError(null);
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setSelectedGroupDetail(null);
        setDetailError(message);
        throw nextError;
      } finally {
        setDetailLoading(false);
      }
    },
    [selectedOrganizationId],
  );

  const loadPermissionGroupMembers = useCallback(
    async (permissionGroupId: string, nextSearch = '') => {
      if (!selectedOrganizationId) {
        throw new Error('No AGChain organization is selected');
      }

      setMembersLoading(true);
      setMemberSearch(nextSearch);
      try {
        const [membersData, organizationMembers] = await Promise.all([
          fetchPermissionGroupMembers(selectedOrganizationId, permissionGroupId, { search: nextSearch }),
          fetchOrganizationMembers(selectedOrganizationId, { search: nextSearch, status: 'active' }),
        ]);
        const currentMemberIds = new Set(
          membersData.items.map((item) => item.organization_member_id),
        );
        setSelectedGroupMembers(membersData);
        setAvailableMembers(
          organizationMembers.items.filter(
            (member) => !currentMemberIds.has(member.organization_member_id),
          ),
        );
        setMembersError(null);
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setSelectedGroupMembers(null);
        setAvailableMembers([]);
        setMembersError(message);
        throw nextError;
      } finally {
        setMembersLoading(false);
      }
    },
    [selectedOrganizationId],
  );

  const addGroupMembers = useCallback(
    async (permissionGroupId: string, organizationMemberIds: string[]) => {
      if (!selectedOrganizationId) {
        throw new Error('No AGChain organization is selected');
      }

      setAddingMembers(true);
      try {
        await addPermissionGroupMembers(selectedOrganizationId, permissionGroupId, organizationMemberIds);
        setMembersError(null);
        await Promise.all([
          loadPermissionGroupsIndex(),
          loadPermissionGroupMembers(permissionGroupId, memberSearch),
        ]);
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setMembersError(message);
        throw nextError;
      } finally {
        setAddingMembers(false);
      }
    },
    [loadPermissionGroupMembers, loadPermissionGroupsIndex, memberSearch, selectedOrganizationId],
  );

  const removeGroupMember = useCallback(
    async (permissionGroupId: string, organizationMemberId: string) => {
      if (!selectedOrganizationId) {
        throw new Error('No AGChain organization is selected');
      }

      setRemovingMemberId(organizationMemberId);
      try {
        await removePermissionGroupMember(selectedOrganizationId, permissionGroupId, organizationMemberId);
        setMembersError(null);
        await Promise.all([
          loadPermissionGroupsIndex(),
          loadPermissionGroupMembers(permissionGroupId, memberSearch),
        ]);
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setMembersError(message);
        throw nextError;
      } finally {
        setRemovingMemberId(null);
      }
    },
    [loadPermissionGroupMembers, loadPermissionGroupsIndex, memberSearch, selectedOrganizationId],
  );

  return {
    organization,
    items,
    permissionDefinitions,
    selectedGroupDetail,
    selectedGroupMembers,
    availableMembers,
    search,
    memberSearch,
    loading,
    error,
    createError,
    detailError,
    membersError,
    creating,
    detailLoading,
    membersLoading,
    addingMembers,
    removingMemberId,
    setSearch,
    setMemberSearch,
    createPermissionGroup,
    loadPermissionGroupDetail,
    loadPermissionGroupMembers,
    addGroupMembers,
    removeGroupMember,
    reload: loadPermissionGroupsIndex,
  };
}
