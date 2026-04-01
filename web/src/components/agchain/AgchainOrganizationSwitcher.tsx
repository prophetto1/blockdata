import { useMemo } from 'react';
import { ProjectFocusSelectorPopover } from '@/components/shell/ProjectFocusSelectorPopover';
import { useAgchainWorkspaceContext } from '@/hooks/agchain/useAgchainWorkspaceContext';

export function AgchainOrganizationSwitcher() {
  const {
    organizations,
    loading,
    error,
    selectedOrganization,
    selectedOrganizationId,
    setSelectedOrganizationId,
    reload,
  } = useAgchainWorkspaceContext();

  const selectorItems = useMemo(
    () => organizations.map((organization) => ({
      id: organization.organization_id,
      label: organization.display_name,
      description: organization.is_personal
        ? `Personal workspace · ${organization.project_count} projects`
        : `${organization.project_count} projects`,
      searchText: `${organization.organization_slug} ${organization.membership_role}`,
      leadingText: organization.display_name[0]?.toUpperCase() ?? '?',
    })),
    [organizations],
  );

  const triggerLabel = selectedOrganization?.display_name
    ?? selectedOrganizationId
    ?? 'Select organization';

  return (
    <ProjectFocusSelectorPopover
      items={selectorItems}
      selectedItemId={selectedOrganizationId}
      triggerLabel={triggerLabel}
      triggerTestId="agchain-organization-context"
      triggerClassName="agchain-organization-switcher-trigger w-full justify-between"
      searchPlaceholder="Find organization..."
      emptyLabel="No organizations found"
      loadingLabel="Loading organizations..."
      loading={loading}
      error={error}
      onRetry={reload}
      footerActionLabel="Open AGChain settings"
      footerActionHref="/app/agchain/settings"
      onSelectItem={(organizationId) => setSelectedOrganizationId(organizationId)}
    />
  );
}
