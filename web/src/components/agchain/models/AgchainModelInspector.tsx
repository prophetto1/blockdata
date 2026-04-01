import { useEffect, useMemo, useState } from 'react';
import type { AgchainProviderRow } from '@/lib/agchainModelProviders';
import {
  type AgchainModelHealthCheck,
  type AgchainModelTarget,
  type AgchainModelTargetWrite,
  type AgchainProviderDefinition,
} from '@/lib/agchainModels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  buildDraftFromModelTarget,
  createEmptyModelTargetDraft,
  ModelTargetFormFields,
  modelTargetDraftToWrite,
  type ModelTargetDraft,
} from './AgchainModelsToolbar';
import { AgchainModelCredentialPanel } from './AgchainModelCredentialPanel';

type AgchainModelInspectorProps = {
  open: boolean;
  providerRow: AgchainProviderRow | null;
  providers: AgchainProviderDefinition[];
  selectedTarget: AgchainModelTarget | null;
  recentHealthChecks: AgchainModelHealthCheck[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  refreshing: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTarget: (modelTargetId: string) => void;
  onRefresh: (modelTargetId: string) => Promise<unknown>;
  onCreate: (payload: AgchainModelTargetWrite) => Promise<unknown>;
  onUpdate: (modelTargetId: string, payload: Partial<AgchainModelTargetWrite>) => Promise<unknown>;
  onConnect: (apiKey: string) => Promise<unknown>;
  onDisconnect: () => Promise<unknown>;
};

const STATUS_BADGE: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  configured: 'green',
  needs_attention: 'red',
  not_configured: 'yellow',
  no_targets: 'gray',
};

const STATUS_LABEL: Record<string, string> = {
  configured: 'Configured',
  needs_attention: 'Needs attention',
  not_configured: 'Not configured',
  no_targets: 'No targets',
};

const HEALTH_BADGE: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  healthy: 'green',
  error: 'red',
  unhealthy: 'red',
  degraded: 'yellow',
  unknown: 'gray',
};

const AUTH_BADGE: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  ready: 'green',
  configured: 'green',
  missing: 'yellow',
  disconnected: 'yellow',
  invalid: 'red',
  not_required: 'gray',
  unknown: 'gray',
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

function buildCreateDraftForProvider(providers: AgchainProviderDefinition[], providerSlug: string): ModelTargetDraft {
  const baseDraft = createEmptyModelTargetDraft(providers);
  const provider = providers.find((item) => item.provider_slug === providerSlug) ?? null;
  return {
    ...baseDraft,
    provider_slug: providerSlug,
    auth_kind: provider?.supported_auth_kinds[0] ?? baseDraft.auth_kind,
  };
}

function formatCompatibility(target: AgchainModelTarget) {
  if (target.supports_evaluated && target.supports_judge) return 'Evaluated + Judge';
  if (target.supports_evaluated) return 'Evaluated';
  if (target.supports_judge) return 'Judge';
  return 'None';
}

export function AgchainModelInspector({
  open,
  providerRow,
  providers,
  selectedTarget,
  recentHealthChecks,
  loading,
  error,
  saving,
  refreshing,
  onOpenChange,
  onSelectTarget,
  onRefresh,
  onCreate,
  onUpdate,
  onConnect,
  onDisconnect,
}: AgchainModelInspectorProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ModelTargetDraft | null>(null);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ModelTargetDraft | null>(null);

  useEffect(() => {
    if (providerRow) {
      setCreateDraft(buildCreateDraftForProvider(providers, providerRow.provider_slug));
    } else {
      setCreateDraft(null);
      setCreateOpen(false);
      setEditingTargetId(null);
      setEditDraft(null);
    }
  }, [providerRow, providers]);

  const activeTargetId = selectedTarget?.model_target_id ?? null;
  const providerDefinition = providerRow?.provider_definition ?? null;
  const title = providerRow?.display_name ?? 'Provider';
  const targets = providerRow?.targets ?? [];

  const activeTargetForCard = useMemo(
    () => targets.find((target) => target.model_target_id === activeTargetId) ?? null,
    [activeTargetId, targets],
  );

  async function handleCreate() {
    if (!providerRow || !createDraft) {
      return;
    }

    const payload = modelTargetDraftToWrite(createDraft, providerDefinition);
    await onCreate(payload);
    setCreateOpen(false);
  }

  async function handleSaveEdit() {
    if (!providerRow || !editingTargetId || !editDraft) {
      return;
    }

    const payload = modelTargetDraftToWrite(editDraft, providerDefinition);
    await onUpdate(editingTargetId, {
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
    setEditingTargetId(null);
    setEditDraft(null);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCreateOpen(false);
          setEditingTargetId(null);
          setEditDraft(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Configure provider access and inspect the curated global model targets under this provider.
          </SheetDescription>
        </SheetHeader>

        {providerRow ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{providerRow.display_name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {providerDefinition?.supported_auth_kinds.join(', ') || 'No auth kinds declared'}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE[providerRow.status] ?? 'gray'} size="sm">
                  {STATUS_LABEL[providerRow.status] ?? providerRow.status}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Targets</p>
                  <p className="mt-1 text-foreground">{providerRow.target_count}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last checked</p>
                  <p className="mt-1 text-foreground">{formatTimestamp(providerRow.last_checked_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Default probe</p>
                  <p className="mt-1 text-foreground">{providerDefinition?.default_probe_strategy ?? 'provider_default'}</p>
                </div>
              </div>
            </section>

            <AgchainModelCredentialPanel
              providerRow={providerRow}
              saving={saving}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
            />

            <section className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Curated model targets
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Refresh, edit, or create targets under this provider without leaving the page.
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => setCreateOpen((value) => !value)}>
                  {createOpen ? 'Close Create' : 'Add Target'}
                </Button>
              </div>

              {createOpen && createDraft ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h5 className="text-sm font-semibold text-foreground">Add Model Target</h5>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          saving ||
                          !createDraft.label.trim() ||
                          !createDraft.model_name.trim() ||
                          !createDraft.qualified_model.trim()
                        }
                        onClick={() => void handleCreate()}
                      >
                        {saving ? 'Creating...' : 'Create Target'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ModelTargetFormFields
                      draft={createDraft}
                      providers={providers}
                      onChange={setCreateDraft}
                      providerLocked
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                {targets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No curated global model targets have been added for this provider yet.
                  </p>
                ) : (
                  targets.map((target) => {
                    const isActive = activeTargetId === target.model_target_id;
                    const isEditing = editingTargetId === target.model_target_id;
                    return (
                      <article
                        key={target.model_target_id}
                        className={`rounded-2xl border p-4 ${
                          isActive ? 'border-primary/50 bg-accent/20' : 'border-border/70 bg-card'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            type="button"
                            className="min-w-0 text-left"
                            onClick={() => onSelectTarget(target.model_target_id)}
                          >
                            <p className="text-sm font-semibold text-foreground">{target.label}</p>
                            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                              {target.qualified_model}
                            </p>
                          </button>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={AUTH_BADGE[target.credential_status] ?? 'gray'} size="sm">
                              {target.credential_status}
                            </Badge>
                            <Badge variant={HEALTH_BADGE[target.health_status] ?? 'gray'} size="sm">
                              {target.health_status}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Auth</p>
                            <p className="mt-1 text-foreground">{target.auth_kind}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last checked</p>
                            <p className="mt-1 text-foreground">{formatTimestamp(target.health_checked_at)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Compatibility</p>
                            <p className="mt-1 text-foreground">{formatCompatibility(target)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onSelectTarget(target.model_target_id);
                              void onRefresh(target.model_target_id);
                            }}
                            disabled={refreshing}
                          >
                            {refreshing && isActive ? 'Refreshing...' : 'Refresh Health'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onSelectTarget(target.model_target_id);
                              setEditingTargetId(target.model_target_id);
                              setEditDraft(buildDraftFromModelTarget(target));
                            }}
                          >
                            Edit Target
                          </Button>
                        </div>

                        {isEditing && editDraft ? (
                          <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <h5 className="text-sm font-semibold text-foreground">Edit Model Target</h5>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTargetId(null);
                                    setEditDraft(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="button" size="sm" disabled={saving} onClick={() => void handleSaveEdit()}>
                                  {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                              </div>
                            </div>
                            <div className="mt-4">
                              <ModelTargetFormFields
                                draft={editDraft}
                                providers={providers}
                                onChange={setEditDraft}
                                providerLocked
                              />
                            </div>
                          </div>
                        ) : null}

                        {isActive ? (
                          <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                            <h5 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Recent health checks
                            </h5>
                            {loading ? (
                              <p className="mt-3 text-sm text-muted-foreground">Loading model detail...</p>
                            ) : recentHealthChecks.length === 0 ? (
                              <p className="mt-3 text-sm text-muted-foreground">No health checks recorded yet.</p>
                            ) : (
                              <div className="mt-3 space-y-3">
                                {recentHealthChecks.map((check) => (
                                  <article
                                    key={check.health_check_id}
                                    className="rounded-xl border border-border/70 bg-card px-4 py-3"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-sm font-medium text-foreground">{check.status}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatTimestamp(check.checked_at)}
                                      </p>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      {check.probe_strategy}
                                      {check.latency_ms ? ` • ${check.latency_ms} ms` : ''}
                                    </p>
                                    {check.error_message ? (
                                      <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                                        {check.error_message}
                                      </p>
                                    ) : null}
                                  </article>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                {error}
              </p>
            ) : null}

            {activeTargetForCard ? (
              <p className="text-sm text-muted-foreground">
                Active target: <span className="font-medium text-foreground">{activeTargetForCard.label}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
