import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { AgchainProviderCredentialsSurface } from '@/components/agchain/models/AgchainProviderCredentialsSurface';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { useOrganizationModelProviders } from '@/hooks/agchain/useOrganizationModelProviders';
import {
  deleteOrganizationModelProviderCredential,
  saveOrganizationModelProviderCredential,
  testOrganizationModelProviderCredential,
  type AgchainScopedModelProvider,
  type ScopedCredentialPayload,
} from '@/lib/agchainModelProviderCredentials';
import { AgchainPageFrame } from '../AgchainPageFrame';

export default function AgchainOrganizationAiProvidersPage() {
  const scopeState = useAgchainScopeState('organization');

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="Organization AI Providers unavailable"
          description="Failed to load AGChain workspace context."
          action={(
            <button
              type="button"
              onClick={() => void scopeState.reload()}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retry
            </button>
          )}
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue."
        />
      </AgchainPageFrame>
    );
  }

  const organizationId = scopeState.selectedOrganization.organization_id;
  const { items, status, error, refresh } = useOrganizationModelProviders(organizationId);
  const rows = items ?? [];

  async function handleSave(provider: AgchainScopedModelProvider, payload: ScopedCredentialPayload) {
    await saveOrganizationModelProviderCredential(organizationId, provider.provider_slug, payload);
    await refresh();
  }

  async function handleTest(provider: AgchainScopedModelProvider, payload: ScopedCredentialPayload) {
    return testOrganizationModelProviderCredential(organizationId, provider.provider_slug, payload);
  }

  async function handleDelete(provider: AgchainScopedModelProvider) {
    await deleteOrganizationModelProviderCredential(organizationId, provider.provider_slug);
    await refresh();
  }

  return (
    <AgchainPageFrame className="gap-6 py-8">
      <ShellPageHeader
        title="Organization AI Providers"
        description="Configure the organization-wide AI provider credentials used as global defaults across AGChain projects."
      />
      <AgchainProviderCredentialsSurface
        scope="organization"
        rows={rows}
        loading={status === 'loading' && rows.length === 0}
        error={error}
        onRefresh={refresh}
        onSave={handleSave}
        onTest={handleTest}
        onDelete={handleDelete}
      />
    </AgchainPageFrame>
  );
}
