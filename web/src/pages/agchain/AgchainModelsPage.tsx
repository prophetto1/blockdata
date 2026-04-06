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
      <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden">
          <div className="h-44 w-[88rem] rounded-full bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.26),_transparent_70%)] blur-[88px]" />
        </div>

        <div className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-4 py-6 backdrop-blur sm:px-6">
          <ShellPageHeader
            title="Models"
            description="Configure provider access and inspect the curated global model targets available under each provider."
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-500/90">
              Project-scoped credentials
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              Registry is managed by AGChain Admin
            </span>
          </div>
        </div>

      <div className="grid min-h-0 flex-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
        <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-card/80 p-1 shadow-sm">
          <AgchainModelsTable
            providerRows={filteredProviderRows}
            loading={listLoading || providersLoading}
            selectedProviderSlug={selectedProviderSlug}
            onConfigure={selectProvider}
            headerControls={<AgchainModelsToolbar search={search} onSearchChange={setSearch} error={error} />}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-gradient-to-b from-card/90 to-card/50">
          {selectedProvider ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 rounded-t-2xl border-b border-border/70 bg-background/60 px-4 py-4 sm:px-6">
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
              <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="px-4 py-4 md:px-5 md:py-5">
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
              <div className="mb-1 rounded-full border border-dashed border-border/90 bg-background/80 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted-foreground">
                  <path d="M12 3v18" strokeWidth="1.75" strokeLinecap="round"/>
                  <path d="M5 5h4l2 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5Z" strokeWidth="1.75" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">No provider selected</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                Select a provider from the table to configure access and inspect model targets.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </AgchainPageFrame>
  );
}
