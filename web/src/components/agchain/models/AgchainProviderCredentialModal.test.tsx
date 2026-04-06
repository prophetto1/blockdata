import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AgchainProviderCredentialModal } from './AgchainProviderCredentialModal';
import type { AgchainScopedModelProvider } from '@/lib/agchainModelProviderCredentials';

const BASIC_PROVIDER: AgchainScopedModelProvider = {
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
  credential_status: 'set',
  effective_source: 'organization',
  last_updated_at: '2026-04-06T04:00:00Z',
  has_local_override: false,
  credential_config: {},
};

const VERTEX_PROVIDER: AgchainScopedModelProvider = {
  ...BASIC_PROVIDER,
  provider_slug: 'vertex-ai',
  display_name: 'Vertex AI',
  provider_category: 'cloud_provider',
  credential_form_kind: 'vertex_ai',
  env_var_name: 'VERTEX_AI_API_KEY',
  supported_auth_kinds: ['access_token', 'credential_json', 'api_key'],
  default_probe_strategy: 'http_google_models',
  credential_status: 'inherited',
  effective_source: 'organization',
  credential_config: {
    auth_mode: 'credential_json',
    provider_mode: 'standard',
    project: 'demo-project',
    location: 'us-central1',
    supports_streaming: true,
    include_default_registry: true,
    headers: [{ key: '', value: '' }],
    models: [{ value: '' }],
  },
};

describe('AgchainProviderCredentialModal', () => {
  beforeAll(() => {
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    }
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the common API key contract and forwards test/save/remove actions', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onTest = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <AgchainProviderCredentialModal
        open
        onOpenChange={vi.fn()}
        provider={BASIC_PROVIDER}
        scope="organization"
        saving={false}
        testing={false}
        onSubmit={onSubmit}
        onTest={onTest}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Configure API key' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('OPENAI_API_KEY');

    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'sk-test-1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test key' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(onTest).toHaveBeenCalledWith({ api_key: 'sk-test-1234' });
      expect(onSubmit).toHaveBeenCalledWith({ api_key: 'sk-test-1234' });
      expect(onRemove).toHaveBeenCalled();
    });
  });

  it('renders the vertex variant and keeps inherited project rows save-only', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onTest = vi.fn().mockResolvedValue(undefined);

    render(
      <AgchainProviderCredentialModal
        open
        onOpenChange={vi.fn()}
        provider={VERTEX_PROVIDER}
        scope="project"
        saving={false}
        testing={false}
        onSubmit={onSubmit}
        onTest={onTest}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Configure provider' })).toBeInTheDocument();
    expect(screen.getByText('Standard Vertex AI')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Credential JSON' })).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toHaveValue('demo-project');
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Credential JSON' }), {
      target: { value: '{"type":"service_account"}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_mode: 'standard',
          auth_mode: 'credential_json',
          credential_json: '{"type":"service_account"}',
          project: 'demo-project',
          location: 'us-central1',
        }),
      );
    });
  });
});
