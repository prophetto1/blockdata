import type { AgchainModelTarget, AgchainProviderDefinition } from './agchainModels';

export type AgchainProviderRowStatus =
  | 'configured'
  | 'needs_attention'
  | 'not_configured'
  | 'no_targets';

export type AgchainProviderRow = {
  provider_slug: string;
  display_name: string;
  status: AgchainProviderRowStatus;
  target_count: number;
  last_checked_at: string | null;
  credential_anchor_target_id: string | null;
  targets: AgchainModelTarget[];
  provider_definition: AgchainProviderDefinition;
};

function compareTargets(a: AgchainModelTarget, b: AgchainModelTarget) {
  return a.label.localeCompare(b.label) || a.model_target_id.localeCompare(b.model_target_id);
}

function uniqueAuthKinds(targets: AgchainModelTarget[]) {
  return [...new Set(targets.map((target) => target.auth_kind).filter(Boolean))];
}

function buildFallbackProviderDefinition(
  providerSlug: string,
  targets: AgchainModelTarget[],
): AgchainProviderDefinition {
  return {
    provider_slug: providerSlug,
    display_name: targets[0]?.provider_display_name ?? providerSlug,
    supports_custom_base_url: targets.some((target) => Boolean(target.api_base_display)),
    supported_auth_kinds: uniqueAuthKinds(targets),
    default_probe_strategy: targets[0]?.probe_strategy ?? 'provider_default',
    default_capabilities: {},
    supports_model_args: true,
    notes: null,
  };
}

export function deriveProviderStatus(targets: AgchainModelTarget[]): AgchainProviderRowStatus {
  if (targets.length === 0) {
    return 'no_targets';
  }

  const needsAttention = targets.some(
    (target) =>
      target.credential_status === 'invalid' ||
      target.credential_status === 'disconnected' ||
      target.health_status === 'error' ||
      target.health_status === 'degraded',
  );
  if (needsAttention) {
    return 'needs_attention';
  }

  const configured = targets.some(
    (target) => target.credential_status === 'ready' || target.credential_status === 'not_required',
  );
  if (configured) {
    return 'configured';
  }

  return 'not_configured';
}

export function deriveProviderLastChecked(targets: AgchainModelTarget[]): string | null {
  return targets
    .map((target) => target.health_checked_at)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort()
    .at(-1) ?? null;
}

export function getCredentialAnchorTargetId(targets: AgchainModelTarget[]): string | null {
  return [...targets]
    .filter((target) => target.enabled && target.auth_kind === 'api_key')
    .sort(compareTargets)[0]?.model_target_id ?? null;
}

export function deriveAgchainProviderRows(
  providers: AgchainProviderDefinition[],
  targets: AgchainModelTarget[],
): AgchainProviderRow[] {
  const targetsByProvider = new Map<string, AgchainModelTarget[]>();
  for (const target of targets) {
    const bucket = targetsByProvider.get(target.provider_slug);
    if (bucket) {
      bucket.push(target);
    } else {
      targetsByProvider.set(target.provider_slug, [target]);
    }
  }

  const providerOrder = [
    ...providers.map((provider) => provider.provider_slug),
    ...[...targetsByProvider.keys()].filter(
      (providerSlug) => !providers.some((provider) => provider.provider_slug === providerSlug),
    ),
  ];

  return providerOrder.map((providerSlug) => {
    const providerTargets = [...(targetsByProvider.get(providerSlug) ?? [])].sort(compareTargets);
    const providerDefinition =
      providers.find((provider) => provider.provider_slug === providerSlug) ??
      buildFallbackProviderDefinition(providerSlug, providerTargets);

    return {
      provider_slug: providerSlug,
      display_name: providerDefinition.display_name,
      status: deriveProviderStatus(providerTargets),
      target_count: providerTargets.length,
      last_checked_at: deriveProviderLastChecked(providerTargets),
      credential_anchor_target_id: getCredentialAnchorTargetId(providerTargets),
      targets: providerTargets,
      provider_definition: providerDefinition,
    };
  });
}
