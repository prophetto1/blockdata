import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainAdminModelsPage from './AgchainAdminModelsPage';

const fetchAgchainModelProvidersMock = vi.fn();
const fetchAgchainModelsMock = vi.fn();
const createAgchainProviderDefinitionMock = vi.fn();
const createAgchainModelTargetMock = vi.fn();

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
});

describe('AgchainAdminModelsPage', () => {
  beforeEach(() => {
    fetchAgchainModelProvidersMock.mockReset();
    fetchAgchainModelsMock.mockReset();
    createAgchainProviderDefinitionMock.mockReset();
    createAgchainModelTargetMock.mockReset();

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
    ]);

    createAgchainProviderDefinitionMock.mockResolvedValue({
      ok: true,
      provider_slug: 'anthropic',
    });
    createAgchainModelTargetMock.mockResolvedValue({
      ok: true,
      model_target_id: 'model-2',
    });
  });

  it('renders the working admin registry surface and supports provider/model creation dialogs', async () => {
    render(
      <MemoryRouter>
        <AgchainAdminModelsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Models' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Provider Registry' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Model Targets' })).toBeInTheDocument();
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vertex AI').length).toBeGreaterThan(0);
    expect(screen.getByText('GPT-4.1 Mini')).toBeInTheDocument();

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
});
