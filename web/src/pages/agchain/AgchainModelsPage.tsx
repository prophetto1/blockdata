import { useMemo, useState } from 'react';
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
    <AgchainPageFrame className="gap-6 py-8">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AGChain platform</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Models</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Configure provider access and inspect the curated global model targets available under each provider.
        </p>
      </section>

      <AgchainModelsToolbar search={search} onSearchChange={setSearch} error={error} />

      <AgchainModelsTable
        providerRows={filteredProviderRows}
        loading={listLoading || providersLoading}
        selectedProviderSlug={selectedProviderSlug}
        onConfigure={selectProvider}
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
