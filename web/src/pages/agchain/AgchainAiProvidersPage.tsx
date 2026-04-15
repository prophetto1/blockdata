import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { AgchainProviderCredentialsSurface } from '@/components/agchain/models/AgchainProviderCredentialsSurface';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { useProjectModelProviders } from '@/hooks/agchain/useProjectModelProviders';
import {
  deleteProjectModelProviderCredential,
  saveProjectModelProviderCredential,
  testProjectModelProviderCredential,
  type AgchainScopedModelProvider,
  type ScopedCredentialPayload,
} from '@/lib/agchainModelProviderCredentials';
import { AgchainPageFrame } from './AgchainPageFrame';

export default function AgchainAiProvidersPage() {
  const scopeState = useAgchainScopeState('project');

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-6">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-6">
        <AgchainEmptyState
          title="AI Providers unavailable"
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
      <AgchainPageFrame className="gap-6 py-6">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue."
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-6 py-6">
        <AgchainEmptyState
          eyebrow="Project AI Providers"
          title="Choose an AGChain project"
          description="Select a project before configuring project-level AI provider credentials."
          action={(
            <Link
              to="/app/agchain/projects"
              className="inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open project registry
            </Link>
          )}
        />
      </AgchainPageFrame>
    );
  }

  return <ProjectProvidersReadyPage projectId={scopeState.focusedProject.project_id} />;
}

function ProjectProvidersReadyPage({ projectId }: { projectId: string }) {
  const { items, status, error, refresh } = useProjectModelProviders(projectId);
  const rows = items ?? [];

  async function handleSave(provider: AgchainScopedModelProvider, payload: ScopedCredentialPayload) {
    await saveProjectModelProviderCredential(projectId, provider.provider_slug, payload);
    await refresh();
  }

  async function handleTest(provider: AgchainScopedModelProvider, payload: ScopedCredentialPayload) {
    return testProjectModelProviderCredential(projectId, provider.provider_slug, payload);
  }

  async function handleDelete(provider: AgchainScopedModelProvider) {
    await deleteProjectModelProviderCredential(projectId, provider.provider_slug);
    await refresh();
  }

  return (
    <AgchainPageFrame className="gap-5 py-4">
      <ShellPageHeader
        title="AI Providers"
        description="Configure provider credentials for the selected project. Project credentials override organization defaults."
      />
      <AgchainProviderCredentialsSurface
        scope="project"
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
