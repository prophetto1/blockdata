import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgchainProviderCredentialsTable } from './AgchainProviderCredentialsTable';
import type { AgchainScopedModelProvider } from '@/lib/agchainModelProviderCredentials';

const BASE_PROVIDER: AgchainScopedModelProvider = {
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
  credential_status: 'not_set',
  effective_source: 'none',
  last_updated_at: null,
  has_local_override: false,
  credential_config: {},
};

describe('AgchainProviderCredentialsTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the locked state-based actions for project rows', () => {
    const onOpenProvider = vi.fn();
    const onRemoveProvider = vi.fn();

    render(
      <AgchainProviderCredentialsTable
        scope="project"
        rows={[
          BASE_PROVIDER,
          {
            ...BASE_PROVIDER,
            provider_slug: 'anthropic',
            display_name: 'Anthropic',
            credential_status: 'set',
            effective_source: 'project',
            last_updated_at: '2026-04-06T06:00:00Z',
          },
          {
            ...BASE_PROVIDER,
            provider_slug: 'vertex-ai',
            display_name: 'Vertex AI',
            provider_category: 'cloud_provider',
            credential_form_kind: 'vertex_ai',
            credential_status: 'inherited',
            effective_source: 'organization',
            last_updated_at: '2026-04-06T07:00:00Z',
          },
        ]}
        loading={false}
        query=""
        onQueryChange={vi.fn()}
        onOpenProvider={onOpenProvider}
        onRemoveProvider={onRemoveProvider}
      />,
    );

    expect(screen.getByText('Model providers')).toBeInTheDocument();
    expect(screen.getByText('Cloud providers')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByText('Set')).toBeInTheDocument();
    expect(screen.getByText('Inherited')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Credential' }));
    expect(onOpenProvider).toHaveBeenCalledWith('openai');

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0]!);
    fireEvent.click(editButtons[1]!);
    expect(onOpenProvider).toHaveBeenNthCalledWith(2, 'anthropic');
    expect(onOpenProvider).toHaveBeenNthCalledWith(3, 'vertex-ai');

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemoveProvider).toHaveBeenCalledWith(
      expect.objectContaining({ provider_slug: 'anthropic' }),
    );
  });

  it('clears the search query from the Clear all control', () => {
    const onQueryChange = vi.fn();

    render(
      <AgchainProviderCredentialsTable
        scope="organization"
        rows={[BASE_PROVIDER]}
        loading={false}
        query="open"
        onQueryChange={onQueryChange}
        onOpenProvider={vi.fn()}
        onRemoveProvider={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Clear all' })[0]!);
    expect(onQueryChange).toHaveBeenCalledWith('');
  });
});
