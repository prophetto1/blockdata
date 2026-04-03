import { useMemo, useState } from 'react';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgchainModelInspectorSession } from '@/components/agchain/models/AgchainModelInspector';
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
    <AgchainPageFrame className="gap-0 p-0">
      <ShellPageHeader
        title="Models"
        description="Configure provider access and inspect the curated global model targets available under each provider."
      />

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
        <div className="flex min-h-0 flex-col border-b border-border p-1 lg:border-b-0 lg:border-r">
          <AgchainModelsTable
            providerRows={filteredProviderRows}
            loading={listLoading || providersLoading}
            selectedProviderSlug={selectedProviderSlug}
            onConfigure={selectProvider}
            headerControls={<AgchainModelsToolbar search={search} onSearchChange={setSearch} error={error} />}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {selectedProvider ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {selectedProvider.display_name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure provider access and inspect curated model targets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeProvider}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Close inspector"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="px-4 py-4">
                <AgchainModelInspectorSession
                  key={selectedProvider.provider_slug}
                  providerRow={selectedProvider}
                  providers={providers}
                  selectedTarget={selectedTarget}
                  recentHealthChecks={recentHealthChecks}
                  loading={detailLoading}
                  error={detailError}
                  saving={mutating}
                  refreshing={refreshing}
                  onSelectTarget={selectTarget}
                  onRefresh={refreshModelHealth}
                  onCreate={createModel}
                  onUpdate={updateModel}
                  onConnect={connectKey}
                  onDisconnect={disconnectKey}
                />
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <h2 className="text-lg font-semibold text-foreground">No provider selected</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                Select a provider from the table to configure access and inspect model targets.
              </p>
            </div>
          )}
        </div>
      </div>
    </AgchainPageFrame>
  );
}
