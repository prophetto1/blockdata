import { render, screen, within } from '@testing-library/react';
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

  it('maps backend auth and health statuses to the intended badge colors', () => {
    render(
      <AgchainModelsTable
        items={[
          {
            model_target_id: 'model-1',
            label: 'OpenAI GPT 5',
            provider_slug: 'openai',
            provider_display_name: 'OpenAI',
            provider_qualifier: null,
            model_name: 'gpt-5',
            qualified_model: 'openai/gpt-5',
            api_base_display: 'https://api.openai.com/v1',
            auth_kind: 'api_key',
            credential_status: 'ready',
            enabled: true,
            supports_evaluated: true,
            supports_judge: false,
            capabilities: {},
            health_status: 'error',
            health_checked_at: '2026-03-26T12:00:00Z',
            last_latency_ms: 250,
            probe_strategy: 'provider_default',
            notes: null,
            created_at: '2026-03-26T12:00:00Z',
            updated_at: '2026-03-26T12:00:00Z',
          },
          {
            model_target_id: 'model-2',
            label: 'Bedrock Judge',
            provider_slug: 'bedrock',
            provider_display_name: 'Bedrock',
            provider_qualifier: null,
            model_name: 'claude',
            qualified_model: 'bedrock/claude',
            api_base_display: null,
            auth_kind: 'connection',
            credential_status: 'disconnected',
            enabled: true,
            supports_evaluated: false,
            supports_judge: true,
            capabilities: {},
            health_status: 'healthy',
            health_checked_at: '2026-03-26T12:00:00Z',
            last_latency_ms: 180,
            probe_strategy: 'provider_default',
            notes: null,
            created_at: '2026-03-26T12:00:00Z',
            updated_at: '2026-03-26T12:00:00Z',
          },
        ]}
        loading={false}
        selectedModelId={null}
        onSelect={vi.fn()}
      />,
    );

    const readyBadge = screen.getByText('ready');
    const disconnectedBadge = screen.getByText('disconnected');
    const errorBadge = screen.getByText('error');
    const healthyBadge = screen.getByText('healthy');

    expect(readyBadge.className).toContain('bg-emerald-700');
    expect(disconnectedBadge.className).toContain('bg-amber-700');
    expect(errorBadge.className).toContain('bg-red-700');
    expect(healthyBadge.className).toContain('bg-emerald-700');

    const firstRow = readyBadge.closest('tr');
    expect(firstRow).not.toBeNull();
    expect(within(firstRow as HTMLElement).getByText('OpenAI GPT 5')).toBeInTheDocument();
  });
});
