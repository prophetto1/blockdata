import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainModelsPage from './AgchainModelsPage';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  }
});

const platformApiFetchMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildTarget(overrides: Record<string, unknown>) {
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
    health_checked_at: '2026-03-26T18:11:00Z',
    last_latency_ms: 380,
    probe_strategy: 'http_openai_models',
    notes: null,
    created_at: '2026-03-25T12:00:00Z',
    updated_at: '2026-03-26T18:11:00Z',
    ...overrides,
  };
}

describe('AgchainModelsPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();

    let openAiCredentialStatus = 'missing';
    let openAiKeySuffix: string | null = null;
    let openAiHealthCheckedAt = '2026-03-26T18:11:00Z';
    const connectCalls: string[] = [];
    const disconnectCalls: string[] = [];
    const refreshCalls: string[] = [];

    const providerItems = [
      {
        provider_slug: 'openai',
        display_name: 'OpenAI',
        supports_custom_base_url: true,
        supported_auth_kinds: ['api_key'],
        default_probe_strategy: 'http_openai_models',
        default_capabilities: { text: true, json: true },
        supports_model_args: true,
        notes: 'OpenAI-compatible provider family',
      },
      {
        provider_slug: 'anthropic',
        display_name: 'Anthropic',
        supports_custom_base_url: false,
        supported_auth_kinds: ['api_key'],
        default_probe_strategy: 'http_anthropic_models',
        default_capabilities: { text: true },
        supports_model_args: true,
        notes: 'Anthropic provider family',
      },
      {
        provider_slug: 'gemini',
        display_name: 'Gemini',
        supports_custom_base_url: false,
        supported_auth_kinds: ['service_account'],
        default_probe_strategy: 'http_google_models',
        default_capabilities: { text: true },
        supports_model_args: true,
        notes: 'Gemini provider family',
      },
    ];

    function buildOpenAiTargets() {
      return [
        buildTarget({
          model_target_id: 'model-target-1',
          label: 'GPT-4.1 Mini',
          model_name: 'gpt-4.1-mini',
          qualified_model: 'openai/gpt-4.1-mini',
          credential_status: openAiCredentialStatus,
          key_suffix: openAiKeySuffix,
          health_checked_at: openAiHealthCheckedAt,
        }),
        buildTarget({
          model_target_id: 'model-target-2',
          label: 'GPT-5.4 Default',
          model_name: 'gpt-5.4',
          qualified_model: 'openai/gpt-5.4',
          credential_status: openAiCredentialStatus,
          key_suffix: openAiKeySuffix,
          health_checked_at: '2026-03-25T11:00:00Z',
        }),
      ];
    }

    function buildAnthropicTargets() {
      return [
        buildTarget({
          model_target_id: 'model-target-3',
          label: 'Claude 3.7 Sonnet',
          provider_slug: 'anthropic',
          provider_display_name: 'Anthropic',
          model_name: 'claude-3-7-sonnet',
          qualified_model: 'anthropic/claude-3-7-sonnet',
          auth_kind: 'api_key',
          credential_status: 'invalid',
          health_status: 'healthy',
          health_checked_at: '2026-03-24T08:00:00Z',
        }),
      ];
    }

    function buildModelList() {
      return [...buildOpenAiTargets(), ...buildAnthropicTargets()];
    }

    function buildModelDetail(modelTargetId: string) {
      const modelTarget = buildModelList().find((item) => item.model_target_id === modelTargetId);
      if (!modelTarget) {
        throw new Error(`Unknown model target: ${modelTargetId}`);
      }
      return {
        model_target: modelTarget,
        recent_health_checks: [
          {
            health_check_id: `check-${modelTargetId}`,
            status: modelTarget.health_status,
            checked_at: modelTarget.health_checked_at,
            latency_ms: modelTarget.last_latency_ms,
            probe_strategy: modelTarget.probe_strategy,
            error_message: null,
          },
        ],
        provider_definition:
          providerItems.find((provider) => provider.provider_slug === modelTarget.provider_slug) ?? null,
      };
    }

    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/agchain/models/providers') {
        return Promise.resolve(jsonResponse({ items: providerItems }));
      }

      if (path === '/agchain/models?limit=50&offset=0') {
        return Promise.resolve(
          jsonResponse({
            items: buildModelList(),
            total: buildModelList().length,
            limit: 50,
            offset: 0,
          }),
        );
      }

      if (path.startsWith('/agchain/models/') && init?.method === undefined) {
        const modelTargetId = path.split('/').at(-1);
        if (!modelTargetId) {
          return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
        }
        return Promise.resolve(jsonResponse(buildModelDetail(modelTargetId)));
      }

      if (path === '/agchain/models/model-target-1/connect-key' && init?.method === 'POST') {
        connectCalls.push(path);
        const body = JSON.parse(String(init.body ?? '{}')) as { api_key?: string };
        openAiKeySuffix = body.api_key?.slice(-4) ?? null;
        openAiCredentialStatus = 'ready';
        return Promise.resolve(jsonResponse({ ok: true, key_suffix: openAiKeySuffix, credential_status: 'ready' }));
      }

      if (path === '/agchain/models/model-target-1/disconnect-key' && init?.method === 'DELETE') {
        disconnectCalls.push(path);
        openAiKeySuffix = null;
        openAiCredentialStatus = 'missing';
        return Promise.resolve(jsonResponse({ ok: true, credential_status: 'missing' }));
      }

      if (path === '/agchain/models/model-target-1/refresh-health' && init?.method === 'POST') {
        refreshCalls.push(path);
        openAiHealthCheckedAt = '2026-03-26T18:12:00Z';
        return Promise.resolve(
          jsonResponse({
            ok: true,
            health_status: 'healthy',
            latency_ms: 401,
            checked_at: openAiHealthCheckedAt,
            message: 'Probe succeeded',
            probe_strategy: 'http_openai_models',
          }),
        );
      }

      if (path === '/agchain/models' && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ ok: true, model_target_id: 'model-target-4' }));
      }

      if (path.startsWith('/agchain/models/') && init?.method === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true, model_target_id: path.split('/')[3] }));
      }

      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
    });

    Object.assign(globalThis, {
      __AGCHAIN_MODELS_TEST_CALLS__: { connectCalls, disconnectCalls, refreshCalls },
    });
  });

  afterEach(() => {
    cleanup();
    delete (globalThis as Record<string, unknown>).__AGCHAIN_MODELS_TEST_CALLS__;
  });

  it('renders a provider-first configuration surface and opens the configure panel', async () => {
    render(
      <MemoryRouter>
        <AgchainModelsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Models' })).toBeInTheDocument();
    expect(
      screen.getByText(/configure provider access and inspect the curated global model targets/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Anthropic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gemini').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Needs attention').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No targets').length).toBeGreaterThan(0);
    expect(screen.queryByText('Registered Model Targets')).not.toBeInTheDocument();
    expect(screen.queryByText('Qualified Model')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Configure OpenAI' }));

    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByRole('heading', { level: 2, name: 'OpenAI' })).toBeInTheDocument();
    expect(
      within(panel).getByText('This credential applies to all targets under this provider for your account.'),
    ).toBeInTheDocument();
    expect(within(panel).getAllByText('GPT-4.1 Mini').length).toBeGreaterThan(0);
    expect(within(panel).getAllByText('GPT-5.4 Default').length).toBeGreaterThan(0);
    expect(within(panel).getByText('Recent health checks')).toBeInTheDocument();
  });

  it('requests the formalized paginated model list contract', async () => {
    render(
      <MemoryRouter>
        <AgchainModelsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
    });

    expect(
      platformApiFetchMock.mock.calls.some(([path]) => path === '/agchain/models?limit=50&offset=0'),
    ).toBe(true);
  });

  it('connects and disconnects a provider-scoped api-key credential through the deterministic anchor target', async () => {
    render(
      <MemoryRouter>
        <AgchainModelsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Configure OpenAI' }));

    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText('Not connected')).toBeInTheDocument();

    fireEvent.change(within(panel).getByPlaceholderText('sk-...'), {
      target: { value: 'sk-live-abc123' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Connect' }));

    await waitFor(() => {
      expect(within(panel).getByText('Connected (••••c123)')).toBeInTheDocument();
    });

    const calls = (globalThis as Record<string, unknown>).__AGCHAIN_MODELS_TEST_CALLS__ as {
      connectCalls: string[];
      disconnectCalls: string[];
      refreshCalls: string[];
    };

    expect(calls.connectCalls).toEqual(['/agchain/models/model-target-1/connect-key']);
    expect(screen.getAllByText('Configured').length).toBeGreaterThan(0);

    fireEvent.click(within(panel).getByRole('button', { name: 'Disconnect' }));

    await waitFor(() => {
      expect(within(panel).getByText('Not connected')).toBeInTheDocument();
    });

    expect(calls.disconnectCalls).toEqual(['/agchain/models/model-target-1/disconnect-key']);
    expect(screen.getAllByText('Not configured').length).toBeGreaterThan(0);
  });
});
