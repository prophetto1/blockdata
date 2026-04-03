import {
  sanitizeModelTargetWrite,
  type AgchainModelTarget,
  type AgchainModelTargetWrite,
  type AgchainProviderDefinition,
} from '@/lib/agchainModels';

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
