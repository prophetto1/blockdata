import { useMemo } from 'react';
import { Select, createListCollection } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { IconChevronDown } from '@tabler/icons-react';
import { CheckboxRoot, CheckboxControl, CheckboxIndicator, CheckboxLabel, CheckboxHiddenInput } from '@/components/ui/checkbox';
import type { AgchainProviderDefinition } from '@/lib/agchainModels';
import type { ModelTargetDraft } from './modelTargetDraft';

type AgchainModelsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
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

  const providerCollection = useMemo(
    () => createListCollection({
      items: providers.map((item) => ({ value: item.provider_slug, label: item.display_name })),
    }),
    [providers],
  );

  const authKindCollection = useMemo(
    () => createListCollection({
      items: (provider?.supported_auth_kinds ?? ['api_key']).map((item) => ({ value: item, label: item })),
    }),
    [provider],
  );

  const probeStrategyCollection = useMemo(
    () => createListCollection({
      items: [
        { value: 'provider_default', label: 'provider_default' },
        { value: 'http_openai_models', label: 'http_openai_models' },
        { value: 'http_anthropic_models', label: 'http_anthropic_models' },
        { value: 'http_google_models', label: 'http_google_models' },
        { value: 'custom_http', label: 'custom_http' },
        { value: 'none', label: 'none' },
      ],
    }),
    [],
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">
          Provider
        </label>
        <Select.Root
          collection={providerCollection}
          value={[draft.provider_slug]}
          disabled={providerLocked}
          positioning={{ placement: 'bottom-start', sameWidth: true, offset: { mainAxis: 4 } }}
          onValueChange={(details) => {
            const nextSlug = details.value[0];
            if (!nextSlug) return;
            const nextProvider = getProvider(providers, nextSlug);
            onChange({
              ...draft,
              provider_slug: nextSlug,
              auth_kind: nextProvider?.supported_auth_kinds[0] ?? draft.auth_kind,
              probe_strategy: 'provider_default',
            });
          }}
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger className={`${inputClass} flex items-center justify-between`}>
              <Select.ValueText placeholder="Select provider" />
              <Select.Indicator>
                <IconChevronDown size={14} className="shrink-0 text-muted-foreground" />
              </Select.Indicator>
            </Select.Trigger>
          </Select.Control>
          <Portal>
            <Select.Positioner className="z-[200]">
              <Select.Content className="rounded-md border border-border bg-popover p-1 text-sm shadow-md">
                {providerCollection.items.map((item) => (
                  <Select.Item key={item.value} item={item} className="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-accent">
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
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
          <label className="text-sm font-medium text-foreground">
            Auth Kind
          </label>
          <Select.Root
            collection={authKindCollection}
            value={[draft.auth_kind]}
            positioning={{ placement: 'bottom-start', sameWidth: true, offset: { mainAxis: 4 } }}
            onValueChange={(details) => {
              const next = details.value[0];
              if (next) setField('auth_kind', next);
            }}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger className={`${inputClass} flex items-center justify-between`}>
                <Select.ValueText placeholder="Select auth kind" />
                <Select.Indicator>
                  <IconChevronDown size={14} className="shrink-0 text-muted-foreground" />
                </Select.Indicator>
              </Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner className="z-[200]">
                <Select.Content className="rounded-md border border-border bg-popover p-1 text-sm shadow-md">
                  {authKindCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item} className="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-accent">
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
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
          <label className="text-sm font-medium text-foreground">
            Probe Strategy
          </label>
          <Select.Root
            collection={probeStrategyCollection}
            value={[draft.probe_strategy]}
            positioning={{ placement: 'bottom-start', sameWidth: true, offset: { mainAxis: 4 } }}
            onValueChange={(details) => {
              const next = details.value[0];
              if (next) setField('probe_strategy', next);
            }}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger className={`${inputClass} flex items-center justify-between`}>
                <Select.ValueText placeholder="Select strategy" />
                <Select.Indicator>
                  <IconChevronDown size={14} className="shrink-0 text-muted-foreground" />
                </Select.Indicator>
              </Select.Trigger>
            </Select.Control>
            <Portal>
              <Select.Positioner className="z-[200]">
                <Select.Content className="rounded-md border border-border bg-popover p-1 text-sm shadow-md">
                  {probeStrategyCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item} className="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-accent">
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
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
        <CheckboxRoot
          checked={draft.supports_evaluated}
          onCheckedChange={(details) => setField('supports_evaluated', details.checked === true)}
        >
          <CheckboxControl>
            <CheckboxIndicator />
          </CheckboxControl>
          <CheckboxLabel className="text-sm text-foreground">Evaluated-compatible</CheckboxLabel>
          <CheckboxHiddenInput />
        </CheckboxRoot>
        <CheckboxRoot
          checked={draft.supports_judge}
          onCheckedChange={(details) => setField('supports_judge', details.checked === true)}
        >
          <CheckboxControl>
            <CheckboxIndicator />
          </CheckboxControl>
          <CheckboxLabel className="text-sm text-foreground">Judge-compatible</CheckboxLabel>
          <CheckboxHiddenInput />
        </CheckboxRoot>
        <CheckboxRoot
          checked={draft.enabled}
          onCheckedChange={(details) => setField('enabled', details.checked === true)}
        >
          <CheckboxControl>
            <CheckboxIndicator />
          </CheckboxControl>
          <CheckboxLabel className="text-sm text-foreground">Enabled</CheckboxLabel>
          <CheckboxHiddenInput />
        </CheckboxRoot>
      </div>
    </div>
  );
}

export function AgchainModelsToolbar({
  search,
  onSearchChange,
  error,
}: AgchainModelsToolbarProps) {
  return (
    <div className="flex min-w-[20rem] flex-col gap-3">
      <input
        aria-label="Search providers"
        className={inputClass}
        placeholder="Search provider or target"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
