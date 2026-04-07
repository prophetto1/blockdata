import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainAdminModelsPage from './AgchainAdminModelsPage';
import { resetAgchainAdminRegistryStateForTests } from '@/hooks/agchain/useAgchainAdminRegistry';

const useAuthMock = vi.fn();
const fetchAgchainModelProvidersMock = vi.fn();
const fetchAgchainModelsMock = vi.fn();
const createAgchainProviderDefinitionMock = vi.fn();
const createAgchainModelTargetMock = vi.fn();

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/lib/agchainModels', () => ({
  fetchAgchainModelProviders: (...args: unknown[]) => fetchAgchainModelProvidersMock(...args),
  fetchAgchainModels: (...args: unknown[]) => fetchAgchainModelsMock(...args),
  createAgchainProviderDefinition: (...args: unknown[]) => createAgchainProviderDefinitionMock(...args),
  updateAgchainProviderDefinition: vi.fn(),
  createAgchainModelTarget: (...args: unknown[]) => createAgchainModelTargetMock(...args),
  updateAgchainModelTarget: vi.fn(),
}));

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  resetAgchainAdminRegistryStateForTests();
});

describe('AgchainAdminModelsPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    fetchAgchainModelProvidersMock.mockReset();
    fetchAgchainModelsMock.mockReset();
    createAgchainProviderDefinitionMock.mockReset();
    createAgchainModelTargetMock.mockReset();
    window.sessionStorage.clear();
    resetAgchainAdminRegistryStateForTests();

    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
      profile: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resendSignupConfirmation: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
    });

    fetchAgchainModelProvidersMock.mockResolvedValue([
      {
        provider_slug: 'openai',
        display_name: 'OpenAI',
        provider_category: 'model_provider',
        credential_form_kind: 'basic_api_key',
        env_var_name: 'OPENAI_API_KEY',
        docs_url: 'https://platform.openai.com/docs',
        supported_auth_kinds: ['api_key'],
        default_probe_strategy: 'http_openai_models',
        default_capabilities: { text: true },
        supports_custom_base_url: true,
        supports_model_args: true,
        enabled: true,
        sort_order: 10,
        notes: 'OpenAI provider',
      },
      {
        provider_slug: 'vertex-ai',
        display_name: 'Vertex AI',
        provider_category: 'cloud_provider',
        credential_form_kind: 'vertex_ai',
        env_var_name: 'VERTEX_AI_API_KEY',
        docs_url: 'https://cloud.google.com/vertex-ai',
        supported_auth_kinds: ['access_token', 'credential_json', 'api_key'],
        default_probe_strategy: 'http_google_models',
        default_capabilities: { text: true, multimodal: true },
        supports_custom_base_url: false,
        supports_model_args: true,
        enabled: true,
        sort_order: 30,
        notes: 'Vertex AI provider',
      },
    ]);

    fetchAgchainModelsMock.mockResolvedValue([
      {
        model_target_id: 'model-1',
        label: 'GPT-4.1 Mini',
        provider_slug: 'openai',
        provider_display_name: 'OpenAI',
        provider_qualifier: null,
        model_name: 'gpt-4.1-mini',
        qualified_model: 'openai/gpt-4.1-mini',
        api_base_display: 'https://api.openai.com/v1',
        auth_kind: 'api_key',
        enabled: true,
        supports_evaluated: true,
        supports_judge: false,
        capabilities: { text: true },
        health_status: 'healthy',
        health_checked_at: '2026-04-06T06:00:00Z',
        last_latency_ms: 200,
        probe_strategy: 'provider_default',
        notes: 'Default evaluated model',
        created_at: '2026-04-06T04:00:00Z',
        updated_at: '2026-04-06T05:00:00Z',
      },
      {
        model_target_id: 'model-2',
        label: 'Gemini 1.5 Pro',
        provider_slug: 'vertex-ai',
        provider_display_name: 'Vertex AI',
        provider_qualifier: null,
        model_name: 'gemini-1.5-pro',
        qualified_model: 'vertex-ai/gemini-1.5-pro',
        api_base_display: 'https://generativelanguage.googleapis.com',
        auth_kind: 'access_token',
        enabled: true,
        supports_evaluated: true,
        supports_judge: true,
        capabilities: { text: true, multimodal: true },
        health_status: 'healthy',
        health_checked_at: '2026-04-06T06:10:00Z',
        last_latency_ms: 240,
        probe_strategy: 'provider_default',
        notes: 'Vertex AI model',
        created_at: '2026-04-06T04:10:00Z',
        updated_at: '2026-04-06T05:10:00Z',
      },
    ]);

    createAgchainProviderDefinitionMock.mockResolvedValue({
      ok: true,
      provider_slug: 'anthropic',
    });
    createAgchainModelTargetMock.mockResolvedValue({
      ok: true,
      model_target_id: 'model-3',
    });
  });

  it('renders the platform table surface and supports provider/model creation dialogs', async () => {
    render(
      <MemoryRouter>
        <AgchainAdminModelsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Models' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Provider registry' })).toBeInTheDocument();
    });

    const providerTable = screen.getByRole('table', { name: 'Provider registry' });
    expect(screen.getByRole('table', { name: 'Model targets' })).toBeInTheDocument();
    expect(within(providerTable).getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('GPT-4.1 Mini')).toBeInTheDocument();
    expect(screen.queryByText('Gemini 1.5 Pro')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search providers')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search models')).toBeInTheDocument();
    const providerControls = screen.getByRole('group', { name: 'Provider registry controls' });
    expect(within(providerControls).getByPlaceholderText('Search providers')).toBeInTheDocument();
    expect(within(providerControls).getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(within(providerControls).getByRole('button', { name: 'Add Provider' })).toBeInTheDocument();

    const modelControls = screen.getByRole('group', { name: 'Model targets controls' });
    expect(within(modelControls).getByPlaceholderText('Search models')).toBeInTheDocument();
    expect(within(modelControls).getByRole('button', { name: 'Add Model' })).toBeInTheDocument();

    fireEvent.click(within(providerTable).getByText('vertex-ai'));

    await waitFor(() => {
      expect(screen.getByText('Gemini 1.5 Pro')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add Provider' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Provider Slug'), { target: { value: 'anthropic' } });
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Anthropic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Provider' }));

    await waitFor(() => {
      expect(createAgchainProviderDefinitionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_slug: 'anthropic',
          display_name: 'Anthropic',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Add Provider' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Model' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add Model Target' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Claude 3.7 Sonnet' } });
    fireEvent.change(screen.getByLabelText('Model Name'), { target: { value: 'claude-3-7-sonnet' } });
    fireEvent.change(screen.getByLabelText('Qualified Model'), {
      target: { value: 'anthropic/claude-3-7-sonnet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Model' }));

    await waitFor(() => {
      expect(createAgchainModelTargetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Claude 3.7 Sonnet',
          model_name: 'claude-3-7-sonnet',
          qualified_model: 'anthropic/claude-3-7-sonnet',
        }),
      );
    });
  });

  it('reuses the verified admin registry after a remount in the same session', async () => {
    const firstRender = render(
      <MemoryRouter>
        <AgchainAdminModelsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('GPT-4.1 Mini')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Provider registry' })).getByText('OpenAI')).toBeInTheDocument();
    expect(fetchAgchainModelProvidersMock).toHaveBeenCalledTimes(1);
    expect(fetchAgchainModelsMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    render(
      <MemoryRouter>
        <AgchainAdminModelsPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Loading provider registry...')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading model targets...')).not.toBeInTheDocument();
    expect(screen.getByText('GPT-4.1 Mini')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Provider registry' })).getByText('OpenAI')).toBeInTheDocument();
    expect(fetchAgchainModelProvidersMock).toHaveBeenCalledTimes(1);
    expect(fetchAgchainModelsMock).toHaveBeenCalledTimes(1);
  });

  it('restores selected provider and filters after a remount in the same browser session', async () => {
    const firstRender = render(
      <MemoryRouter>
        <AgchainAdminModelsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('GPT-4.1 Mini')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('table', { name: 'Provider registry' })).getByText('Vertex AI'));
    fireEvent.change(screen.getByPlaceholderText('Search providers'), { target: { value: 'vertex' } });
    fireEvent.change(screen.getByPlaceholderText('Search models'), { target: { value: 'gemini' } });

    expect(screen.getByPlaceholderText('Search providers')).toHaveValue('vertex');
    expect(screen.getByPlaceholderText('Search models')).toHaveValue('gemini');
    expect(screen.getByText('Gemini 1.5 Pro')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Provider registry' })).getByText('Vertex AI')).toBeInTheDocument();

    firstRender.unmount();

    render(
      <MemoryRouter>
        <AgchainAdminModelsPage />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('Search providers')).toHaveValue('vertex');
    expect(screen.getByPlaceholderText('Search models')).toHaveValue('gemini');
    expect(screen.getByText('Gemini 1.5 Pro')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Provider registry' })).getByText('Vertex AI')).toBeInTheDocument();
  });
});
