import { useMemo, useState } from 'react';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { AgchainModelInspector } from '@/components/agchain/models/AgchainModelInspector';
import { AgchainModelsTable } from '@/components/agchain/models/AgchainModelsTable';
import { AgchainModelsToolbar } from '@/components/agchain/models/AgchainModelsToolbar';
import { useAgchainModels } from '@/hooks/agchain/useAgchainModels';
import { AgchainPageFrame } from './AgchainPageFrame';

export default function AgchainModelsPage() {
  const [search, setSearch] = useState('');
  const {
    providers,
    providerRows,
    selectedProviderSlug,
    selectedProvider,
    selectedTarget,
    recentHealthChecks,
    listLoading,
    providersLoading,
    detailLoading,
    mutating,
    refreshing,
    error,
    detailError,
    selectProvider,
    closeProvider,
    selectTarget,
    createModel,
    updateModel,
    refreshModelHealth,
    connectKey,
    disconnectKey,
  } = useAgchainModels();

  const filteredProviderRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return providerRows;
    }

    return providerRows.filter((provider) =>
      [
        provider.display_name,
        provider.provider_slug,
        ...provider.targets.flatMap((target) => [target.label, target.qualified_model, target.model_name]),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [providerRows, search]);

  return (
    <AgchainPageFrame className="gap-4 py-6">
      <ShellPageHeader
        title="Models"
        description="Configure provider access and inspect the curated global model targets available under each provider."
      />

      <AgchainModelsTable
        providerRows={filteredProviderRows}
        loading={listLoading || providersLoading}
        selectedProviderSlug={selectedProviderSlug}
        onConfigure={selectProvider}
        headerControls={<AgchainModelsToolbar search={search} onSearchChange={setSearch} error={error} />}
      />

      <AgchainModelInspector
        open={Boolean(selectedProvider)}
        providerRow={selectedProvider}
        providers={providers}
        selectedTarget={selectedTarget}
        recentHealthChecks={recentHealthChecks}
        loading={detailLoading}
        error={detailError}
        saving={mutating}
        refreshing={refreshing}
        onOpenChange={(open) => {
          if (!open) {
            closeProvider();
          }
        }}
        onSelectTarget={selectTarget}
        onRefresh={refreshModelHealth}
        onCreate={createModel}
        onUpdate={updateModel}
        onConnect={connectKey}
        onDisconnect={disconnectKey}
      />
    </AgchainPageFrame>
  );
}
