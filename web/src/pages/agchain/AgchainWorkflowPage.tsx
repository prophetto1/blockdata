import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { WorkflowEditorSurface } from '@/components/workflow/WorkflowEditorSurface';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { AgchainPageFrame } from './AgchainPageFrame';

function buildWorkflowStorageKey(projectId: string) {
  return `agchain.workflow.graph.v1.${projectId}`;
}

export default function AgchainWorkflowPage() {
  const scopeState = useAgchainScopeState('project');

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading AGChain project...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain workflow unavailable"
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
          description="Select or create an organization to continue into AGChain."
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="Choose an AGChain project"
          description="Workflow authoring is scoped to the selected AGChain project. Pick a project from the registry before working in this surface."
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

  const projectName = scopeState.focusedProject.project_name ?? scopeState.focusedProject.benchmark_name ?? 'this project';
  const storageKey = buildWorkflowStorageKey(scopeState.focusedProject.project_id);

  return (
    <AgchainPageFrame className="gap-0 px-0 pb-0">
      <div className="px-4">
        <ShellPageHeader
          title="Workflow"
          description={`Compose workflow objects, linked skills, and prompt relationships for ${projectName}. This AGChain route is now the canonical home for the graph editor while the richer library and inline-node behaviors continue to evolve.`}
        />
      </div>

      <div className="min-h-0 flex-1 px-2 pb-2">
        <WorkflowEditorSurface storageKey={storageKey} />
      </div>
    </AgchainPageFrame>
  );
}
