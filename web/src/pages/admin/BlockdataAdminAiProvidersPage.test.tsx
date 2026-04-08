import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BlockdataAdminAiProvidersPage from './BlockdataAdminAiProvidersPage';
import { resetBlockdataAdminAiProviderRegistryStateForTests } from '@/hooks/blockdata/useBlockdataAdminAiProviderRegistry';

const useAuthMock = vi.fn();
const fetchBlockdataAdminProviderDefinitionsMock = vi.fn();
const fetchBlockdataAdminProviderModelsMock = vi.fn();
const createBlockdataAdminProviderDefinitionMock = vi.fn();
const createBlockdataAdminProviderModelMock = vi.fn();

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/lib/blockdataAdminAiProviders', () => ({
  fetchBlockdataAdminProviderDefinitions: (...args: unknown[]) =>
    fetchBlockdataAdminProviderDefinitionsMock(...args),
  fetchBlockdataAdminProviderModels: (...args: unknown[]) =>
    fetchBlockdataAdminProviderModelsMock(...args),
  createBlockdataAdminProviderDefinition: (...args: unknown[]) =>
    createBlockdataAdminProviderDefinitionMock(...args),
  updateBlockdataAdminProviderDefinition: vi.fn(),
  createBlockdataAdminProviderModel: (...args: unknown[]) =>
    createBlockdataAdminProviderModelMock(...args),
  updateBlockdataAdminProviderModel: vi.fn(),
}));

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

function renderPage(initialEntry = '/app/blockdata-admin/ai-providers') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/app/blockdata-admin/ai-providers" element={<BlockdataAdminAiProvidersPage />} />
        <Route path="/app/blockdata-admin/ai-providers/:providerId" element={<BlockdataAdminAiProvidersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  resetBlockdataAdminAiProviderRegistryStateForTests();
});

describe('BlockdataAdminAiProvidersPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    fetchBlockdataAdminProviderDefinitionsMock.mockReset();
    fetchBlockdataAdminProviderModelsMock.mockReset();
    createBlockdataAdminProviderDefinitionMock.mockReset();
    createBlockdataAdminProviderModelMock.mockReset();
    window.sessionStorage.clear();
    resetBlockdataAdminAiProviderRegistryStateForTests();

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

    fetchBlockdataAdminProviderDefinitionsMock.mockResolvedValue([
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
        provider_slug: 'anthropic',
        display_name: 'Anthropic',
        provider_category: 'model_provider',
        credential_form_kind: 'basic_api_key',
        env_var_name: 'ANTHROPIC_API_KEY',
        docs_url: 'https://docs.anthropic.com',
        supported_auth_kinds: ['api_key'],
        default_probe_strategy: 'http_anthropic_models',
        default_capabilities: { text: true },
        supports_custom_base_url: false,
        supports_model_args: true,
        enabled: true,
        sort_order: 20,
        notes: 'Anthropic provider',
      },
    ]);

    fetchBlockdataAdminProviderModelsMock.mockResolvedValue([
      {
        provider_model_id: 'model-1',
        label: 'GPT-5',
        provider_slug: 'openai',
        provider_display_name: 'OpenAI',
        model_id: 'gpt-5',
        qualified_model: 'openai/gpt-5',
        api_base_display: 'https://api.openai.com/v1',
        auth_kind: 'api_key',
        config_jsonb: { tier: 'default' },
        capabilities_jsonb: { tools: true },
        enabled: true,
        sort_order: 10,
        notes: 'Primary OpenAI model',
        created_at: '2026-04-08T00:00:00Z',
        updated_at: '2026-04-08T00:00:00Z',
      },
      {
        provider_model_id: 'model-2',
        label: 'Claude Sonnet 4.5',
        provider_slug: 'anthropic',
        provider_display_name: 'Anthropic',
        model_id: 'claude-sonnet-4-5-20250929',
        qualified_model: 'anthropic/claude-sonnet-4-5-20250929',
        api_base_display: null,
        auth_kind: 'api_key',
        config_jsonb: {},
        capabilities_jsonb: { tools: true },
        enabled: true,
        sort_order: 20,
        notes: 'Primary Anthropic model',
        created_at: '2026-04-08T00:00:00Z',
        updated_at: '2026-04-08T00:00:00Z',
      },
    ]);

    createBlockdataAdminProviderDefinitionMock.mockResolvedValue({
      ok: true,
      provider_slug: 'cohere',
    });
    createBlockdataAdminProviderModelMock.mockResolvedValue({
      ok: true,
      provider_model_id: 'model-3',
    });
  });

  it('renders the Blockdata admin registry workspace and supports provider and model creation', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'AI Providers' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Provider registry' })).toBeInTheDocument();
    });

    const providerTable = screen.getByRole('table', { name: 'Provider registry' });
    const modelTable = screen.getByRole('table', { name: 'Provider models' });
    expect(within(providerTable).getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText(/registry management/i)).toBeInTheDocument();
    expect(within(modelTable).getByText('GPT-5')).toBeInTheDocument();
    expect(screen.queryByText('Claude Sonnet 4.5')).not.toBeInTheDocument();

    const providerControls = screen.getByRole('group', { name: 'Provider registry controls' });
    expect(within(providerControls).getByPlaceholderText('Search providers')).toBeInTheDocument();
    expect(within(providerControls).getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(within(providerControls).getByRole('button', { name: 'Add Provider' })).toBeInTheDocument();

    const modelControls = screen.getByRole('group', { name: 'Provider models controls' });
    expect(within(modelControls).getByPlaceholderText('Search models')).toBeInTheDocument();
    expect(within(modelControls).getByRole('button', { name: 'Add Model' })).toBeInTheDocument();

    fireEvent.click(within(providerTable).getByText('Anthropic'));

    await waitFor(() => {
      expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add Provider' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Provider Slug'), { target: { value: 'cohere' } });
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Cohere' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Provider' }));

    await waitFor(() => {
      expect(createBlockdataAdminProviderDefinitionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_slug: 'cohere',
          display_name: 'Cohere',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Add Provider' })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Model' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add Provider Model' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Claude Opus 4' } });
    fireEvent.change(screen.getByLabelText('Model ID'), { target: { value: 'claude-opus-4' } });
    fireEvent.change(screen.getByLabelText('Qualified Model'), {
      target: { value: 'anthropic/claude-opus-4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Model' }));

    await waitFor(() => {
      expect(createBlockdataAdminProviderModelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_slug: 'anthropic',
          label: 'Claude Opus 4',
          model_id: 'claude-opus-4',
          qualified_model: 'anthropic/claude-opus-4',
        }),
      );
    });
  });

  it('preselects the provider from the route deep link', async () => {
    renderPage('/app/blockdata-admin/ai-providers/anthropic');

    await waitFor(() => {
      expect(screen.getByText('Claude Sonnet 4.5')).toBeInTheDocument();
    });

    expect(
      within(screen.getByRole('table', { name: 'Provider registry' })).getByText('Anthropic'),
    ).toBeInTheDocument();
    expect(screen.queryByText('GPT-5')).not.toBeInTheDocument();
  });

  it('shows a non-blocking notice and no-selection state for an unknown deep link', async () => {
    renderPage('/app/blockdata-admin/ai-providers/unknown-provider');

    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Provider registry' })).toBeInTheDocument();
    });

    expect(
      screen.getByText('Provider "unknown-provider" is not in the Blockdata admin registry.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Select a provider to see its registered models.')).toBeInTheDocument();
  });
});
