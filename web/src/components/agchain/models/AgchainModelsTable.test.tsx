import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { AgchainModelsTable } from './AgchainModelsTable';

describe('AgchainModelsTable', () => {
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

  it('renders provider rows with the expected status badges', () => {
    render(
      <AgchainModelsTable
        providerRows={[
          {
            provider_slug: 'openai',
            display_name: 'OpenAI',
            status: 'configured',
            target_count: 2,
            last_checked_at: '2026-03-26T12:00:00Z',
            credential_anchor_target_id: 'model-1',
            targets: [],
            provider_definition: {
              provider_slug: 'openai',
              display_name: 'OpenAI',
              supports_custom_base_url: true,
              supported_auth_kinds: ['api_key'],
              default_probe_strategy: 'provider_default',
              default_capabilities: {},
              supports_model_args: true,
              notes: null,
            },
          },
          {
            provider_slug: 'bedrock',
            display_name: 'Bedrock',
            status: 'needs_attention',
            target_count: 1,
            last_checked_at: '2026-03-26T12:00:00Z',
            credential_anchor_target_id: null,
            targets: [],
            provider_definition: {
              provider_slug: 'bedrock',
              display_name: 'Bedrock',
              supports_custom_base_url: false,
              supported_auth_kinds: ['connection'],
              default_probe_strategy: 'provider_default',
              default_capabilities: {},
              supports_model_args: true,
              notes: null,
            },
          },
        ]}
        loading={false}
        selectedProviderSlug={null}
        onConfigure={vi.fn()}
      />,
    );

    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bedrock').length).toBeGreaterThan(0);
    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
  });
});
