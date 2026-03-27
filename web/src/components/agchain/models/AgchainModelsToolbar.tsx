import { useEffect, useState } from 'react';
import {
  sanitizeModelTargetWrite,
  type AgchainModelTarget,
  type AgchainModelTargetWrite,
  type AgchainProviderDefinition,
} from '@/lib/agchainModels';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type ModelTargetDraft = {
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

type AgchainModelsToolbarProps = {
  providers: AgchainProviderDefinition[];
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: (payload: AgchainModelTargetWrite) => Promise<unknown>;
  creating: boolean;
  error: string | null;
};

type ModelTargetFormFieldsProps = {
  draft: ModelTargetDraft;
  providers: AgchainProviderDefinition[];
  onChange: (draft: ModelTargetDraft) => void;
  providerLocked?: boolean;
};

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

function getProvider(providers: AgchainProviderDefinition[], providerSlug: string) {
  return providers.find((provider) => provider.provider_slug === providerSlug) ?? null;
}

export function createEmptyModelTargetDraft(providers: AgchainProviderDefinition[]): ModelTargetDraft {
  const firstProvider = providers[0] ?? null;
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

export function buildDraftFromModelTarget(model: AgchainModelTarget): ModelTargetDraft {
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

export function modelTargetDraftToWrite(
  draft: ModelTargetDraft,
  provider: AgchainProviderDefinition | null,
): AgchainModelTargetWrite {
  return sanitizeModelTargetWrite({
    label: draft.label,
    provider_slug: draft.provider_slug,
    provider_qualifier: draft.provider_qualifier,
    model_name: draft.model_name,
    qualified_model: draft.qualified_model,
    api_base: draft.api_base,
    auth_kind: draft.auth_kind,
    credential_source_jsonb: {},
    model_args_jsonb: {},
    supports_evaluated: draft.supports_evaluated,
    supports_judge: draft.supports_judge,
    capabilities_jsonb: provider?.default_capabilities ?? {},
    probe_strategy: draft.probe_strategy,
    notes: draft.notes,
    enabled: draft.enabled,
  });
}

export function ModelTargetFormFields({
  draft,
  providers,
  onChange,
  providerLocked = false,
}: ModelTargetFormFieldsProps) {
  const provider = getProvider(providers, draft.provider_slug);

  function setField<K extends keyof ModelTargetDraft>(key: K, value: ModelTargetDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="model-target-provider">
          Provider
        </label>
        <NativeSelect
          id="model-target-provider"
          value={draft.provider_slug}
          disabled={providerLocked}
          options={providers.map((item) => ({
            value: item.provider_slug,
            label: item.display_name,
          }))}
          onChange={(event) => {
            const nextProvider = getProvider(providers, event.target.value);
            onChange({
              ...draft,
              provider_slug: event.target.value,
              auth_kind: nextProvider?.supported_auth_kinds[0] ?? draft.auth_kind,
              probe_strategy: 'provider_default',
            });
          }}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="model-target-label">
            Label
          </label>
          <input
            id="model-target-label"
            className={inputClass}
            value={draft.label}
            onChange={(event) => setField('label', event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="model-target-auth-kind">
            Auth Kind
          </label>
          <NativeSelect
            id="model-target-auth-kind"
            value={draft.auth_kind}
            options={(provider?.supported_auth_kinds ?? ['api_key']).map((item) => ({
              value: item,
              label: item,
            }))}
            onChange={(event) => setField('auth_kind', event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="model-target-model-name">
            Model Name
          </label>
          <input
            id="model-target-model-name"
            className={inputClass}
            value={draft.model_name}
            disabled={providerLocked}
            onChange={(event) => setField('model_name', event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="model-target-qualified-model">
            Qualified Model
          </label>
          <input
            id="model-target-qualified-model"
            className={inputClass}
            value={draft.qualified_model}
            disabled={providerLocked}
            onChange={(event) => setField('qualified_model', event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="model-target-api-base">
            API Base
          </label>
          <input
            id="model-target-api-base"
            className={inputClass}
            value={draft.api_base}
            placeholder={provider?.supports_custom_base_url ? 'https://endpoint.example/v1' : ''}
            onChange={(event) => setField('api_base', event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="model-target-probe-strategy">
            Probe Strategy
          </label>
          <NativeSelect
            id="model-target-probe-strategy"
            value={draft.probe_strategy}
            options={[
              { value: 'provider_default', label: 'provider_default' },
              { value: 'http_openai_models', label: 'http_openai_models' },
              { value: 'http_anthropic_models', label: 'http_anthropic_models' },
              { value: 'http_google_models', label: 'http_google_models' },
              { value: 'custom_http', label: 'custom_http' },
              { value: 'none', label: 'none' },
            ]}
            onChange={(event) => setField('probe_strategy', event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="model-target-notes">
          Notes
        </label>
        <textarea
          id="model-target-notes"
          className={`${inputClass} min-h-24`}
          value={draft.notes}
          onChange={(event) => setField('notes', event.target.value)}
        />
      </div>

      <div className="grid gap-2 rounded-xl border border-border/70 bg-card/60 p-4 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.supports_evaluated}
            onChange={(event) => setField('supports_evaluated', event.target.checked)}
          />
          Evaluated-compatible
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.supports_judge}
            onChange={(event) => setField('supports_judge', event.target.checked)}
          />
          Judge-compatible
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setField('enabled', event.target.checked)}
          />
          Enabled
        </label>
      </div>
    </div>
  );
}

export function AgchainModelsToolbar({
  providers,
  search,
  onSearchChange,
  onCreate,
  creating,
  error,
}: AgchainModelsToolbarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<ModelTargetDraft>(() => createEmptyModelTargetDraft(providers));

  useEffect(() => {
    if (!createOpen) {
      setDraft(createEmptyModelTargetDraft(providers));
    }
  }, [createOpen, providers]);

  async function handleCreate() {
    const provider = getProvider(providers, draft.provider_slug);
    await onCreate(modelTargetDraftToWrite(draft, provider));
    setCreateOpen(false);
  }

  return (
    <>
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Models</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Global provider-backed model targets supported by AG chain, including auth readiness and
              lightweight health checks.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              aria-label="Search models"
              className={`${inputClass} min-w-72`}
              placeholder="Search label, provider, or qualified model"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <Button type="button" onClick={() => setCreateOpen(true)} disabled={providers.length === 0}>
              Add Model Target
            </Button>
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </section>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Add Model Target</SheetTitle>
            <SheetDescription>
              Create a new provider-backed model target using the supported AG chain provider catalog.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <ModelTargetFormFields draft={draft} providers={providers} onChange={setDraft} />
          </div>
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={
                creating ||
                !draft.provider_slug ||
                !draft.label.trim() ||
                !draft.model_name.trim() ||
                !draft.qualified_model.trim()
              }
            >
              {creating ? 'Creating...' : 'Create Model'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
