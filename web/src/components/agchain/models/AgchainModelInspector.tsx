import { useEffect, useState } from 'react';
import {
  type AgchainModelHealthCheck,
  type AgchainModelTarget,
  type AgchainModelTargetWrite,
  type AgchainProviderDefinition,
} from '@/lib/agchainModels';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  buildDraftFromModelTarget,
  ModelTargetFormFields,
  modelTargetDraftToWrite,
  type ModelTargetDraft,
} from './AgchainModelsToolbar';

type AgchainModelInspectorProps = {
  selectedModel: AgchainModelTarget | null;
  providers: AgchainProviderDefinition[];
  providerDefinition: AgchainProviderDefinition | null;
  recentHealthChecks: AgchainModelHealthCheck[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<unknown>;
  onUpdate: (payload: Partial<AgchainModelTargetWrite>) => Promise<unknown>;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

export function AgchainModelInspector({
  selectedModel,
  providers,
  providerDefinition,
  recentHealthChecks,
  loading,
  error,
  saving,
  refreshing,
  onRefresh,
  onUpdate,
}: AgchainModelInspectorProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<ModelTargetDraft | null>(null);

  useEffect(() => {
    if (selectedModel) {
      setDraft(buildDraftFromModelTarget(selectedModel));
    } else {
      setDraft(null);
    }
  }, [selectedModel]);

  async function handleUpdate() {
    if (!draft || !selectedModel) {
      return;
    }

    const provider = providers.find((item) => item.provider_slug === selectedModel.provider_slug) ?? null;
    const payload = modelTargetDraftToWrite(draft, provider);
    await onUpdate({
      label: payload.label,
      api_base: payload.api_base,
      auth_kind: payload.auth_kind,
      supports_evaluated: payload.supports_evaluated,
      supports_judge: payload.supports_judge,
      enabled: payload.enabled,
      probe_strategy: payload.probe_strategy,
      notes: payload.notes,
      capabilities_jsonb: payload.capabilities_jsonb,
    });
    setEditOpen(false);
  }

  return (
    <>
      <aside className="rounded-3xl border border-border/70 bg-card/70 shadow-sm">
        <div className="border-b border-border/70 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Inspector</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a model target to review health history, provider metadata, and editable settings.
          </p>
        </div>
        <div className="space-y-6 px-6 py-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading model detail...</p>
          ) : selectedModel ? (
            <>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">{selectedModel.label}</h3>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{selectedModel.qualified_model}</p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Provider</p>
                  <p className="mt-1 text-foreground">{selectedModel.provider_display_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Auth Readiness</p>
                  <p className="mt-1 text-foreground">{selectedModel.credential_status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Health</p>
                  <p className="mt-1 text-foreground">{selectedModel.health_status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last Checked</p>
                  <p className="mt-1 text-foreground">{formatTimestamp(selectedModel.health_checked_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Probe Strategy</p>
                  <p className="mt-1 text-foreground">{selectedModel.probe_strategy}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">API Base</p>
                  <p className="mt-1 text-foreground">{selectedModel.api_base_display ?? 'Provider default'}</p>
                </div>
              </div>

              {providerDefinition ? (
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Provider Definition</p>
                  <p className="mt-2 text-sm text-foreground">
                    {providerDefinition.display_name} supports {providerDefinition.supported_auth_kinds.join(', ')}.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={() => void onRefresh()} disabled={refreshing}>
                  {refreshing ? 'Refreshing...' : 'Refresh Health'}
                </Button>
                <Button type="button" onClick={() => setEditOpen(true)}>
                  Edit Model
                </Button>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Recent health checks
                </h4>
                <div className="mt-3 space-y-3">
                  {recentHealthChecks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No health checks recorded yet.</p>
                  ) : (
                    recentHealthChecks.map((check) => (
                      <article key={check.health_check_id} className="rounded-2xl border border-border/70 bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{check.status}</p>
                          <p className="text-xs text-muted-foreground">{formatTimestamp(check.checked_at)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {check.probe_strategy}
                          {check.latency_ms ? ` • ${check.latency_ms} ms` : ''}
                        </p>
                        {check.error_message ? (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{check.error_message}</p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                  {error}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a row from the table to inspect a model target.</p>
          )}
        </div>
      </aside>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit Model</SheetTitle>
            <SheetDescription>
              Update mutable metadata for the selected AG chain model target.
            </SheetDescription>
          </SheetHeader>
          {draft ? (
            <div className="mt-6">
              <ModelTargetFormFields
                draft={draft}
                providers={providers}
                onChange={setDraft}
                providerLocked
              />
            </div>
          ) : null}
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleUpdate()} disabled={saving || !draft}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
