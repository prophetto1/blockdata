import { useEffect, useState } from 'react';
import { AgchainPageFrame } from './AgchainPageFrame';
import { AgchainDatasetWizard } from '@/components/agchain/datasets/AgchainDatasetWizard';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { getDatasetBootstrap, type AgchainDatasetBootstrapResponse } from '@/lib/agchainDatasets';

export default function AgchainDatasetCreatePage() {
  const { focusedProject, status, reload: reloadWorkspace } = useAgchainProjectFocus();
  const projectId = focusedProject?.project_id ?? null;
  const [bootstrap, setBootstrap] = useState<AgchainDatasetBootstrapResponse | null>(null);

  useEffect(() => {
    if (projectId) {
      getDatasetBootstrap(projectId)
        .then(setBootstrap)
        .catch(() => {});
    }
  }, [projectId]);

  if (status === 'bootstrapping') {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center"><p className="text-sm text-muted-foreground">Loading workspace...</p></div>
      </AgchainPageFrame>
    );
  }

  if (status === 'error') {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Failed to load AGChain workspace context.</p>
          <button onClick={() => void reloadWorkspace()} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">Retry</button>
        </div>
      </AgchainPageFrame>
    );
  }

  if (status === 'no-organization') {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">No organization</h1>
          <p className="text-sm text-muted-foreground">Select or create an organization to continue.</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (!projectId) {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a project to create a dataset.</p>
        </div>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame>
      <div className="flex flex-col gap-6 py-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Dataset</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new evaluation dataset from an external source.
          </p>
        </div>
        <AgchainDatasetWizard projectId={projectId} bootstrap={bootstrap} />
      </div>
    </AgchainPageFrame>
  );
}
