import { describe, expect, it } from 'vitest';
import type { AgchainModelTarget, AgchainProviderDefinition } from './agchainModels';
import { deriveAgchainProviderRows } from './agchainModelProviders';

function buildProvider(overrides: Partial<AgchainProviderDefinition> = {}): AgchainProviderDefinition {
  return {
    provider_slug: 'openai',
    display_name: 'OpenAI',
    supports_custom_base_url: true,
    supported_auth_kinds: ['api_key'],
    default_probe_strategy: 'http_openai_models',
    default_capabilities: { text: true, json: true },
    supports_model_args: true,
    notes: null,
    ...overrides,
  };
}

function buildTarget(overrides: Partial<AgchainModelTarget> = {}): AgchainModelTarget {
  return {
    model_target_id: 'model-target-1',
    label: 'GPT-4.1 Mini',
    provider_slug: 'openai',
    provider_display_name: 'OpenAI',
    provider_qualifier: null,
    model_name: 'gpt-4.1-mini',
    qualified_model: 'openai/gpt-4.1-mini',
    api_base_display: 'api.openai.com',
    auth_kind: 'api_key',
    credential_status: 'missing',
    key_suffix: null,
    enabled: true,
    supports_evaluated: true,
    supports_judge: true,
    capabilities: { text: true, json: true },
    health_status: 'healthy',
    health_checked_at: null,
    last_latency_ms: null,
    probe_strategy: 'provider_default',
    notes: null,
    created_at: '2026-03-25T12:00:00Z',
    updated_at: '2026-03-25T12:00:00Z',
    ...overrides,
  };
}

describe('deriveAgchainProviderRows', () => {
  it('marks providers with zero targets as no_targets', () => {
    const rows = deriveAgchainProviderRows([buildProvider()], []);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider_slug: 'openai',
      status: 'no_targets',
      target_count: 0,
      last_checked_at: null,
      credential_anchor_target_id: null,
    });
  });

  it('marks healthy targets with only missing credentials as not_configured', () => {
    const rows = deriveAgchainProviderRows([buildProvider()], [buildTarget()]);

    expect(rows[0].status).toBe('not_configured');
  });

  it('marks providers needing attention when any credential is invalid or disconnected', () => {
    const rows = deriveAgchainProviderRows([buildProvider()], [
      buildTarget({ model_target_id: 'model-target-1', credential_status: 'ready' }),
      buildTarget({ model_target_id: 'model-target-2', label: 'GPT-5.4 Default', credential_status: 'invalid' }),
    ]);

    expect(rows[0].status).toBe('needs_attention');
  });

  it('marks providers needing attention when any target health is degraded or error', () => {
    const rows = deriveAgchainProviderRows([buildProvider()], [
      buildTarget({ model_target_id: 'model-target-1', credential_status: 'ready', health_status: 'healthy' }),
      buildTarget({ model_target_id: 'model-target-2', label: 'GPT-5.4 Default', credential_status: 'ready', health_status: 'degraded' }),
    ]);

    expect(rows[0].status).toBe('needs_attention');
  });

  it('marks providers configured when one target is ready and another is missing, and uses the latest check time', () => {
    const rows = deriveAgchainProviderRows([buildProvider()], [
      buildTarget({
        model_target_id: 'model-target-1',
        credential_status: 'ready',
        health_checked_at: '2026-03-26T10:00:00Z',
      }),
      buildTarget({
        model_target_id: 'model-target-2',
        label: 'GPT-5.4 Default',
        credential_status: 'missing',
        health_checked_at: '2026-03-26T12:00:00Z',
      }),
    ]);

    expect(rows[0].status).toBe('configured');
    expect(rows[0].last_checked_at).toBe('2026-03-26T12:00:00Z');
  });

  it('returns a null credential anchor when no enabled api_key target exists', () => {
    const rows = deriveAgchainProviderRows(
      [buildProvider({ supported_auth_kinds: ['service_account'] })],
      [
        buildTarget({
          auth_kind: 'service_account',
          credential_status: 'not_required',
        }),
        buildTarget({
          model_target_id: 'model-target-2',
          label: 'Disabled API key target',
          auth_kind: 'api_key',
          enabled: false,
        }),
      ],
    );

    expect(rows[0].credential_anchor_target_id).toBeNull();
  });

  it('chooses the credential anchor deterministically by label then model_target_id', () => {
    const rows = deriveAgchainProviderRows([buildProvider()], [
      buildTarget({ model_target_id: 'model-target-4', label: 'Zeta Target' }),
      buildTarget({ model_target_id: 'model-target-2', label: 'Alpha Target' }),
      buildTarget({ model_target_id: 'model-target-1', label: 'Alpha Target' }),
    ]);

    expect(rows[0].credential_anchor_target_id).toBe('model-target-1');
    expect(rows[0].targets.map((target) => target.model_target_id)).toEqual([
      'model-target-1',
      'model-target-2',
      'model-target-4',
    ]);
  });
});
