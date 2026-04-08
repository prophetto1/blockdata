import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useBlockdataAdminAiProviderRegistry } from '@/hooks/blockdata/useBlockdataAdminAiProviderRegistry';
import {
  createBlockdataAdminProviderDefinition,
  createBlockdataAdminProviderModel,
  updateBlockdataAdminProviderDefinition,
  updateBlockdataAdminProviderModel,
  type BlockdataAdminProviderDefinition,
  type BlockdataAdminProviderDefinitionWrite,
  type BlockdataAdminProviderModel,
  type BlockdataAdminProviderModelWrite,
} from '@/lib/blockdataAdminAiProviders';
import { SettingsPageFrame } from '@/pages/settings/SettingsPageHeader';

type ProviderDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; provider: BlockdataAdminProviderDefinition };

type ModelDialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; model: BlockdataAdminProviderModel };

type ProviderDraft = {
  provider_slug: string;
  display_name: string;
  provider_category: 'model_provider' | 'cloud_provider';
  credential_form_kind: 'basic_api_key' | 'vertex_ai';
  env_var_name: string;
  docs_url: string;
  supported_auth_kinds_text: string;
  default_probe_strategy: string;
  default_capabilities_text: string;
  supports_custom_base_url: boolean;
  supports_model_args: boolean;
  enabled: boolean;
  sort_order: number;
  notes: string;
};

type ModelDraft = {
  label: string;
  provider_slug: string;
  model_id: string;
  qualified_model: string;
  api_base: string;
  auth_kind: string;
  config_jsonb_text: string;
  capabilities_jsonb_text: string;
  enabled: boolean;
  sort_order: number;
  notes: string;
};

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

const textAreaClass = `${inputClass} min-h-24 font-mono text-xs`;

const buttonClass =
  'inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50';

const BLOCKDATA_ADMIN_AI_PROVIDERS_UI_STATE_KEY = 'blockdata-admin-ai-providers-ui';

function trimToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function safeJsonParse(label: string, raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function createEmptyProviderDraft(): ProviderDraft {
  return {
    provider_slug: '',
    display_name: '',
    provider_category: 'model_provider',
    credential_form_kind: 'basic_api_key',
    env_var_name: '',
    docs_url: '',
    supported_auth_kinds_text: 'api_key',
    default_probe_strategy: 'provider_default',
    default_capabilities_text: '{}',
    supports_custom_base_url: false,
    supports_model_args: true,
    enabled: true,
    sort_order: 100,
    notes: '',
  };
}

function buildProviderDraft(provider: BlockdataAdminProviderDefinition): ProviderDraft {
  return {
    provider_slug: provider.provider_slug,
    display_name: provider.display_name,
    provider_category: provider.provider_category,
    credential_form_kind: provider.credential_form_kind,
    env_var_name: provider.env_var_name ?? '',
    docs_url: provider.docs_url ?? '',
    supported_auth_kinds_text: provider.supported_auth_kinds.join(', '),
    default_probe_strategy: provider.default_probe_strategy,
    default_capabilities_text: JSON.stringify(provider.default_capabilities ?? {}, null, 2),
    supports_custom_base_url: provider.supports_custom_base_url,
    supports_model_args: provider.supports_model_args,
    enabled: provider.enabled,
    sort_order: provider.sort_order,
    notes: provider.notes ?? '',
  };
}

function createEmptyModelDraft(
  providers: BlockdataAdminProviderDefinition[],
  providerSlug?: string,
): ModelDraft {
  const selectedProvider =
    providers.find((provider) => provider.provider_slug === providerSlug) ?? providers[0];
  return {
    label: '',
    provider_slug: selectedProvider?.provider_slug ?? '',
    model_id: '',
    qualified_model: '',
    api_base: '',
    auth_kind: selectedProvider?.supported_auth_kinds[0] ?? 'api_key',
    config_jsonb_text: '{}',
    capabilities_jsonb_text: '{}',
    enabled: true,
    sort_order: 100,
    notes: '',
  };
}

function buildModelDraft(model: BlockdataAdminProviderModel): ModelDraft {
  return {
    label: model.label,
    provider_slug: model.provider_slug,
    model_id: model.model_id,
    qualified_model: model.qualified_model,
    api_base: model.api_base_display ?? '',
    auth_kind: model.auth_kind,
    config_jsonb_text: JSON.stringify(model.config_jsonb ?? {}, null, 2),
    capabilities_jsonb_text: JSON.stringify(model.capabilities_jsonb ?? {}, null, 2),
    enabled: model.enabled,
    sort_order: model.sort_order,
    notes: model.notes ?? '',
  };
}

function toProviderWrite(draft: ProviderDraft): BlockdataAdminProviderDefinitionWrite {
  return {
    provider_slug: draft.provider_slug,
    display_name: draft.display_name,
    provider_category: draft.provider_category,
    credential_form_kind: draft.credential_form_kind,
    env_var_name: trimToNull(draft.env_var_name),
    docs_url: trimToNull(draft.docs_url),
    supported_auth_kinds: draft.supported_auth_kinds_text
      .split(',')
      .map((item) => item.trim())
      .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index),
    default_probe_strategy: draft.default_probe_strategy.trim() || 'provider_default',
    default_capabilities: safeJsonParse('Default capabilities', draft.default_capabilities_text),
    supports_custom_base_url: draft.supports_custom_base_url,
    supports_model_args: draft.supports_model_args,
    enabled: draft.enabled,
    sort_order: Number(draft.sort_order),
    notes: trimToNull(draft.notes),
  };
}

function toModelWrite(draft: ModelDraft): BlockdataAdminProviderModelWrite {
  return {
    label: draft.label,
    provider_slug: draft.provider_slug,
    model_id: draft.model_id,
    qualified_model: draft.qualified_model,
    api_base: trimToNull(draft.api_base),
    auth_kind: draft.auth_kind.trim(),
    config_jsonb: safeJsonParse('Model config', draft.config_jsonb_text),
    capabilities_jsonb: safeJsonParse('Model capabilities', draft.capabilities_jsonb_text),
    enabled: draft.enabled,
    sort_order: Number(draft.sort_order),
    notes: trimToNull(draft.notes),
  };
}

function readUiState() {
  if (typeof window === 'undefined') {
    return {
      providerSearch: '',
      modelSearch: '',
      selectedProviderSlug: '',
    };
  }

  try {
    const raw = window.sessionStorage.getItem(BLOCKDATA_ADMIN_AI_PROVIDERS_UI_STATE_KEY);
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

function persistUiState(nextState: {
  providerSearch: string;
  modelSearch: string;
  selectedProviderSlug: string;
}) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(BLOCKDATA_ADMIN_AI_PROVIDERS_UI_STATE_KEY, JSON.stringify(nextState));
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
}

function categoryLabel(category: 'model_provider' | 'cloud_provider') {
  return category === 'cloud_provider' ? 'Cloud provider' : 'Model provider';
}

function enabledBadge(enabled: boolean) {
  return enabled ? 'Enabled' : 'Disabled';
}

function ProviderDialog({
  state,
  draft,
  onClose,
  onChange,
  onSubmit,
  saving,
}: {
  state: ProviderDialogState;
  draft: ProviderDraft;
  onClose: () => void;
  onChange: (next: ProviderDraft) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  if (state.mode === 'closed') return null;
  const isEdit = state.mode === 'edit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{isEdit ? 'Edit Provider' : 'Add Provider'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage provider metadata, auth capabilities, and registry behavior.
            </p>
          </div>
          <button type="button" className={buttonClass} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Provider Slug</span>
            <input
              className={inputClass}
              value={draft.provider_slug}
              disabled={isEdit}
              onChange={(event) => onChange({ ...draft, provider_slug: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Display Name</span>
            <input
              className={inputClass}
              value={draft.display_name}
              onChange={(event) => onChange({ ...draft, display_name: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Provider Category</span>
            <select
              className={inputClass}
              value={draft.provider_category}
              onChange={(event) =>
                onChange({
                  ...draft,
                  provider_category: event.currentTarget.value as ProviderDraft['provider_category'],
                })
              }
            >
              <option value="model_provider">Model provider</option>
              <option value="cloud_provider">Cloud provider</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Credential Form</span>
            <select
              className={inputClass}
              value={draft.credential_form_kind}
              onChange={(event) =>
                onChange({
                  ...draft,
                  credential_form_kind: event.currentTarget.value as ProviderDraft['credential_form_kind'],
                })
              }
            >
              <option value="basic_api_key">Basic API key</option>
              <option value="vertex_ai">Vertex AI</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Env Var Name</span>
            <input
              className={inputClass}
              value={draft.env_var_name}
              onChange={(event) => onChange({ ...draft, env_var_name: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Docs URL</span>
            <input
              className={inputClass}
              value={draft.docs_url}
              onChange={(event) => onChange({ ...draft, docs_url: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Supported Auth Kinds</span>
            <input
              className={inputClass}
              value={draft.supported_auth_kinds_text}
              onChange={(event) => onChange({ ...draft, supported_auth_kinds_text: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Default Probe Strategy</span>
            <input
              className={inputClass}
              value={draft.default_probe_strategy}
              onChange={(event) => onChange({ ...draft, default_probe_strategy: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Default Capabilities JSON</span>
            <textarea
              className={textAreaClass}
              value={draft.default_capabilities_text}
              onChange={(event) => onChange({ ...draft, default_capabilities_text: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Sort Order</span>
            <input
              type="number"
              className={inputClass}
              value={draft.sort_order}
              onChange={(event) => onChange({ ...draft, sort_order: Number(event.currentTarget.value) })}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Notes</span>
            <textarea
              className={textAreaClass}
              value={draft.notes}
              onChange={(event) => onChange({ ...draft, notes: event.currentTarget.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.supports_custom_base_url}
              onChange={(event) => onChange({ ...draft, supports_custom_base_url: event.currentTarget.checked })}
            />
            Supports custom base URL
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.supports_model_args}
              onChange={(event) => onChange({ ...draft, supports_model_args: event.currentTarget.checked })}
            />
            Supports model args
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => onChange({ ...draft, enabled: event.currentTarget.checked })}
            />
            Enabled
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <button type="button" className={buttonClass} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} disabled={saving} onClick={onSubmit}>
            {saving ? 'Saving...' : 'Save Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelDialog({
  state,
  draft,
  providers,
  onClose,
  onChange,
  onSubmit,
  saving,
}: {
  state: ModelDialogState;
  draft: ModelDraft;
  providers: BlockdataAdminProviderDefinition[];
  onClose: () => void;
  onChange: (next: ModelDraft) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  if (state.mode === 'closed') return null;
  const isEdit = state.mode === 'edit';
  const currentProvider = providers.find((provider) => provider.provider_slug === draft.provider_slug) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{isEdit ? 'Edit Provider Model' : 'Add Provider Model'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curate the provider-scoped model catalog used by Blockdata admin surfaces.
            </p>
          </div>
          <button type="button" className={buttonClass} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Label</span>
            <input
              className={inputClass}
              value={draft.label}
              onChange={(event) => onChange({ ...draft, label: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Provider</span>
            <select
              className={inputClass}
              value={draft.provider_slug}
              onChange={(event) => {
                const nextProviderSlug = event.currentTarget.value;
                const nextProvider = providers.find((provider) => provider.provider_slug === nextProviderSlug);
                onChange({
                  ...draft,
                  provider_slug: nextProviderSlug,
                  auth_kind:
                    nextProvider?.supported_auth_kinds.includes(draft.auth_kind)
                      ? draft.auth_kind
                      : nextProvider?.supported_auth_kinds[0] ?? draft.auth_kind,
                });
              }}
            >
              {providers.map((provider) => (
                <option key={provider.provider_slug} value={provider.provider_slug}>
                  {provider.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Model ID</span>
            <input
              className={inputClass}
              value={draft.model_id}
              onChange={(event) => onChange({ ...draft, model_id: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Qualified Model</span>
            <input
              className={inputClass}
              value={draft.qualified_model}
              onChange={(event) => onChange({ ...draft, qualified_model: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>API Base</span>
            <input
              className={inputClass}
              value={draft.api_base}
              onChange={(event) => onChange({ ...draft, api_base: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Auth Kind</span>
            <select
              className={inputClass}
              value={draft.auth_kind}
              onChange={(event) => onChange({ ...draft, auth_kind: event.currentTarget.value })}
            >
              {(currentProvider?.supported_auth_kinds ?? ['api_key']).map((authKind) => (
                <option key={authKind} value={authKind}>
                  {authKind}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Model Config JSON</span>
            <textarea
              className={textAreaClass}
              value={draft.config_jsonb_text}
              onChange={(event) => onChange({ ...draft, config_jsonb_text: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Capabilities JSON</span>
            <textarea
              className={textAreaClass}
              value={draft.capabilities_jsonb_text}
              onChange={(event) => onChange({ ...draft, capabilities_jsonb_text: event.currentTarget.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Sort Order</span>
            <input
              type="number"
              className={inputClass}
              value={draft.sort_order}
              onChange={(event) => onChange({ ...draft, sort_order: Number(event.currentTarget.value) })}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Notes</span>
            <textarea
              className={textAreaClass}
              value={draft.notes}
              onChange={(event) => onChange({ ...draft, notes: event.currentTarget.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => onChange({ ...draft, enabled: event.currentTarget.checked })}
            />
            Enabled
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <button type="button" className={buttonClass} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} disabled={saving} onClick={onSubmit}>
            {saving ? 'Saving...' : 'Save Model'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BlockdataAdminAiProvidersPage() {
  const { providerId } = useParams<{ providerId?: string }>();

  useShellHeaderTitle({
    title: 'AI Providers',
    breadcrumbs: ['Blockdata Admin', 'AI Providers'],
  });

  const {
    providers: cachedProviders,
    models: cachedModels,
    status,
    error: loadError,
    refresh,
  } = useBlockdataAdminAiProviderRegistry();
  const [providerSearch, setProviderSearch] = useState(() => readUiState().providerSearch);
  const [modelSearch, setModelSearch] = useState(() => readUiState().modelSearch);
  const [selectedProviderSlug, setSelectedProviderSlug] = useState(() => readUiState().selectedProviderSlug);
  const [message, setMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [providerDialog, setProviderDialog] = useState<ProviderDialogState>({ mode: 'closed' });
  const [modelDialog, setModelDialog] = useState<ModelDialogState>({ mode: 'closed' });
  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(createEmptyProviderDraft);
  const [modelDraft, setModelDraft] = useState<ModelDraft>(createEmptyModelDraft([]));

  const providers = cachedProviders ?? [];
  const models = cachedModels ?? [];
  const loading = status === 'loading' && cachedProviders === null && cachedModels === null;
  const error = mutationError ?? loadError;

  useEffect(() => {
    persistUiState({
      providerSearch,
      modelSearch,
      selectedProviderSlug,
    });
  }, [modelSearch, providerSearch, selectedProviderSlug]);

  useEffect(() => {
    if (providerId) {
      if (providers.some((provider) => provider.provider_slug === providerId)) {
        setSelectedProviderSlug(providerId);
        return;
      }
      if (!loading) {
        setSelectedProviderSlug('');
      }
      return;
    }

    if (!selectedProviderSlug && providers.length > 0) {
      setSelectedProviderSlug(providers[0].provider_slug);
    }
  }, [loading, providerId, providers]);

  const invalidProviderFromRoute = useMemo(() => {
    if (!providerId || loading) return null;
    return providers.some((provider) => provider.provider_slug === providerId) ? null : providerId;
  }, [loading, providerId, providers]);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.provider_slug === selectedProviderSlug) ?? null,
    [providers, selectedProviderSlug],
  );

  const filteredProviders = useMemo(() => {
    if (!providerSearch.trim()) return providers;
    const needle = providerSearch.trim().toLowerCase();
    return providers.filter((provider) =>
      `${provider.display_name} ${provider.provider_slug} ${provider.credential_form_kind} ${provider.supported_auth_kinds.join(' ')} ${categoryLabel(provider.provider_category)}`
        .toLowerCase()
        .includes(needle),
    );
  }, [providerSearch, providers]);

  const filteredModels = useMemo(() => {
    const scopedModels = selectedProvider
      ? models.filter((model) => model.provider_slug === selectedProvider.provider_slug)
      : [];
    if (!modelSearch.trim()) return scopedModels;
    const needle = modelSearch.trim().toLowerCase();
    return scopedModels.filter((model) =>
      `${model.label} ${model.model_id} ${model.qualified_model} ${model.auth_kind}`
        .toLowerCase()
        .includes(needle),
    );
  }, [modelSearch, models, selectedProvider]);

  const providerEmptyMessage = loading
    ? 'Loading provider registry...'
    : providerSearch.trim()
      ? 'No provider matches this filter.'
      : 'No providers have been configured yet.';

  const modelEmptyMessage = !selectedProvider
    ? 'Select a provider to see its registered models.'
    : loading
      ? 'Loading provider models...'
      : modelSearch.trim()
        ? 'No provider models match the current filter.'
        : 'No provider models for this provider yet.';

  function openCreateProviderDialog() {
    setMutationError(null);
    setProviderDraft(createEmptyProviderDraft());
    setProviderDialog({ mode: 'create' });
  }

  function openEditProviderDialog(provider: BlockdataAdminProviderDefinition) {
    setMutationError(null);
    setProviderDraft(buildProviderDraft(provider));
    setProviderDialog({ mode: 'edit', provider });
  }

  function closeProviderDialog() {
    setProviderDialog({ mode: 'closed' });
  }

  function openCreateModelDialog() {
    setMutationError(null);
    setModelDraft(createEmptyModelDraft(providers, selectedProvider?.provider_slug));
    setModelDialog({ mode: 'create' });
  }

  function openEditModelDialog(model: BlockdataAdminProviderModel) {
    setMutationError(null);
    setModelDraft(buildModelDraft(model));
    setModelDialog({ mode: 'edit', model });
  }

  function closeModelDialog() {
    setModelDialog({ mode: 'closed' });
  }

  async function submitProviderDialog() {
    try {
      setSaving(true);
      setMutationError(null);
      const payload = toProviderWrite(providerDraft);
      if (providerDialog.mode === 'edit') {
        await updateBlockdataAdminProviderDefinition(providerDialog.provider.provider_slug, payload);
        setMessage(`Updated provider ${payload.display_name}.`);
      } else {
        await createBlockdataAdminProviderDefinition(payload);
        setMessage(`Added provider ${payload.display_name}.`);
      }
      closeProviderDialog();
      await refresh();
    } catch (nextError) {
      setMutationError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function submitModelDialog() {
    try {
      setSaving(true);
      setMutationError(null);
      const payload = toModelWrite(modelDraft);
      if (modelDialog.mode === 'edit') {
        await updateBlockdataAdminProviderModel(modelDialog.model.provider_model_id, payload);
        setMessage(`Updated model ${payload.label}.`);
      } else {
        await createBlockdataAdminProviderModel(payload);
        setSelectedProviderSlug(payload.provider_slug);
        setMessage(`Added model ${payload.label}.`);
      }
      closeModelDialog();
      await refresh();
    } catch (nextError) {
      setMutationError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SettingsPageFrame
        title="AI Providers"
        description="Registry management for Blockdata provider definitions and the curated provider-model catalog. This page does not manage personal API keys."
        headerVariant="admin"
        bodyClassName="min-h-0 overflow-hidden p-0 md:p-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          {message ? (
            <div className="border-b border-border bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="border-b border-border bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          ) : null}
          {invalidProviderFromRoute ? (
            <div className="border-b border-border bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {`Provider "${invalidProviderFromRoute}" is not in the Blockdata admin registry.`}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(300px,0.95fr)_minmax(0,1.45fr)]">
            <section className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
              <div
                role="group"
                aria-label="Provider registry controls"
                className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2"
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Search providers</span>
                  <input
                    value={providerSearch}
                    onChange={(event) => setProviderSearch(event.currentTarget.value)}
                    placeholder="Search providers"
                    className={inputClass}
                  />
                </label>
                <button type="button" className={buttonClass} onClick={() => void refresh()}>
                  Refresh
                </button>
                <button type="button" className={buttonClass} onClick={openCreateProviderDialog}>
                  Add Provider
                </button>
              </div>

              <div className="min-h-0 overflow-auto">
                <table className="w-full text-left" aria-label="Provider registry">
                  <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 font-medium">Provider</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProviders.length > 0 ? (
                      filteredProviders.map((provider) => {
                        const isSelected = provider.provider_slug === selectedProvider?.provider_slug;
                        return (
                          <tr
                            key={provider.provider_slug}
                            className={`cursor-pointer border-b border-border/70 ${isSelected ? 'bg-accent/60' : 'hover:bg-muted/40'}`}
                            onClick={() => setSelectedProviderSlug(provider.provider_slug)}
                          >
                            <td className="px-3 py-3 align-top">
                              <div className="font-medium text-foreground">{provider.display_name}</div>
                              <div className="text-xs text-muted-foreground">{provider.provider_slug}</div>
                            </td>
                            <td className="px-3 py-3 align-top text-sm text-muted-foreground">
                              {categoryLabel(provider.provider_category)}
                            </td>
                            <td className="px-3 py-3 align-top text-sm text-muted-foreground">
                              {enabledBadge(provider.enabled)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-sm text-muted-foreground">
                          {providerEmptyMessage}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex min-h-0 flex-col">
              <div className="border-b border-border px-4 py-4">
                {selectedProvider ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{selectedProvider.display_name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{selectedProvider.provider_slug}</p>
                      </div>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => openEditProviderDialog(selectedProvider)}
                      >
                        Edit Provider
                      </button>
                    </div>
                    <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <div className="font-medium text-foreground">Category</div>
                        <div>{categoryLabel(selectedProvider.provider_category)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Credential Form</div>
                        <div>{selectedProvider.credential_form_kind}</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Status</div>
                        <div>{enabledBadge(selectedProvider.enabled)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Auth Kinds</div>
                        <div>{selectedProvider.supported_auth_kinds.join(', ')}</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Sort Order</div>
                        <div>{selectedProvider.sort_order}</div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Updated</div>
                        <div>{formatTimestamp(selectedProvider.updated_at)}</div>
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">Notes</div>
                      <div className="mt-1 whitespace-pre-wrap">{selectedProvider.notes || 'No notes yet.'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Select a provider to review its registry details and curated provider models.
                  </div>
                )}
              </div>

              <div
                role="group"
                aria-label="Provider models controls"
                className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2"
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Search models</span>
                  <input
                    value={modelSearch}
                    onChange={(event) => setModelSearch(event.currentTarget.value)}
                    placeholder="Search models"
                    disabled={!selectedProvider}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  />
                </label>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={!selectedProvider}
                  onClick={openCreateModelDialog}
                >
                  Add Model
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-left" aria-label="Provider models">
                  <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Qualified Model</th>
                      <th className="px-3 py-2 font-medium">Auth</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.length > 0 ? (
                      filteredModels.map((model) => (
                        <tr key={model.provider_model_id} className="border-b border-border/70">
                          <td className="px-3 py-3 align-top">
                            <div className="font-medium text-foreground">{model.label}</div>
                            <div className="text-xs text-muted-foreground">{model.model_id}</div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-muted-foreground">{model.qualified_model}</td>
                          <td className="px-3 py-3 align-top text-sm text-muted-foreground">{model.auth_kind}</td>
                          <td className="px-3 py-3 align-top text-sm text-muted-foreground">{enabledBadge(model.enabled)}</td>
                          <td className="px-3 py-3 align-top">
                            <button
                              type="button"
                              className={buttonClass}
                              onClick={() => openEditModelDialog(model)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-sm text-muted-foreground">
                          {modelEmptyMessage}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </SettingsPageFrame>

      <ProviderDialog
        state={providerDialog}
        draft={providerDraft}
        onClose={closeProviderDialog}
        onChange={setProviderDraft}
        onSubmit={() => void submitProviderDialog()}
        saving={saving}
      />
      <ModelDialog
        state={modelDialog}
        draft={modelDraft}
        providers={providers}
        onClose={closeModelDialog}
        onChange={setModelDraft}
        onSubmit={() => void submitModelDialog()}
        saving={saving}
      />
    </>
  );
}
