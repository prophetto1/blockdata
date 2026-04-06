import { useEffect, useMemo, useState } from 'react';
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
import {
  createAgchainModelTarget,
  createAgchainProviderDefinition,
  fetchAgchainModels,
  fetchAgchainModelProviders,
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

function createEmptyModelDraft(providers: AgchainProviderDefinition[]): ModelFormDraft {
  const firstProvider = providers[0];
  return {
    label: '',
    provider_slug: firstProvider?.provider_slug ?? '',
    provider_qualifier: '',
    model_name: '',
    qualified_model: '',
    api_base: '',
    auth_kind: firstProvider?.supported_auth_kinds[0] ?? 'api_key',
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

function compatibilityLabel(model: AgchainModelTarget) {
  if (model.supports_evaluated && model.supports_judge) return 'Evaluated, Judge';
  if (model.supports_evaluated) return 'Evaluated';
  if (model.supports_judge) return 'Judge';
  return 'None';
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return '--';
  return new Date(value).toLocaleString();
}

export default function AgchainAdminModelsPage() {
  useShellHeaderTitle({
    title: 'AGChain Admin Models',
    breadcrumbs: ['AGChain Admin', 'Models'],
  });

  const [providers, setProviders] = useState<AgchainProviderDefinition[]>([]);
  const [models, setModels] = useState<AgchainModelTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [providerDialog, setProviderDialog] = useState<ProviderDialogState>({ mode: 'closed' });
  const [modelDialog, setModelDialog] = useState<ModelDialogState>({ mode: 'closed' });
  const [providerDraft, setProviderDraft] = useState<ProviderFormDraft>(createEmptyProviderDraft);
  const [modelDraft, setModelDraft] = useState<ModelFormDraft>(createEmptyModelDraft([]));

  async function loadRegistry() {
    setLoading(true);
    try {
      const [nextProviders, nextModels] = await Promise.all([
        fetchAgchainModelProviders(),
        fetchAgchainModels(),
      ]);
      setProviders(nextProviders);
      setModels(nextModels);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegistry();
  }, []);

  const filteredModels = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return models;
    return models.filter((model) =>
      [model.label, model.provider_display_name, model.model_name, model.qualified_model]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [models, search]);

  function openCreateProviderDialog() {
    setProviderDraft(createEmptyProviderDraft());
    setProviderDialog({ mode: 'create' });
  }

  function openEditProviderDialog(provider: AgchainProviderDefinition) {
    setProviderDraft(buildProviderDraft(provider));
    setProviderDialog({ mode: 'edit', provider });
  }

  function openCreateModelDialog() {
    setModelDraft(createEmptyModelDraft(providers));
    setModelDialog({ mode: 'create' });
  }

  function openEditModelDialog(model: AgchainModelTarget) {
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
      setProviderDialog({ mode: 'closed' });
      await loadRegistry();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
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
      setModelDialog({ mode: 'closed' });
      await loadRegistry();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative h-full">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto mt-6 h-52 w-[86rem] rounded-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_70%)] blur-[88px]" />
      </div>

      <section className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-8">
        <div className="rounded-2xl border border-border/80 bg-card/80 px-6 py-6 shadow-sm backdrop-blur">
          <header className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              AGChain Admin
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Models</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Curate the provider registry and the shared model-target catalog used across AGChain projects. Provider
                  secrets stay on the organization and project provider pages.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-500/90">
                Registry surface (no provider secrets)
              </span>
            </div>
          </header>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        ) : null}

        <section className="rounded-2xl border border-border/70 bg-card/85 px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Provider Registry</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Define the supported providers, form types, and auth capabilities available to AGChain.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadRegistry()}>
                Refresh
              </Button>
              <Button type="button" onClick={openCreateProviderDialog}>
                Add Provider
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="overflow-auto">
              <table className="min-w-full text-left">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Credential Form</th>
                    <th className="px-3 py-2">Auth</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Last Update</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Loading provider registry...
                      </td>
                    </tr>
                  ) : providers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No provider definitions exist yet.
                      </td>
                    </tr>
                  ) : (
                    providers.map((provider) => (
                      <tr key={provider.provider_slug} className="border-t border-border/60 align-top">
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{provider.display_name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{provider.provider_slug}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-foreground">
                          {provider.provider_category === 'cloud_provider' ? 'Cloud provider' : 'Model provider'}
                        </td>
                        <td className="px-3 py-3 text-sm text-foreground">{provider.credential_form_kind}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">
                          {provider.supported_auth_kinds.join(', ')}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <span className={provider.enabled ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'font-medium text-muted-foreground'}>
                            {provider.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{formatTimestamp(provider.updated_at)}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEditProviderDialog(provider)}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/85 px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Model Targets</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Curate the shared model catalog for evaluated and judge-compatible targets.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="admin-model-search">
                Search model targets
              </label>
              <input
                id="admin-model-search"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search models"
                className="h-9 min-w-[220px] rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button type="button" onClick={openCreateModelDialog} disabled={providers.length === 0}>
                Add Model
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="overflow-auto">
              <table className="min-w-full text-left">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Auth</th>
                    <th className="px-3 py-2">Compatibility</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Last Update</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Loading model targets...
                      </td>
                    </tr>
                  ) : filteredModels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No model targets match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredModels.map((model) => (
                      <tr key={model.model_target_id} className="border-t border-border/60 align-top">
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{model.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{model.qualified_model}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-foreground">{model.provider_display_name}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{model.auth_kind}</td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{compatibilityLabel(model)}</td>
                        <td className="px-3 py-3 text-sm">
                          <span className={model.enabled ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'font-medium text-muted-foreground'}>
                            {model.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{formatTimestamp(model.updated_at)}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEditModelDialog(model)}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>

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
    </main>
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
                  <select
                    id="model-auth-kind"
                    value={draft.auth_kind}
                    onChange={(event) => onDraftChange({ ...draft, auth_kind: event.currentTarget.value })}
                    className={inputClass}
                  >
                    {(activeProvider?.supported_auth_kinds ?? ['api_key']).map((authKind) => (
                      <option key={authKind} value={authKind}>
                        {authKind}
                      </option>
                    ))}
                  </select>
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
