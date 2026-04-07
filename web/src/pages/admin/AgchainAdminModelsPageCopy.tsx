import { useEffect, useMemo, useState } from 'react';
import { IconCirclePlus, IconClock, IconEdit, IconRefresh, IconSearch } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useAgchainAdminRegistry } from '@/hooks/agchain/useAgchainAdminRegistry';
import { cn } from '@/lib/utils';
import {
  createAgchainModelTarget,
  createAgchainProviderDefinition,
  updateAgchainModelTarget,
  updateAgchainProviderDefinition,
  type AgchainModelTarget,
  type AgchainModelTargetWrite,
  type AgchainProviderDefinition,
  type AgchainProviderDefinitionWrite,
} from '@/lib/agchainModels';

type ProviderDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; provider: AgchainProviderDefinition };

type ModelDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; model: AgchainModelTarget };

type ProviderFormDraft = AgchainProviderDefinitionWrite;

type ModelFormDraft = {
  label: string;
  provider_slug: string;
  provider_qualifier: string;
  model_name: string;
  qualified_model: string;
  api_base: string;
  auth_kind: string;
  supports_evaluated: boolean;
  supports_judge: boolean;
  enabled: boolean;
  probe_strategy: string;
  notes: string;
};

const PROBE_STRATEGIES = [
  'provider_default',
  'http_openai_models',
  'http_anthropic_models',
  'http_google_models',
  'custom_http',
  'none',
] as const;

const AUTH_KIND_OPTIONS = ['api_key', 'access_token', 'credential_json', 'service_account', 'connection'] as const;

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

const surfaceSearchInputClass =
  'h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring';

const surfaceInlineActionButtonClass =
  'inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50';

const selectedSurfaceRowStyle = {
  backgroundColor: 'var(--app-table-row-selected-bg)',
  boxShadow: 'inset 0 0 0 1px var(--app-table-row-selected-ring)',
};

function createEmptyProviderDraft(): ProviderFormDraft {
  return {
    provider_slug: '',
    display_name: '',
    provider_category: 'model_provider',
    credential_form_kind: 'basic_api_key',
    env_var_name: '',
    docs_url: '',
    supported_auth_kinds: ['api_key'],
    default_probe_strategy: 'provider_default',
    default_capabilities: {},
    supports_custom_base_url: false,
    supports_model_args: true,
    enabled: true,
    sort_order: 100,
    notes: '',
  };
}

function buildProviderDraft(provider: AgchainProviderDefinition): ProviderFormDraft {
  return {
    provider_slug: provider.provider_slug,
    display_name: provider.display_name,
    provider_category: provider.provider_category,
    credential_form_kind: provider.credential_form_kind,
    env_var_name: provider.env_var_name ?? '',
    docs_url: provider.docs_url ?? '',
    supported_auth_kinds: provider.supported_auth_kinds,
    default_probe_strategy: provider.default_probe_strategy,
    default_capabilities: provider.default_capabilities,
    supports_custom_base_url: provider.supports_custom_base_url,
    supports_model_args: provider.supports_model_args,
    enabled: provider.enabled,
    sort_order: provider.sort_order,
    notes: provider.notes ?? '',
  };
}

function createEmptyModelDraft(
  providers: AgchainProviderDefinition[],
  providerSlug?: string,
): ModelFormDraft {
  const firstProvider = providers[0];
  const baseProvider =
    providers.find((provider) => provider.provider_slug === providerSlug) ?? firstProvider;
  return {
    label: '',
    provider_slug: baseProvider?.provider_slug ?? '',
    provider_qualifier: '',
    model_name: '',
    qualified_model: '',
    api_base: '',
    auth_kind: baseProvider?.supported_auth_kinds[0] ?? 'api_key',
    supports_evaluated: true,
    supports_judge: false,
    enabled: true,
    probe_strategy: 'provider_default',
    notes: '',
  };
}

function buildModelDraft(model: AgchainModelTarget): ModelFormDraft {
  return {
    label: model.label,
    provider_slug: model.provider_slug,
    provider_qualifier: model.provider_qualifier ?? '',
    model_name: model.model_name,
    qualified_model: model.qualified_model,
    api_base: model.api_base_display ?? '',
    auth_kind: model.auth_kind,
    supports_evaluated: model.supports_evaluated,
    supports_judge: model.supports_judge,
    enabled: model.enabled,
    probe_strategy: model.probe_strategy,
    notes: model.notes ?? '',
  };
}

function providerCategoryLabel(value: 'model_provider' | 'cloud_provider') {
  return value === 'cloud_provider' ? 'Cloud provider' : 'Model provider';
}

const compactModelTimestampFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatCompactModelTimestamp(value: string | null | undefined) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return compactModelTimestampFormat.format(parsed);
}

const ADMIN_MODELS_UI_STATE_KEY = 'agchain-admin-models-ui';

function readAdminModelsUiState() {
  if (typeof window === 'undefined') {
    return {
      providerSearch: '',
      modelSearch: '',
      selectedProviderSlug: '',
    };
  }

  try {
    const raw = window.sessionStorage.getItem(ADMIN_MODELS_UI_STATE_KEY);
    if (!raw) {
      return {
        providerSearch: '',
        modelSearch: '',
        selectedProviderSlug: '',
      };
    }

    const parsed = JSON.parse(raw) as Partial<{
      providerSearch: string;
      modelSearch: string;
      selectedProviderSlug: string;
    }>;

    return {
      providerSearch: parsed.providerSearch ?? '',
      modelSearch: parsed.modelSearch ?? '',
      selectedProviderSlug: parsed.selectedProviderSlug ?? '',
    };
  } catch {
    return {
      providerSearch: '',
      modelSearch: '',
      selectedProviderSlug: '',
    };
  }
}

function persistAdminModelsUiState(nextState: {
  providerSearch: string;
  modelSearch: string;
  selectedProviderSlug: string;
}) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ADMIN_MODELS_UI_STATE_KEY, JSON.stringify(nextState));
}

function ProviderEnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge variant={enabled ? 'green' : 'gray'} size="sm">
      {enabled ? 'Enabled' : 'Disabled'}
    </Badge>
  );
}

function ModelCompatibilityBadges({ model }: { model: AgchainModelTarget }) {
  const hasCompatibility = model.supports_evaluated || model.supports_judge;

  return (
    <div className="flex flex-wrap gap-1">
      {model.supports_evaluated ? (
        <Badge variant="cyan" size="sm">
          Eval
        </Badge>
      ) : null}
      {model.supports_judge ? (
        <Badge variant="violet" size="sm">
          Judge
        </Badge>
      ) : null}
      {!hasCompatibility ? (
        <Badge variant="gray" size="sm">
          None
        </Badge>
      ) : null}
    </div>
  );
}

export default function AgchainAdminModelsPage() {
  useShellHeaderTitle({
    title: 'AGChain Admin Models',
    breadcrumbs: ['AGChain Admin', 'Models'],
  });

  const {
    providers: cachedProviders,
    models: cachedModels,
    status,
    error: loadError,
    refresh,
  } = useAgchainAdminRegistry();
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState(() => readAdminModelsUiState().modelSearch);
  const [providerSearch, setProviderSearch] = useState(() => readAdminModelsUiState().providerSearch);
  const isReadOnly = false;
  const [providerDialog, setProviderDialog] = useState<ProviderDialogState>({ mode: 'closed' });
  const [modelDialog, setModelDialog] = useState<ModelDialogState>({ mode: 'closed' });
  const [providerDraft, setProviderDraft] = useState<ProviderFormDraft>(createEmptyProviderDraft);
  const [modelDraft, setModelDraft] = useState<ModelFormDraft>(createEmptyModelDraft([]));
  const [selectedProviderSlug, setSelectedProviderSlug] = useState(
    () => readAdminModelsUiState().selectedProviderSlug,
  );
  const providers = cachedProviders ?? [];
  const models = cachedModels ?? [];
  const loading = status === 'loading' && cachedProviders === null && cachedModels === null;
  const error = mutationError ?? loadError;

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.provider_slug === selectedProviderSlug) ?? null,
    [providers, selectedProviderSlug],
  );

  const filteredProviders = useMemo(() => {
    if (!providerSearch.trim()) return providers;
    const normalized = providerSearch.trim().toLowerCase();
    return providers.filter((provider) =>
      `${provider.display_name} ${provider.provider_slug} ${provider.credential_form_kind} ${provider.supported_auth_kinds.join(' ')} ${providerCategoryLabel(provider.provider_category)}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [providerSearch, providers]);

  useEffect(() => {
    if (providers.length === 0) {
      setSelectedProviderSlug('');
      return;
    }

    if (!selectedProvider) {
      setSelectedProviderSlug(providers[0].provider_slug);
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    persistAdminModelsUiState({
      providerSearch,
      modelSearch: search,
      selectedProviderSlug,
    });
  }, [providerSearch, search, selectedProviderSlug]);

  const filteredModels = useMemo(() => {
    if (!selectedProvider) return [];
    const normalized = search.trim().toLowerCase();
    const providerModels = models.filter((model) => model.provider_slug === selectedProvider.provider_slug);
    if (!normalized) return providerModels;
    return providerModels.filter((model) =>
      [model.label, model.provider_display_name, model.model_name, model.qualified_model]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [models, search, selectedProvider]);


  const providerEmptyMessage = loading
    ? 'Loading provider registry...'
    : providerSearch.trim()
      ? 'No provider matches this filter.'
      : 'No providers have been configured yet.';

  const modelEmptyMessage = !selectedProvider
    ? 'Select a provider to see scoped model targets.'
    : loading
      ? 'Loading model targets...'
      : search.trim()
        ? 'No model targets match the current filter.'
        : 'No model targets for this provider yet.';

  function openCreateProviderDialog() {
    setProviderDraft(createEmptyProviderDraft());
    setProviderDialog({ mode: 'create' });
  }

  function openEditProviderDialog(provider: AgchainProviderDefinition) {
    setProviderDraft(buildProviderDraft(provider));
    setSelectedProviderSlug(provider.provider_slug);
    setProviderDialog({ mode: 'edit', provider });
  }

  function openCreateModelDialog() {
    setModelDraft(createEmptyModelDraft(providers, selectedProvider?.provider_slug));
    setModelDialog({ mode: 'create' });
  }

  function openEditModelDialog(model: AgchainModelTarget) {
    setSelectedProviderSlug(model.provider_slug);
    setModelDraft(buildModelDraft(model));
    setModelDialog({ mode: 'edit', model });
  }

  async function handleSaveProvider() {
    setSaving(true);
    try {
      if (providerDialog.mode === 'edit') {
        await updateAgchainProviderDefinition(providerDialog.provider.provider_slug, providerDraft);
        setMessage(`${providerDraft.display_name} updated.`);
      } else {
        await createAgchainProviderDefinition(providerDraft);
        setMessage(`${providerDraft.display_name} added.`);
      }
      setMutationError(null);
      setProviderDialog({ mode: 'closed' });
      await refresh();
    } catch (nextError) {
      setMutationError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveModel() {
    const payload: AgchainModelTargetWrite = {
      label: modelDraft.label,
      provider_slug: modelDraft.provider_slug,
      provider_qualifier: modelDraft.provider_qualifier,
      model_name: modelDraft.model_name,
      qualified_model: modelDraft.qualified_model,
      api_base: modelDraft.api_base,
      auth_kind: modelDraft.auth_kind,
      credential_source_jsonb: {},
      model_args_jsonb: {},
      supports_evaluated: modelDraft.supports_evaluated,
      supports_judge: modelDraft.supports_judge,
      capabilities_jsonb: {},
      probe_strategy: modelDraft.probe_strategy,
      notes: modelDraft.notes,
      enabled: modelDraft.enabled,
    };

    setSaving(true);
    try {
      if (modelDialog.mode === 'edit') {
        await updateAgchainModelTarget(modelDialog.model.model_target_id, payload);
        setMessage(`${modelDraft.label} updated.`);
      } else {
        await createAgchainModelTarget(payload);
        setMessage(`${modelDraft.label} added.`);
      }
      setMutationError(null);
      setModelDialog({ mode: 'closed' });
      await refresh();
    } catch (nextError) {
      setMutationError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-full min-h-0 flex-col gap-3 p-2">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {message}
            </div>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
              <label className="relative min-w-0 flex-1 lg:max-w-[360px]">
                <span className="sr-only">Search providers</span>
                <IconSearch
                  size={14}
                  stroke={1.8}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={providerSearch}
                  onChange={(event) => setProviderSearch(event.currentTarget.value)}
                  placeholder="Search providers"
                  className={surfaceSearchInputClass}
                />
              </label>

              <label className="relative min-w-0 flex-[1.2]">
                <span className="sr-only">Search models</span>
                <IconSearch
                  size={14}
                  stroke={1.8}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="admin-model-search"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Search models"
                  disabled={!selectedProvider}
                  className={`${surfaceSearchInputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                />
              </label>

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground xl:inline">
                  {selectedProvider ? selectedProvider.display_name : 'Select a provider'}
                </span>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className={surfaceInlineActionButtonClass}
                >
                  <IconRefresh size={12} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={openCreateProviderDialog}
                  disabled={isReadOnly}
                  className={surfaceInlineActionButtonClass}
                >
                  <IconCirclePlus size={12} />
                  Add Provider
                </button>
                <button
                  type="button"
                  onClick={openCreateModelDialog}
                  disabled={!selectedProvider || isReadOnly}
                  className={surfaceInlineActionButtonClass}
                >
                  <IconCirclePlus size={12} />
                  Add Model
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[430px_minmax(0,1fr)]">
              <section className="min-h-0 overflow-auto border-b border-border lg:border-b-0 lg:border-r">
                <table className="w-full text-left" aria-label="Provider registry">
                  <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pl-5 pr-3 font-medium">Provider</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="py-2 pl-3 pr-5 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProviders.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          {providerEmptyMessage}
                        </td>
                      </tr>
                    ) : (
                      filteredProviders.map((provider) => {
                        const isSelected = provider.provider_slug === selectedProviderSlug;
                        return (
                          <tr
                            key={provider.provider_slug}
                            className={cn('border-b border-border/60 hover:bg-accent/50', isSelected && 'hover:bg-transparent')}
                            style={isSelected ? selectedSurfaceRowStyle : undefined}
                          >
                            <td className="py-2 pl-5 pr-3 align-middle">
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  className="min-w-0 text-left"
                                  onClick={() => setSelectedProviderSlug(provider.provider_slug)}
                                >
                                  <div className={cn('truncate text-sm font-medium', isSelected ? 'text-foreground' : 'text-foreground')}>
                                    {provider.display_name}
                                  </div>
                                  <div className={cn('truncate text-xs', isSelected ? 'text-foreground/80' : 'text-muted-foreground')}>
                                    {provider.provider_slug} | {provider.credential_form_kind}
                                  </div>
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <ProviderEnabledBadge enabled={provider.enabled} />
                            </td>
                            <td className="py-2 pl-3 pr-5 align-middle text-right">
                              <button
                                type="button"
                                onClick={() => openEditProviderDialog(provider)}
                                disabled={isReadOnly}
                                aria-label={`Edit ${provider.display_name}`}
                                className={surfaceInlineActionButtonClass}
                              >
                                <IconEdit size={12} />
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </section>

              <section className="min-h-0 overflow-auto">
                <table className="w-full text-left" aria-label="Model targets">
                  <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pl-5 pr-3 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Compatibility</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Updated</th>
                      <th className="py-2 pl-3 pr-5 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedProvider || filteredModels.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          {modelEmptyMessage}
                        </td>
                      </tr>
                    ) : (
                      filteredModels.map((model) => (
                        <tr key={model.model_target_id} className="border-b border-border/60 hover:bg-accent/50">
                          <td className="py-2 pl-5 pr-3 align-middle">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">{model.label}</div>
                              <div className="truncate text-xs text-muted-foreground">{model.qualified_model}</div>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <ModelCompatibilityBadges model={model} />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <ProviderEnabledBadge enabled={model.enabled} />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <IconClock size={12} />
                              {formatCompactModelTimestamp(model.updated_at)}
                            </span>
                          </td>
                          <td className="py-2 pl-3 pr-5 align-middle text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (!isReadOnly) openEditModelDialog(model);
                              }}
                              disabled={isReadOnly}
                              aria-label={`Edit ${model.label}`}
                              className={surfaceInlineActionButtonClass}
                            >
                              <IconEdit size={12} />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          </section>
        </div>
      </div>

      <ProviderDialog
        state={providerDialog}
        draft={providerDraft}
        saving={saving}
        onDraftChange={setProviderDraft}
        onOpenChange={(open) => setProviderDialog(open ? providerDialog : { mode: 'closed' })}
        onSubmit={handleSaveProvider}
      />

      <ModelDialog
        state={modelDialog}
        providers={providers}
        draft={modelDraft}
        saving={saving}
        onDraftChange={setModelDraft}
        onOpenChange={(open) => setModelDialog(open ? modelDialog : { mode: 'closed' })}
        onSubmit={handleSaveModel}
      />
    </>
  );
}

function ProviderDialog({
  state,
  draft,
  saving,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  state: ProviderDialogState;
  draft: ProviderFormDraft;
  saving: boolean;
  onDraftChange: (draft: ProviderFormDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
}) {
  const open = state.mode !== 'closed';
  const isEdit = state.mode === 'edit';

  function toggleAuthKind(authKind: string, checked: boolean) {
    const nextKinds = checked
      ? [...draft.supported_auth_kinds, authKind]
      : draft.supported_auth_kinds.filter((item) => item !== authKind);
    onDraftChange({
      ...draft,
      supported_auth_kinds: nextKinds.length > 0 ? nextKinds : ['api_key'],
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      {open ? (
        <DialogContent className="w-[min(44rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]">
          <DialogCloseTrigger />
          <DialogTitle>{isEdit ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
          <DialogDescription>Manage provider metadata, form behavior, and auth capabilities.</DialogDescription>
          <DialogBody>
            <div className="grid gap-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="provider-slug" className="text-sm font-medium text-foreground">
                    Provider Slug
                  </label>
                  <input
                    id="provider-slug"
                    value={draft.provider_slug}
                    disabled={isEdit}
                    onChange={(event) => onDraftChange({ ...draft, provider_slug: event.currentTarget.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="provider-display-name" className="text-sm font-medium text-foreground">
                    Display Name
                  </label>
                  <input
                    id="provider-display-name"
                    value={draft.display_name}
                    onChange={(event) => onDraftChange({ ...draft, display_name: event.currentTarget.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="provider-category" className="text-sm font-medium text-foreground">
                    Category
                  </label>
                  <select
                    id="provider-category"
                    value={draft.provider_category}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        provider_category: event.currentTarget.value as ProviderFormDraft['provider_category'],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="model_provider">Model provider</option>
                    <option value="cloud_provider">Cloud provider</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="provider-form-kind" className="text-sm font-medium text-foreground">
                    Credential Form
                  </label>
                  <select
                    id="provider-form-kind"
                    value={draft.credential_form_kind}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        credential_form_kind: event.currentTarget.value as ProviderFormDraft['credential_form_kind'],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="basic_api_key">basic_api_key</option>
                    <option value="vertex_ai">vertex_ai</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="provider-env-var" className="text-sm font-medium text-foreground">
                    Env Var Name
                  </label>
                  <input
                    id="provider-env-var"
                    value={draft.env_var_name ?? ''}
                    onChange={(event) => onDraftChange({ ...draft, env_var_name: event.currentTarget.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="provider-docs-url" className="text-sm font-medium text-foreground">
                    Docs URL
                  </label>
                  <input
                    id="provider-docs-url"
                    value={draft.docs_url ?? ''}
                    onChange={(event) => onDraftChange({ ...draft, docs_url: event.currentTarget.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-medium text-foreground">Supported Auth Kinds</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {AUTH_KIND_OPTIONS.map((authKind) => (
                    <label key={authKind} className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={draft.supported_auth_kinds.includes(authKind)}
                        onChange={(event) => toggleAuthKind(authKind, event.currentTarget.checked)}
                      />
                      {authKind}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="provider-probe-strategy" className="text-sm font-medium text-foreground">
                    Default Probe Strategy
                  </label>
                  <select
                    id="provider-probe-strategy"
                    value={draft.default_probe_strategy}
                    onChange={(event) => onDraftChange({ ...draft, default_probe_strategy: event.currentTarget.value })}
                    className={inputClass}
                  >
                    {PROBE_STRATEGIES.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="provider-sort-order" className="text-sm font-medium text-foreground">
                    Sort Order
                  </label>
                  <input
                    id="provider-sort-order"
                    type="number"
                    value={draft.sort_order}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        sort_order: Number.parseInt(event.currentTarget.value || '0', 10),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-2 rounded-xl border border-border/70 bg-card/60 p-4 md:grid-cols-3">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.supports_custom_base_url}
                    onChange={(event) =>
                      onDraftChange({ ...draft, supports_custom_base_url: event.currentTarget.checked })
                    }
                  />
                  Supports custom base URL
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.supports_model_args}
                    onChange={(event) => onDraftChange({ ...draft, supports_model_args: event.currentTarget.checked })}
                  />
                  Supports model args
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(event) => onDraftChange({ ...draft, enabled: event.currentTarget.checked })}
                  />
                  Enabled
                </label>
              </div>

              <div className="grid gap-2">
                <label htmlFor="provider-notes" className="text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  id="provider-notes"
                  value={draft.notes ?? ''}
                  onChange={(event) => onDraftChange({ ...draft, notes: event.currentTarget.value })}
                  className={`${inputClass} min-h-24`}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="border-t border-border/70 pt-4">
            <Button type="button" onClick={() => void onSubmit()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </DialogRoot>
  );
}

function ModelDialog({
  state,
  providers,
  draft,
  saving,
  onDraftChange,
  onOpenChange,
  onSubmit,
}: {
  state: ModelDialogState;
  providers: AgchainProviderDefinition[];
  draft: ModelFormDraft;
  saving: boolean;
  onDraftChange: (draft: ModelFormDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
}) {
  const open = state.mode !== 'closed';
  const isEdit = state.mode === 'edit';
  const activeProvider = providers.find((provider) => provider.provider_slug === draft.provider_slug) ?? null;
  const providerAuthKinds = activeProvider?.supported_auth_kinds ?? ['api_key'];
  const providerAuthKindsLabel = providerAuthKinds.join(', ');

  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      {open ? (
        <DialogContent className="w-[min(44rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]">
          <DialogCloseTrigger />
          <DialogTitle>{isEdit ? 'Edit Model Target' : 'Add Model Target'}</DialogTitle>
          <DialogDescription>Manage the curated model-target catalog used across AGChain projects.</DialogDescription>
          <DialogBody>
            <div className="grid gap-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="model-label" className="text-sm font-medium text-foreground">
                    Label
                  </label>
                  <input
                    id="model-label"
                    value={draft.label}
                    onChange={(event) => onDraftChange({ ...draft, label: event.currentTarget.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="model-provider" className="text-sm font-medium text-foreground">
                    Provider
                  </label>
                  <select
                    id="model-provider"
                    value={draft.provider_slug}
                    disabled={isEdit}
                    onChange={(event) => {
                      const nextProvider = providers.find((provider) => provider.provider_slug === event.currentTarget.value);
                      onDraftChange({
                        ...draft,
                        provider_slug: event.currentTarget.value,
                        auth_kind: nextProvider?.supported_auth_kinds[0] ?? draft.auth_kind,
                      });
                    }}
                    className={inputClass}
                  >
                    {providers.map((provider) => (
                      <option key={provider.provider_slug} value={provider.provider_slug}>
                        {provider.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="model-name" className="text-sm font-medium text-foreground">
                    Model Name
                  </label>
                  <input
                    id="model-name"
                    value={draft.model_name}
                    onChange={(event) => onDraftChange({ ...draft, model_name: event.currentTarget.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="qualified-model" className="text-sm font-medium text-foreground">
                    Qualified Model
                  </label>
                  <input
                    id="qualified-model"
                    value={draft.qualified_model}
                    onChange={(event) => onDraftChange({ ...draft, qualified_model: event.currentTarget.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="model-auth-kind" className="text-sm font-medium text-foreground">
                    Auth Kind
                  </label>
                  <p id="model-auth-kind" className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {providerAuthKindsLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">Auth is configured per provider in the left panel.</p>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="model-probe-strategy" className="text-sm font-medium text-foreground">
                    Probe Strategy
                  </label>
                  <select
                    id="model-probe-strategy"
                    value={draft.probe_strategy}
                    onChange={(event) => onDraftChange({ ...draft, probe_strategy: event.currentTarget.value })}
                    className={inputClass}
                  >
                    {PROBE_STRATEGIES.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="model-api-base" className="text-sm font-medium text-foreground">
                  API Base
                </label>
                <input
                  id="model-api-base"
                  value={draft.api_base}
                  onChange={(event) => onDraftChange({ ...draft, api_base: event.currentTarget.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-2 rounded-xl border border-border/70 bg-card/60 p-4 md:grid-cols-3">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.supports_evaluated}
                    onChange={(event) => onDraftChange({ ...draft, supports_evaluated: event.currentTarget.checked })}
                  />
                  Evaluated-compatible
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.supports_judge}
                    onChange={(event) => onDraftChange({ ...draft, supports_judge: event.currentTarget.checked })}
                  />
                  Judge-compatible
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(event) => onDraftChange({ ...draft, enabled: event.currentTarget.checked })}
                  />
                  Enabled
                </label>
              </div>

              <div className="grid gap-2">
                <label htmlFor="model-notes" className="text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  id="model-notes"
                  value={draft.notes}
                  onChange={(event) => onDraftChange({ ...draft, notes: event.currentTarget.value })}
                  className={`${inputClass} min-h-24`}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="border-t border-border/70 pt-4">
            <Button type="button" onClick={() => void onSubmit()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Model'}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </DialogRoot>
  );
}
