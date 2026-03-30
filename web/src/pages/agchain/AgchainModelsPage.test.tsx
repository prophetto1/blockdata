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
const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AgchainModelsPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      loading: false,
    });

    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/agchain/models/providers') {
        return Promise.resolve(
          jsonResponse({
            items: [
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
            ],
          }),
        );
      }

      if (path === '/agchain/models' || path === '/agchain/models?limit=50&offset=0') {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                model_target_id: 'model-target-1',
                label: 'GPT-5.4 Default',
                provider_slug: 'openai',
                provider_display_name: 'OpenAI',
                provider_qualifier: null,
                model_name: 'gpt-5.4',
                qualified_model: 'openai/gpt-5.4',
                api_base_display: 'api.openai.com',
                auth_kind: 'api_key',
                credential_status: 'ready',
                enabled: true,
                supports_evaluated: true,
                supports_judge: true,
                capabilities: { text: true, json: true },
                health_status: 'healthy',
                health_checked_at: '2026-03-26T18:11:00Z',
                last_latency_ms: 380,
                probe_strategy: 'http_openai_models',
                notes: 'Primary evaluated and judge target',
                created_at: '2026-03-25T12:00:00Z',
                updated_at: '2026-03-26T18:11:00Z',
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          }),
        );
      }

      if (path === '/agchain/models/model-target-1') {
        return Promise.resolve(
          jsonResponse({
            model_target: {
              model_target_id: 'model-target-1',
              label: 'GPT-5.4 Default',
              provider_slug: 'openai',
              provider_display_name: 'OpenAI',
              provider_qualifier: null,
              model_name: 'gpt-5.4',
              qualified_model: 'openai/gpt-5.4',
              api_base_display: 'api.openai.com',
              auth_kind: 'api_key',
              credential_status: 'ready',
              enabled: true,
              supports_evaluated: true,
              supports_judge: true,
              capabilities: { text: true, json: true },
              health_status: 'healthy',
              health_checked_at: '2026-03-26T18:11:00Z',
              last_latency_ms: 380,
              probe_strategy: 'http_openai_models',
              notes: 'Primary evaluated and judge target',
              created_at: '2026-03-25T12:00:00Z',
              updated_at: '2026-03-26T18:11:00Z',
            },
            recent_health_checks: [
              {
                health_check_id: 'check-1',
                status: 'healthy',
                checked_at: '2026-03-26T18:11:00Z',
                latency_ms: 380,
                probe_strategy: 'http_openai_models',
                error_message: null,
              },
            ],
            provider_definition: {
              provider_slug: 'openai',
              display_name: 'OpenAI',
              supported_auth_kinds: ['api_key'],
            },
          }),
        );
      }

      if (path === '/agchain/models' && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ ok: true, model_target_id: 'model-target-2' }));
      }

      if (path === '/agchain/models/model-target-1' && init?.method === 'PATCH') {
        return Promise.resolve(jsonResponse({ ok: true, model_target_id: 'model-target-1' }));
      }

      if (path === '/agchain/models/model-target-1/refresh-health') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            health_status: 'healthy',
            latency_ms: 401,
            checked_at: '2026-03-26T18:12:00Z',
            message: 'Probe succeeded',
            probe_strategy: 'http_openai_models',
          }),
        );
      }

      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a project-scoped table-first models surface with provider-backed inspector and create affordances', async () => {
    render(
      <MemoryRouter>
        <AgchainModelsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Models' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this models page/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Label')).toBeInTheDocument();
    });

    const frame = screen.getByTestId('agchain-page-frame');
    expect(frame).toHaveClass('w-full', 'px-4');
    expect(frame.className).not.toContain('max-w-');

    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Qualified Model' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Auth Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Compatibility' })).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Last Checked' })).toBeInTheDocument();
    expect(screen.getByText('GPT-5.4 Default')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open model gpt-5.4 default/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'GPT-5.4 Default' })).toBeInTheDocument();
    });

    expect(screen.getByText('Recent health checks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Model' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Model Target' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add Model Target' })).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Provider')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Provider Slug')).not.toBeInTheDocument();
  });

  it('requests the model list with pagination defaults', async () => {
    render(
      <MemoryRouter>
        <AgchainModelsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('GPT-5.4 Default')).toBeInTheDocument();
    });

    expect(
      platformApiFetchMock.mock.calls.some(([path]) => path === '/agchain/models?limit=50&offset=0'),
    ).toBe(true);
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <AgchainModelsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
