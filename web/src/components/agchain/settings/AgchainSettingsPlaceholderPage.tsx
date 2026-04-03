import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';
import { AgchainSettingsPlaceholderLayout } from './AgchainSettingsPlaceholderLayout';

type AgchainSettingsPlaceholderPageProps = {
  scope: 'organization' | 'project' | 'personal';
  title: string;
  description: string;
  note: string;
};

export function AgchainSettingsPlaceholderPage({
  scope,
  title,
  description,
  note,
}: AgchainSettingsPlaceholderPageProps) {
  const scopeState = useAgchainScopeState(scope === 'project' ? 'project' : 'organization');

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading settings workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain settings unavailable"
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
          description="Select or create an organization to continue into AGChain settings."
        />
      </AgchainPageFrame>
    );
  }

  if (scope === 'project' && scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="Choose an AGChain project"
          description="Project settings are scoped to the selected AGChain project or evaluation. Pick a project from the registry before opening project-specific settings."
          action={(
            <Link
              to="/app/agchain/projects"
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open project registry
            </Link>
          )}
        />
      </AgchainPageFrame>
    );
  }

  const eyebrow =
    scope === 'organization'
      ? 'Organization settings'
      : scope === 'project'
        ? 'Project settings'
        : 'Personal settings';

  const meta =
    scopeState.kind === 'ready' && scope === 'project'
      ? `Current project: ${scopeState.focusedProject.project_name ?? scopeState.focusedProject.benchmark_name ?? 'Selected project'}`
      : `Current organization: ${scopeState.selectedOrganization.display_name}`;

  return (
    <AgchainSettingsPlaceholderLayout
      title={title}
      description={description}
      note={note}
      eyebrow={eyebrow}
      meta={meta}
    />
  );
}
