import { useMemo, useState } from 'react';
import { AgchainModelInspector } from '@/components/agchain/models/AgchainModelInspector';
import { AgchainModelsTable } from '@/components/agchain/models/AgchainModelsTable';
import { AgchainModelsToolbar } from '@/components/agchain/models/AgchainModelsToolbar';
import { useAgchainModels } from '@/hooks/agchain/useAgchainModels';

export default function AgchainModelsPage() {
  const [search, setSearch] = useState('');
  const {
    items,
    providers,
    selectedModelId,
    selectedModel,
    recentHealthChecks,
    providerDefinition,
    listLoading,
    providersLoading,
    detailLoading,
    mutating,
    refreshing,
    error,
    detailError,
    selectModel,
    createModel,
    updateSelectedModel,
    refreshSelectedModelHealth,
  } = useAgchainModels();

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.label, item.provider_display_name, item.qualified_model, item.model_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [items, search]);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 py-8">
        <AgchainModelsToolbar
          providers={providers}
          search={search}
          onSearchChange={setSearch}
          onCreate={createModel}
          creating={mutating}
          error={error}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,0.95fr)]">
          <AgchainModelsTable
            items={filteredItems}
            loading={listLoading || providersLoading}
            selectedModelId={selectedModelId}
            onSelect={selectModel}
          />
          <AgchainModelInspector
            selectedModel={selectedModel}
            providers={providers}
            providerDefinition={providerDefinition}
            recentHealthChecks={recentHealthChecks}
            loading={detailLoading}
            error={detailError}
            saving={mutating}
            refreshing={refreshing}
            onRefresh={refreshSelectedModelHealth}
            onUpdate={updateSelectedModel}
          />
        </div>
      </div>
    </div>
  );
}
