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
  const triggerDescription = selectedOrganization
    ? selectedOrganization.is_personal
      ? `Personal workspace · ${selectedOrganization.project_count} projects`
      : `${selectedOrganization.project_count} projects`
    : null;
  const triggerLeadingText = selectedOrganization?.display_name[0]?.toUpperCase()
    ?? triggerLabel[0]?.toUpperCase()
    ?? '?';

  return (
    <ProjectFocusSelectorPopover
      items={selectorItems}
      selectedItemId={selectedOrganizationId}
      triggerLabel={triggerLabel}
      triggerDescription={triggerDescription}
      triggerLeadingText={triggerLeadingText}
      triggerVariant="sidebar-row"
      triggerTestId="agchain-organization-context"
      triggerClassName="agchain-organization-switcher-trigger"
      searchPlaceholder="Find organization..."
      emptyLabel="No organizations found"
      loadingLabel="Loading organizations..."
      loading={loading}
      error={error}
      onRetry={reload}
      footerActionLabel="Open organization members"
      footerActionHref="/app/agchain/settings/organization/members"
      onSelectItem={(organizationId) => setSelectedOrganizationId(organizationId)}
    />
  );
}
